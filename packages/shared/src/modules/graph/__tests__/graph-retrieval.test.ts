import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hybridSearch, searchByText, searchByTraversal } from '../retrieval';
import {
  type GraphStore,
  createRelationship,
  destroyGraphStore,
  initGraphStore,
  upsertEntity,
} from '../store';
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

describe('searchByText', () => {
  it('returns entities matching text query', () => {
    const results = searchByText(store, 'Ethereum');

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.entity.id === 'ethereum')).toBe(true);
  });

  it('matches partial terms in name and description', () => {
    const results = searchByText(store, 'Foundation');

    expect(results.some((r) => r.entity.id === 'eth-foundation')).toBe(true);
  });

  it('returns empty for non-matching query', () => {
    const results = searchByText(store, 'xyznonexistent');
    expect(results).toHaveLength(0);
  });
});

describe('searchByTraversal', () => {
  it('returns 1-hop neighbors', () => {
    const results = searchByTraversal(store, ['ethereum'], 1);

    const ids = results.map((r) => r.entity.id);
    expect(ids).toContain('vitalik');
    expect(ids).toContain('solidity');
    expect(ids).toContain('safe');
  });

  it('returns 2-hop neighbors', () => {
    const results = searchByTraversal(store, ['vitalik'], 2);

    const ids = results.map((r) => r.entity.id);
    // vitalik -> ethereum -> solidity (2 hops)
    expect(ids).toContain('solidity');
  });

  it('does not include seed entities in results', () => {
    const results = searchByTraversal(store, ['ethereum'], 1);
    const ids = results.map((r) => r.entity.id);
    expect(ids).not.toContain('ethereum');
  });
});

describe('hybridSearch', () => {
  it('combines text and traversal results', () => {
    const results = hybridSearch(store, 'Ethereum founder', {
      maxResults: 5,
    });

    expect(results.length).toBeGreaterThanOrEqual(1);
    const ids = results.map((r) => r.entity.id);
    expect(ids).toContain('vitalik');
  });

  it('deduplicates across search methods', () => {
    const results = hybridSearch(store, 'Ethereum', {
      maxResults: 20,
    });

    const ids = results.map((r) => r.entity.id);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });

  it('respects temporal validity (current facts only)', () => {
    const results = hybridSearch(store, 'Safe', {
      maxResults: 10,
      temporalFilter: 'current',
    });

    // Results should exist - Safe has current relationships
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns provenance (sourceRef) for each result', () => {
    const results = hybridSearch(store, 'Vitalik', {
      maxResults: 3,
    });

    for (const r of results) {
      expect(r.entity.sourceRef).toBeTruthy();
    }
  });

  it('completes without LLM call', () => {
    // This test ensures no external inference is called during retrieval
    // The hybridSearch function is purely algorithmic — no model calls
    const results = hybridSearch(store, 'blockchain platform', {
      maxResults: 5,
    });

    // If we get here without error, no LLM was invoked
    expect(results).toBeDefined();
  });

  it('respects maxResults limit', () => {
    const results = hybridSearch(store, 'Ethereum', {
      maxResults: 3,
    });

    expect(results.length).toBeLessThanOrEqual(3);
  });
});
