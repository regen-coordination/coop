import {
  buildAgentObservationFingerprint,
  createAgentObservation,
  deduplicateMemories,
  enforceMemoryLimit,
  findAgentObservationByFingerprint,
  listReviewDraftsByWorkflowStage,
  pruneExpiredMemories,
  pruneSensitiveLocalData,
  saveAgentObservation,
} from '@coop/shared';
import { db, getCoops, notifyExtensionEvent, uiPreferences } from '../context';
import { refreshBadge } from '../dashboard';

// --- Constants ---

const STALE_DRAFT_THRESHOLD_MS = 48 * 60 * 60 * 1000;
const UNREVIEWED_OBSERVATION_THRESHOLD_MS = 24 * 60 * 60 * 1000;
// --- Heartbeat Handler ---

/**
 * Periodic heartbeat handler that runs lightweight DB checks
 * for stale drafts, unreviewed observations, and local memory maintenance.
 * No inference or content scripts -- just housekeeping queries.
 */
export async function handleAgentHeartbeat(): Promise<void> {
  if (!uiPreferences.heartbeatEnabled) {
    return;
  }

  const now = Date.now();
  let changed = false;

  // 1. Stale drafts: ready drafts older than 48h
  changed = (await checkStaleDrafts(now)) > 0 || changed;

  // 2. Unreviewed observations: pending observations older than 24h
  changed = (await checkUnreviewedObservations(now)) > 0 || changed;

  // 3. Memory maintenance: prune expired, enforce limits
  await maintainAgentMemories();

  if (changed) {
    await refreshBadge();
  }
}

// --- Stale Drafts ---

async function checkStaleDrafts(now: number): Promise<number> {
  const drafts = await listReviewDraftsByWorkflowStage(db, 'ready');
  const threshold = now - STALE_DRAFT_THRESHOLD_MS;
  let createdCount = 0;

  for (const draft of drafts) {
    const createdAtMs = new Date(draft.createdAt).getTime();
    if (createdAtMs > threshold) {
      continue;
    }

    const observation = createAgentObservation({
      trigger: 'stale-draft',
      title: `Stale draft: ${draft.title}`,
      summary: `Review draft "${draft.title}" has been in ready state for over 48 hours.`,
      coopId: draft.suggestedTargetCoopIds[0],
      draftId: draft.id,
      payload: {
        workflowStage: draft.workflowStage,
        category: draft.category,
        confidence: draft.confidence,
      },
    });

    const existing = await findAgentObservationByFingerprint(db, observation.fingerprint);
    if (existing) {
      continue;
    }

    await saveAgentObservation(db, observation);
    createdCount += 1;
  }

  return createdCount;
}

// --- Unreviewed Observations ---

async function checkUnreviewedObservations(now: number): Promise<number> {
  const observations = await db.agentObservations.where('status').equals('pending').toArray();
  const threshold = now - UNREVIEWED_OBSERVATION_THRESHOLD_MS;
  let notifiedCount = 0;

  for (const observation of observations) {
    const createdAtMs = new Date(observation.createdAt).getTime();
    if (createdAtMs > threshold) {
      continue;
    }

    const state =
      now - createdAtMs >= 72 * 60 * 60 * 1000
        ? '72h'
        : now - createdAtMs >= UNREVIEWED_OBSERVATION_THRESHOLD_MS
          ? '24h'
          : 'pending';

    console.warn('[heartbeat] unreviewed agent observation older than 24h', {
      id: observation.id,
      trigger: observation.trigger,
      createdAt: observation.createdAt,
    });
    await notifyExtensionEvent({
      eventKind: 'stale-observation',
      entityId: observation.id,
      state,
      title: state === '72h' ? 'Observation still waiting' : 'Observation awaiting review',
      message:
        state === '72h'
          ? `A proactive observation has been waiting for review since ${new Date(observation.createdAt).toLocaleString()}.`
          : 'A proactive observation has been waiting for review for over 24 hours.',
      intent: {
        tab: 'chickens',
        segment: 'stale',
        coopId: observation.coopId,
        observationId: observation.id,
      },
    });
    notifiedCount += 1;
  }

  return notifiedCount;
}

// --- Agent Memory Maintenance ---

async function maintainAgentMemories(): Promise<void> {
  await pruneExpiredMemories(db);
  await pruneSensitiveLocalData(db);

  const coops = await getCoops();
  for (const coop of coops) {
    await deduplicateMemories(db, coop.profile.id);
    await enforceMemoryLimit(db, coop.profile.id);
  }
}
