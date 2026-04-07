import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hybridSearch } from '../retrieval';
import {
  type GraphStore,
  createRelationship,
  destroyGraphStore,
  initGraphStore,
  upsertEntity,
} from '../store';
import corpus from './benchmarks/retrieval-corpus.json';
import { seedTestGraph } from './fixtures';

let store: GraphStore;

beforeEach(() => {
  store = initGraphStore();
  const { entities, relationships } = seedTestGraph();
  for (const e of entities) upsertEntity(store, e);
  for (const r of relationships) createRelationship(store, r);
});

afterEach(() => {
  destroyGraphStore(store);
});

describe('retrieval benchmark', () => {
  it('achieves MRR >= 0.6 across the corpus', () => {
    let reciprocalRankSum = 0;

    for (const entry of corpus.queries) {
      const results = hybridSearch(store, entry.query, { maxResults: 5 });
      const resultIds = results.map((r) => r.entity.id);

      // Find the rank of the first expected entity in results
      let bestRank = 0;
      for (const expectedId of entry.expected) {
        const rank = resultIds.indexOf(expectedId);
        if (rank !== -1) {
          bestRank = 1 / (rank + 1);
          break;
        }
      }
      reciprocalRankSum += bestRank;
    }

    const mrr = reciprocalRankSum / corpus.queries.length;
    expect(mrr).toBeGreaterThanOrEqual(0.6);
  });

  it('returns results for every query', () => {
    for (const entry of corpus.queries) {
      const results = hybridSearch(store, entry.query, { maxResults: 5 });
      expect(results.length).toBeGreaterThanOrEqual(1);
    }
  });
});
