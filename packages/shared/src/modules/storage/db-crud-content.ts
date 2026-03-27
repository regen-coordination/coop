import * as Y from 'yjs';
import type {
  CoopSharedState,
  ReadablePageExtract,
  ReviewDraft,
  TabCandidate,
} from '../../contracts/schema';
import {
  readablePageExtractSchema,
  reviewDraftSchema,
  tabCandidateSchema,
} from '../../contracts/schema';
import { nowIso } from '../../utils';
import { arePageExtractsNearDuplicates } from '../coop/pipeline';
import { encodeCoopDoc, hydrateCoopDoc, readCoopState, writeCoopState } from '../coop/sync';
import {
  buildEncryptedLocalPayloadId,
  buildEncryptedLocalPayloadRecord,
  buildRedactedPageExtract,
  buildRedactedReviewDraft,
  buildRedactedTabCandidate,
  hydratePageExtractRecord,
  hydrateReviewDraftRecord,
  hydrateTabCandidateRecord,
  resolvePageExtractPayloadExpiry,
  resolveTabCandidatePayloadExpiry,
} from './db-encryption';
import type { CoopDexie } from './db-schema';

export async function saveCoopState(db: CoopDexie, state: CoopSharedState) {
  const existing = await db.coopDocs.get(state.profile.id);
  const doc = hydrateCoopDoc(existing?.encodedState);

  try {
    writeCoopState(doc, state);
    await db.coopDocs.put({
      id: state.profile.id,
      encodedState: encodeCoopDoc(doc),
      updatedAt: nowIso(),
    });
  } finally {
    doc.destroy();
  }
}

export async function mergeCoopStateUpdate(
  db: CoopDexie,
  coopId: string,
  encodedState: Uint8Array,
) {
  const existing = await db.coopDocs.get(coopId);
  const doc = hydrateCoopDoc(existing?.encodedState);

  try {
    Y.applyUpdate(doc, encodedState);
    const merged = readCoopState(doc);

    if (merged.profile.id !== coopId) {
      throw new Error(`Persisted coop update target mismatch for ${coopId}.`);
    }

    await db.coopDocs.put({
      id: coopId,
      encodedState: encodeCoopDoc(doc),
      updatedAt: nowIso(),
    });

    return merged;
  } finally {
    doc.destroy();
  }
}

export async function saveTabCandidate(db: CoopDexie, candidate: TabCandidate) {
  const payload = await buildEncryptedLocalPayloadRecord({
    db,
    kind: 'tab-candidate',
    entityId: candidate.id,
    bytes: new TextEncoder().encode(JSON.stringify(tabCandidateSchema.parse(candidate))),
    expiresAt: resolveTabCandidatePayloadExpiry(candidate),
  });

  await db.transaction('rw', db.tabCandidates, db.encryptedLocalPayloads, async () => {
    await db.tabCandidates.put(buildRedactedTabCandidate(candidate));
    await db.encryptedLocalPayloads.put(payload);
  });
}

export async function getTabCandidate(db: CoopDexie, candidateId: string) {
  return hydrateTabCandidateRecord(db, await db.tabCandidates.get(candidateId));
}

export async function listTabCandidates(db: CoopDexie, limit?: number) {
  const candidates = await db.tabCandidates.orderBy('capturedAt').reverse().toArray();
  const hydrated = await Promise.all(
    candidates.map((candidate) => hydrateTabCandidateRecord(db, candidate)),
  );
  const filtered = hydrated.filter((candidate): candidate is TabCandidate => Boolean(candidate));
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
}

export async function savePageExtract(db: CoopDexie, extract: ReadablePageExtract) {
  const payload = await buildEncryptedLocalPayloadRecord({
    db,
    kind: 'page-extract',
    entityId: extract.id,
    bytes: new TextEncoder().encode(JSON.stringify(readablePageExtractSchema.parse(extract))),
    expiresAt: resolvePageExtractPayloadExpiry(extract),
  });

  await db.transaction('rw', db.pageExtracts, db.encryptedLocalPayloads, async () => {
    await db.pageExtracts.put(buildRedactedPageExtract(extract));
    await db.encryptedLocalPayloads.put(payload);
  });
}

/**
 * Find the most recent tab candidate matching a canonical URL hash.
 * Uses the canonicalUrlHash index which survives redaction (unlike canonicalUrl).
 * Returns the candidate with the latest capturedAt to ensure the dedup cooldown
 * comparison uses the most recent capture, not an arbitrary older one.
 *
 * Note: canonicalUrlHash is optional in the schema to avoid back-filling existing
 * rows. Pre-migration records have undefined and simply won't match.
 */
export async function findRecentCandidateByUrlHash(
  db: CoopDexie,
  canonicalUrlHash: string,
): Promise<TabCandidate | undefined> {
  const matches = await db.tabCandidates
    .where('canonicalUrlHash')
    .equals(canonicalUrlHash)
    .sortBy('capturedAt');
  return matches.at(-1);
}

