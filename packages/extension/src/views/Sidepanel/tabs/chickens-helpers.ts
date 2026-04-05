import type { Artifact, CoopSharedState, ReviewDraft } from '@coop/shared';
import type { AgentDashboardResponse, ProactiveSignal } from '../../../runtime/messages';
import { resolvePreviewCardImageUrl } from '../../shared/dashboard-selectors';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STALE_OBSERVATION_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export const ORIENTATION_CATEGORIES = new Set([
  'setup-insight',
  'coop-soul',
  'ritual',
  'seed-contribution',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isStalePendingObservation(createdAt: string, status: string) {
  return (
    status === 'pending' &&
    new Date(createdAt).getTime() <= Date.now() - STALE_OBSERVATION_THRESHOLD_MS
  );
}

export function formatRelativeTime(timestamp?: string) {
  if (!timestamp) return 'Just now';
  const elapsed = Date.now() - new Date(timestamp).getTime();
  if (Number.isNaN(elapsed) || elapsed < 0) return 'Just now';
  const minutes = Math.round(elapsed / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatCategoryLabel(value: string) {
  return value
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Unified review item — merges signals, drafts, and stale observations
// ---------------------------------------------------------------------------
//
// When a signal has a linked draftId that matches an existing draft, we merge
// them into a single ReviewItem so the user sees one card with push controls
// and signal support data. Orphan signals (no draft) still get push controls
// via the promote-and-publish path.

export type ReviewItemKind = 'signal' | 'draft' | 'stale';

export interface ReviewItem {
  id: string;
  kind: ReviewItemKind;
  title: string;
  insight: string;
  tags: string[];
  category: string;
  timestamp: string;
  targetCoops: { id: string; name: string }[];
  /** Original data for progressive disclosure */
  signal?: ProactiveSignal;
  draft?: ReviewDraft;
  staleObservation?: NonNullable<AgentDashboardResponse>['observations'][number];
}

// ---------------------------------------------------------------------------
// Review item resolution helpers
// ---------------------------------------------------------------------------

/** Resolve the best preview image URL from draft or artifact metadata. */
export function resolvePreviewImage(item: ReviewItem): string | undefined {
  if (item.draft) return resolvePreviewCardImageUrl(item.draft);
  return undefined;
}

/** Resolve favicon from captured source data, no external service. */
export function faviconUrl(item: ReviewItem): string | undefined {
  return item.draft?.sources[0]?.faviconUrl ?? item.signal?.favicon;
}

/** Extract the source domain from a review item. */
export function resolveSourceDomain(item: ReviewItem): string | undefined {
  if (item.draft?.sources[0]?.domain) return item.draft.sources[0].domain;
  if (item.signal?.domain) return item.signal.domain;
  return undefined;
}

/** Extract the source URL from a review item. */
export function resolveSourceUrl(item: ReviewItem): string | undefined {
  if (item.draft?.sources[0]?.url) return item.draft.sources[0].url;
  if (item.signal?.url) return item.signal.url;
  return undefined;
}

// ---------------------------------------------------------------------------
// Build review items
// ---------------------------------------------------------------------------

export function buildReviewItems(
  signals: ProactiveSignal[],
  drafts: ReviewDraft[],
  staleObservations: NonNullable<AgentDashboardResponse>['observations'][number][],
  coops: CoopSharedState[],
): ReviewItem[] {
  const coopNameById = new Map(coops.map((c) => [c.profile.id, c.profile.name]));

  const items: ReviewItem[] = [];

  // Track which drafts are consumed by signal merge so we don't double-emit them
  const mergedDraftIds = new Set<string>();

  for (const signal of signals) {
    const primary = signal.targetCoops[0];
    const linkedDraft = signal.draftId ? drafts.find((d) => d.id === signal.draftId) : undefined;

    if (linkedDraft) {
      // Skip if another signal already merged this draft
      if (mergedDraftIds.has(linkedDraft.id)) continue;

      // Merge: use draft as the actionable base but carry signal support data
      mergedDraftIds.add(linkedDraft.id);
      items.push({
        id: `draft-${linkedDraft.id}`,
        kind: 'draft',
        title: linkedDraft.title,
        insight: linkedDraft.whyItMatters,
        tags: (linkedDraft.tags ?? []).slice(0, 3),
        category: linkedDraft.category,
        timestamp: linkedDraft.createdAt,
        targetCoops: (linkedDraft.suggestedTargetCoopIds ?? []).map((id) => ({
          id,
          name: coopNameById.get(id) ?? 'Coop',
        })),
        draft: linkedDraft,
        signal,
      });
    } else {
      // Orphan signal — no draft yet, still reviewable and pushable
      items.push({
        id: `signal-${signal.id}`,
        kind: 'signal',
        title: signal.title,
        insight: primary?.rationale ?? '',
        tags: (signal.tags ?? []).slice(0, 3),
        category: signal.category,
        timestamp: signal.updatedAt,
        targetCoops: signal.targetCoops.map((t) => ({ id: t.coopId, name: t.coopName })),
        signal,
      });
    }
  }

  // Emit remaining drafts that were not merged with a signal
  for (const draft of drafts) {
    if (mergedDraftIds.has(draft.id)) continue;
    items.push({
      id: `draft-${draft.id}`,
      kind: 'draft',
      title: draft.title,
      insight: draft.whyItMatters,
      tags: (draft.tags ?? []).slice(0, 3),
      category: draft.category,
      timestamp: draft.createdAt,
      targetCoops: (draft.suggestedTargetCoopIds ?? []).map((id) => ({
        id,
        name: coopNameById.get(id) ?? 'Coop',
      })),
      draft,
    });
  }

  for (const obs of staleObservations) {
    items.push({
      id: `stale-${obs.id}`,
      kind: 'stale',
      title: obs.title,
      insight: obs.summary,
      tags: [],
      category: 'observation',
      timestamp: obs.createdAt,
      targetCoops: [],
      staleObservation: obs,
    });
  }

  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
