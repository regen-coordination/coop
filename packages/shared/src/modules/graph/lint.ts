import type {
  KnowledgeLintFinding,
  KnowledgeLintOutput,
  KnowledgeSource,
} from '../../contracts/schema-knowledge';
import type { GraphStore } from './store';

const STALE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Run knowledge lint checks on the graph and source registry.
 * Detects orphan entities, stale sources, contradictions, coverage gaps, and reports health stats.
 */
export function runKnowledgeLint(
  store: GraphStore,
  sources: KnowledgeSource[],
): KnowledgeLintOutput {
  const findings: KnowledgeLintFinding[] = [];
  const now = Date.now();

  // --- Orphan entities (zero edges) ---
  for (const [id, entity] of store.entities) {
    const hasEdge = store.relationships.some((r) => r.from === id || r.to === id);
    if (!hasEdge) {
      findings.push({
        type: 'orphan-entity',
        severity: 'warning',
        message: `Entity "${entity.name}" has no relationships`,
        entityId: id,
        suggestion: `Connect "${entity.name}" to related entities or remove it to reduce noise`,
      });
    }
  }

  // --- Stale sources (not refreshed in 14+ days) ---
  for (const source of sources) {
    if (!source.lastFetchedAt) continue;
    const age = now - new Date(source.lastFetchedAt).getTime();
    if (age > STALE_THRESHOLD_MS) {
      findings.push({
        type: 'stale-source',
        severity: 'warning',
        message: `Source "${source.label}" hasn't been refreshed in ${Math.round(age / (24 * 60 * 60 * 1000))} days`,
        sourceId: source.id,
        suggestion: `Refresh "${source.label}" to keep knowledge current`,
      });
    }
  }

  // --- Contradictions (duplicate active edges of same type between same entities) ---
  const edgeKeys = new Map<string, number>();
  for (const rel of store.relationships) {
    if (rel.t_invalid !== null) continue;
    const key = `${rel.from}:${rel.to}:${rel.type}`;
    edgeKeys.set(key, (edgeKeys.get(key) ?? 0) + 1);
  }
  for (const [key, count] of edgeKeys) {
    if (count > 1) {
      const [from, to, type] = key.split(':');
      findings.push({
        type: 'contradiction',
        severity: 'error',
        message: `${count} active edges of type "${type}" between ${from} and ${to}`,
        suggestion: 'Invalidate older edges to resolve the contradiction',
      });
    }
  }

  // --- Coverage gaps (source types with zero entities) ---
  const sourceTypes = new Set(sources.map((s) => s.type));
  const entitySourceTypes = new Set<string>();
  for (const entity of store.entities.values()) {
    const prefix = entity.sourceRef.split(':')[0];
    if (prefix) entitySourceTypes.add(prefix);
  }
  for (const type of sourceTypes) {
    if (!entitySourceTypes.has(type)) {
      findings.push({
        type: 'coverage-gap',
        severity: 'info',
        message: `No entities extracted from ${type} sources`,
        suggestion: `Run entity extraction on ${type} sources to populate the knowledge graph`,
      });
    }
  }

  // --- Health stats ---
  const orphanCount = findings.filter((f) => f.type === 'orphan-entity').length;
  const staleCount = findings.filter((f) => f.type === 'stale-source').length;

  if (store.entities.size > 0) {
    const ratio =
      store.relationships.length > 0
        ? store.entities.size / store.relationships.length
        : Number.POSITIVE_INFINITY;
    if (ratio > 5) {
      findings.push({
        type: 'health',
        severity: 'info',
        message: `Entity:edge ratio is ${ratio.toFixed(1)} — most entities are poorly connected`,
        suggestion: 'Run entity extraction to discover more relationships',
      });
    }
  }

  return {
    findings,
    stats: {
      entityCount: store.entities.size,
      relationshipCount: store.relationships.length,
      sourceCount: sources.length,
      orphanEntityCount: orphanCount,
      staleSourceCount: staleCount,
    },
  };
}