/**
 * Check if an extract with the same content hash already exists.
 * Uses the redacted record's textHash (preserved through encryption redaction).
 * Returns the existing record's id if found, undefined otherwise.
 */
export async function findExistingExtractByTextHash(
  db: CoopDexie,
  textHash: string,
): Promise<string | undefined> {
  const existing = await db.pageExtracts.where('textHash').equals(textHash).first();
  return existing?.id;
}

const NEAR_DUPLICATE_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;
const NEAR_DUPLICATE_SCAN_LIMIT = 24;

/**
 * Finds an existing extract that should be treated as the same captured signal.
 * Keeps exact textHash dedupe fast, then falls back to a bounded same-domain
 * near-duplicate scan to catch print views, alternate article paths, and small
 * boilerplate variations without collapsing older or unrelated content.
 */
export async function findDuplicatePageExtract(
  db: CoopDexie,
  extract: ReadablePageExtract,
): Promise<string | undefined> {
  const exactMatchId = await findExistingExtractByTextHash(db, extract.textHash);
  if (exactMatchId) {
    return exactMatchId;
  }

  const recentCutoff = Date.now() - NEAR_DUPLICATE_LOOKBACK_MS;
  const candidates = (await db.pageExtracts.where('domain').equals(extract.domain).toArray())
    .filter((record) => {
      if (record.id === extract.id) {
        return false;
      }
      const createdAt = Date.parse(record.createdAt);
      return Number.isNaN(createdAt) || createdAt >= recentCutoff;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, NEAR_DUPLICATE_SCAN_LIMIT);

  for (const record of candidates) {
    const existing = await hydratePageExtractRecord(db, record);
    if (!existing) {
      continue;
    }
    if (arePageExtractsNearDuplicates(existing, extract)) {
      return existing.id;
    }
  }

  return undefined;
}

export async function getPageExtract(db: CoopDexie, extractId: string) {
  return hydratePageExtractRecord(db, await db.pageExtracts.get(extractId));
}

export async function listPageExtracts(db: CoopDexie) {
  const extracts = await db.pageExtracts.orderBy('createdAt').reverse().toArray();
  const hydrated = await Promise.all(
    extracts.map((extract) => hydratePageExtractRecord(db, extract)),
  );
  return hydrated.filter((extract): extract is ReadablePageExtract => Boolean(extract));
}

export async function saveReviewDraft(db: CoopDexie, draft: ReviewDraft) {
  const payload = await buildEncryptedLocalPayloadRecord({
    db,
    kind: 'review-draft',
    entityId: draft.id,
    bytes: new TextEncoder().encode(JSON.stringify(reviewDraftSchema.parse(draft))),
  });

  await db.transaction('rw', db.reviewDrafts, db.encryptedLocalPayloads, async () => {
    await db.reviewDrafts.put(buildRedactedReviewDraft(draft));
    await db.encryptedLocalPayloads.put(payload);
  });
}

export async function getReviewDraft(db: CoopDexie, draftId: string) {
  return hydrateReviewDraftRecord(db, await db.reviewDrafts.get(draftId));
}

export async function listReviewDrafts(db: CoopDexie) {
  const drafts = await db.reviewDrafts.orderBy('createdAt').reverse().toArray();
  const hydrated = await Promise.all(drafts.map((draft) => hydrateReviewDraftRecord(db, draft)));
  return hydrated.filter((draft): draft is ReviewDraft => Boolean(draft));
}

export async function listReviewDraftsByWorkflowStage(
  db: CoopDexie,
  workflowStage: ReviewDraft['workflowStage'],
) {
  const drafts = await db.reviewDrafts.where('workflowStage').equals(workflowStage).toArray();
  const hydrated = await Promise.all(drafts.map((draft) => hydrateReviewDraftRecord(db, draft)));
  return hydrated.filter((draft): draft is ReviewDraft => Boolean(draft));
}

export async function updateReviewDraft(
  db: CoopDexie,
  draftId: string,
  patch: Partial<ReviewDraft>,
) {
  const current = await getReviewDraft(db, draftId);
  if (!current) {
    return null;
  }

  const next = reviewDraftSchema.parse({
    ...current,
    ...patch,
  });
  await saveReviewDraft(db, next);
  return next;
}

export async function deleteReviewDraft(db: CoopDexie, draftId: string) {
  await db.transaction('rw', db.reviewDrafts, db.encryptedLocalPayloads, async () => {
    await db.reviewDrafts.delete(draftId);
    await db.encryptedLocalPayloads.delete(buildEncryptedLocalPayloadId('review-draft', draftId));
  });
}

export async function loadCoopState(db: CoopDexie, coopId: string) {
  const record = await db.coopDocs.get(coopId);
  if (!record) {
    return null;
  }
  const doc = hydrateCoopDoc(record.encodedState);
  return readCoopState(doc);
}
