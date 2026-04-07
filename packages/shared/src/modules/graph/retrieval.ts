import type { GraphEntity } from '../../contracts/schema-knowledge';
import type { GraphStore } from './store';
import { currentFacts } from './temporal';

export interface RetrievalResult {
  entity: GraphEntity;
  score: number;
  /** Which search methods contributed to this result */
  sources: string[];
}

export interface HybridSearchOptions {
  maxResults?: number;
  weights?: { text?: number; traversal?: number };
  temporalFilter?: 'current' | 'all';
}

// ---------------------------------------------------------------------------
// BM25-style text search
// ---------------------------------------------------------------------------

/** Tokenize text into lowercase terms */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_.,;:!?()[\]{}"']+/)
    .filter((t) => t.length > 1);
}

/** Simple BM25-inspired scoring: term frequency / (term frequency + 1) */
function bm25Score(queryTerms: string[], docTerms: string[]): number {
  if (queryTerms.length === 0 || docTerms.length === 0) return 0;

  let score = 0;
  const docTermSet = new Set(docTerms);

  for (const qt of queryTerms) {
    // Exact match
    if (docTermSet.has(qt)) {
      score += 1.0;
      continue;
    }
    // Prefix match (partial term matching)
    for (const dt of docTermSet) {
      if (dt.startsWith(qt) || qt.startsWith(dt)) {
        score += 0.5;
        break;
      }
    }
  }

  // Normalize by query length
  return score / queryTerms.length;
}

/**
 * Search entities by text query using BM25-style scoring.
 * Matches against entity name, description, type, and sourceRef.
 */
export function searchByText(store: GraphStore, query: string): RetrievalResult[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const results: RetrievalResult[] = [];

  for (const entity of store.entities.values()) {
    const docTerms = tokenize(
      `${entity.name} ${entity.description} ${entity.type} ${entity.sourceRef}`,
    );
    const score = bm25Score(queryTerms, docTerms);

    if (score > 0) {
      results.push({ entity, score, sources: ['text'] });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Graph traversal search
// ---------------------------------------------------------------------------

/**
 * Find entities reachable within `hops` from the seed entity IDs.
 * Returns neighbors excluding the seed set, scored by distance (closer = higher).
 */
export function searchByTraversal(
  store: GraphStore,
  seedIds: string[],
  hops: number,
): RetrievalResult[] {
  const seedSet = new Set(seedIds);
  const visited = new Set<string>(seedIds);
  let frontier = new Set<string>(seedIds);

  for (let hop = 0; hop < hops; hop++) {
    const nextFrontier = new Set<string>();

    for (const rel of store.relationships) {
      if (frontier.has(rel.from) && !visited.has(rel.to)) {
        nextFrontier.add(rel.to);
        visited.add(rel.to);
      }
      if (frontier.has(rel.to) && !visited.has(rel.from)) {
        nextFrontier.add(rel.from);
        visited.add(rel.from);
      }
    }

    frontier = nextFrontier;
  }

  // Score: closer hops score higher
  const results: RetrievalResult[] = [];
  for (const id of visited) {
    if (seedSet.has(id)) continue;
    const entity = store.entities.get(id);
    if (!entity) continue;

    // Simple distance-based score: entities found in later hops get lower scores
    // Since we don't track exact hop distance here, use a flat traversal score
    results.push({ entity, score: 0.6, sources: ['traversal'] });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Hybrid search
// ---------------------------------------------------------------------------

/**
 * Combine text search and graph traversal, deduplicate, and rank.
 * No LLM calls — purely algorithmic.
 */
export function hybridSearch(
  store: GraphStore,
  query: string,
  options: HybridSearchOptions = {},
): RetrievalResult[] {
  const {
    maxResults = 10,
    weights = { text: 0.7, traversal: 0.3 },
    temporalFilter = 'all',
  } = options;

  const textWeight = weights.text ?? 0.7;
  const traversalWeight = weights.traversal ?? 0.3;

  // 1. Text search
  const textResults = searchByText(store, query);

  // 2. Graph traversal from top text results
  const topTextIds = textResults.slice(0, 3).map((r) => r.entity.id);
  const traversalResults = topTextIds.length > 0 ? searchByTraversal(store, topTextIds, 2) : [];

  // 3. Merge and deduplicate
  const merged = new Map<string, RetrievalResult>();

  for (const r of textResults) {
    merged.set(r.entity.id, {
      entity: r.entity,
      score: r.score * textWeight,
      sources: ['text'],
    });
  }

  for (const r of traversalResults) {
    const existing = merged.get(r.entity.id);
    if (existing) {
      existing.score += r.score * traversalWeight;
      if (!existing.sources.includes('traversal')) {
        existing.sources.push('traversal');
      }
    } else {
      merged.set(r.entity.id, {
        entity: r.entity,
        score: r.score * traversalWeight,
        sources: ['traversal'],
      });
    }
  }

  // 4. Apply temporal filter
  let results = [...merged.values()];

  if (temporalFilter === 'current') {
    results = results.filter((r) => {
      const facts = currentFacts(store, r.entity.id);
      return facts.length > 0;
    });
  }

  // 5. Sort by score and limit
  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
