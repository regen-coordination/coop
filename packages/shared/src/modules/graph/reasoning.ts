import type { ReasoningTrace } from '../../contracts/schema-knowledge';
import type { GraphStore } from './store';

const MAX_TRACES = 500;

/** Tokenize text for similarity comparison */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[\s\-_.,;:!?()[\]{}"']+/)
      .filter((t) => t.length > 1),
  );
}

/** Jaccard similarity between two token sets */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Record a reasoning trace and link it to the graph store.
 * Enforces a max quota of 500 traces (oldest-first pruning).
 */
export function recordReasoningTrace(store: GraphStore, trace: ReasoningTrace): void {
  store.traces.push({ ...trace });

  // Enforce quota — prune oldest first
  if (store.traces.length > MAX_TRACES) {
    store.traces.splice(0, store.traces.length - MAX_TRACES);
  }
}

/**
 * Query for precedent traces similar to a given observation.
 * Ranks by: text similarity × outcome weight × recency.
 * Approved outcomes rank higher than rejected ones.
 */
export function queryPrecedents(
  store: GraphStore,
  observationText: string,
  options: { limit?: number } = {},
): ReasoningTrace[] {
  const { limit = 10 } = options;
  const queryTokens = tokenize(observationText);

  if (queryTokens.size === 0 || store.traces.length === 0) return [];

  const now = Date.now();

  const scored = store.traces
    .filter((t) => t.outcome !== 'pending')
    .map((trace) => {
      const traceTokens = tokenize(trace.observationText);
      const similarity = jaccardSimilarity(queryTokens, traceTokens);

      // Outcome weight: approved > rejected
      const outcomeWeight = trace.outcome === 'approved' ? 1.2 : 0.8;

      // Recency: newer traces score slightly higher
      const age = now - new Date(trace.createdAt).getTime();
      const recencyWeight = 1 / (1 + age / (30 * 24 * 60 * 60 * 1000)); // 30-day half-life

      return {
        trace,
        score: similarity * outcomeWeight * (0.7 + 0.3 * recencyWeight),
      };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.trace);
}

/**
 * Compute a confidence adjustment based on precedent traces.
 * Returns a delta: positive for mostly-approved precedents, negative for mostly-rejected.
 */
export function computePrecedentAdjustment(precedents: ReasoningTrace[]): number {
  if (precedents.length === 0) return 0;

  let approvedCount = 0;
  let rejectedCount = 0;

  for (const p of precedents) {
    if (p.outcome === 'approved') approvedCount++;
    if (p.outcome === 'rejected') rejectedCount++;
  }

  const total = approvedCount + rejectedCount;
  if (total === 0) return 0;

  const approvedRatio = approvedCount / total;
  // Range: -0.15 to +0.15 based on ratio
  const delta = (approvedRatio - 0.5) * 0.3;

  // Ensure minimum magnitude of 0.05
  if (delta > 0) return Math.max(delta, 0.05);
  if (delta < 0) return Math.min(delta, -0.05);
  return 0;
}
