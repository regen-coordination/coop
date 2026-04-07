import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createRelationship,
  destroyGraphStore,
  initGraphStore,
  invalidateRelationship,
  upsertEntity,
} from '../store';
import type { GraphStore } from '../store';
import { currentFacts, factHistory, factsAt } from '../temporal';
import { makeEntity, makeRelationship } from './fixtures';

let store: GraphStore;

beforeEach(() => {
  store = initGraphStore();

  upsertEntity(store, makeEntity({ id: 'a', name: 'A' }));
  upsertEntity(store, makeEntity({ id: 'b', name: 'B' }));

  // Active edge (no t_invalid)
  createRelationship(
    store,
    makeRelationship({
      from: 'a',
      to: 'b',
      type: 'current-rel',
      t_valid: '2024-01-01T00:00:00.000Z',
      t_invalid: null,
    }),
  );

  // Invalidated edge
  createRelationship(
    store,
    makeRelationship({
      from: 'a',
      to: 'b',
      type: 'old-rel',
      t_valid: '2020-01-01T00:00:00.000Z',
      t_invalid: '2023-06-01T00:00:00.000Z',
    }),
  );

  // Edge valid in a specific window
  createRelationship(
    store,
    makeRelationship({
      from: 'a',
      to: 'b',
      type: 'window-rel',
      t_valid: '2022-06-01T00:00:00.000Z',
      t_invalid: '2023-01-01T00:00:00.000Z',
    }),
  );
});

afterEach(() => {
  destroyGraphStore(store);
});

describe('currentFacts', () => {
  it('returns only edges where t_invalid is null', () => {
    const facts = currentFacts(store, 'a');

    expect(facts).toHaveLength(1);
    expect(facts[0].type).toBe('current-rel');
    expect(facts[0].t_invalid).toBeNull();
  });
});

describe('factsAt', () => {
  it('returns edges valid at a past timestamp', () => {
    // Mid-2022: old-rel is active, window-rel just started, current-rel not yet
    const facts = factsAt(store, 'a', '2022-08-01T00:00:00.000Z');

    const types = facts.map((f) => f.type).sort();
    expect(types).toContain('old-rel');
    expect(types).toContain('window-rel');
    expect(types).not.toContain('current-rel');
  });

  it('returns invalidated edges that were valid at that time', () => {
    // 2021: only old-rel was active
    const facts = factsAt(store, 'a', '2021-06-01T00:00:00.000Z');

    expect(facts).toHaveLength(1);
    expect(facts[0].type).toBe('old-rel');
  });

  it('does not return edges that started after the timestamp', () => {
    // 2019: nothing was active yet
    const facts = factsAt(store, 'a', '2019-01-01T00:00:00.000Z');
    expect(facts).toHaveLength(0);
  });
});

describe('factHistory', () => {
  it('returns full temporal timeline ordered by t_valid', () => {
    const history = factHistory(store, 'a');

    expect(history.length).toBe(3);
    // Should be ordered by t_valid ascending
    const validDates = history.map((h) => h.t_valid);
    const sorted = [...validDates].sort();
    expect(validDates).toEqual(sorted);
  });

  it('includes both active and invalidated edges', () => {
    const history = factHistory(store, 'a');
    const hasActive = history.some((h) => h.t_invalid === null);
    const hasInvalidated = history.some((h) => h.t_invalid !== null);

    expect(hasActive).toBe(true);
    expect(hasInvalidated).toBe(true);
  });
});

describe('temporal invalidation', () => {
  it('invalidated edges are still queryable via factsAt', () => {
    // old-rel was invalidated at 2023-06-01, but was valid during 2022
    const facts2022 = factsAt(store, 'a', '2022-03-01T00:00:00.000Z');
    expect(facts2022.some((f) => f.type === 'old-rel')).toBe(true);

    // After invalidation, currentFacts should not return it
    const current = currentFacts(store, 'a');
    expect(current.some((f) => f.type === 'old-rel')).toBe(false);
  });
});
