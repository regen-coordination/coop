import type { ValidatedInsight } from '../../contracts/schema-knowledge';
import { createId, nowIso } from '../../utils';
import type { GraphStore } from './store';

const CONFIDENCE_DELTA = 0.05;
const MIN_CONFIDENCE = 0.1;
const MAX_CONFIDENCE = 1.0;

function clampConfidence(value: number): number {
  return Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, value));
}

/**
 * Strengthen confidence of edges connected to entities referenced by a trace.
 * Called when a draft is approved — positive signal.
 */
export function strengthenSourceEdges(
  store: GraphStore,
  traceId: string,
  _outcome: 'approved',
): void {
  const trace = store.traces.find((t) => t.traceId === traceId);
  if (!trace) return;

  const entityIds = new Set(trace.contextEntityIds);

  for (const rel of store.relationships) {
    if (entityIds.has(rel.from) || entityIds.has(rel.to)) {
      rel.confidence = clampConfidence(rel.confidence + CONFIDENCE_DELTA);
    }
  }
}

/**
 * Weaken confidence of edges connected to entities referenced by a trace.
 * Called when a draft is rejected — negative signal.
 */
export function weakenSourceEdges(store: GraphStore, traceId: string, _outcome: 'rejected'): void {
  const trace = store.traces.find((t) => t.traceId === traceId);
  if (!trace) return;

  const entityIds = new Set(trace.contextEntityIds);

  for (const rel of store.relationships) {
    if (entityIds.has(rel.from) || entityIds.has(rel.to)) {
      rel.confidence = clampConfidence(rel.confidence - CONFIDENCE_DELTA);
    }
  }
}

/**
 * Create a validated insight node from an approved draft.
 * Links the insight to its source entities and the reasoning trace.
 */
export function createValidatedInsight(
  store: GraphStore,
  input: {
    draftSummary: string;
    sourceEntityIds: string[];
    traceId: string;
  },
): ValidatedInsight {
  const insight: ValidatedInsight = {
    insightId: createId('insight'),
    draftSummary: input.draftSummary,
    sourceEntityIds: input.sourceEntityIds,
    traceId: input.traceId,
    createdAt: nowIso(),
  };

  store.insights.push(insight);
  return insight;
}
