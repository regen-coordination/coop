import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { KnowledgeSource } from '../../../contracts/schema-knowledge';
import { runKnowledgeLint } from '../lint';
import {
  type GraphStore,
  createRelationship,
  destroyGraphStore,
  initGraphStore,
  upsertEntity,
} from '../store';
import { makeEntity, makeRelationship } from './fixtures';

let store: GraphStore;

beforeEach(() => {
  store = initGraphStore();
});

afterEach(() => {
  destroyGraphStore(store);
});

function makeSource(overrides: Partial<KnowledgeSource> = {}): KnowledgeSource {
  return {
    id: overrides.id ?? 'ks-1',
    type: overrides.type ?? 'youtube',
    identifier: overrides.identifier ?? 'channel-1',
    label: overrides.label ?? 'Test Source',
    coopId: overrides.coopId ?? 'coop-1',
    addedBy: overrides.addedBy ?? 'member-1',
    addedAt: overrides.addedAt ?? '2026-03-01T00:00:00.000Z',
    lastFetchedAt: overrides.lastFetchedAt ?? '2026-04-01T00:00:00.000Z',
    entityCount: overrides.entityCount ?? 5,
    active: overrides.active ?? true,
  };
}

describe('runKnowledgeLint', () => {
  it('detects orphan entities (zero edges)', () => {
    upsertEntity(store, makeEntity({ id: 'orphan', name: 'Lonely Entity' }));
    upsertEntity(store, makeEntity({ id: 'connected', name: 'Connected' }));
    createRelationship(
      store,
      makeRelationship({ from: 'connected', to: 'orphan-other', type: 'knows' }),
    );
    // 'orphan' has no relationships

    const result = runKnowledgeLint(store, [makeSource()]);
    const orphanFindings = result.findings.filter((f) => f.type === 'orphan-entity');

    expect(orphanFindings.length).toBeGreaterThanOrEqual(1);
    expect(orphanFindings.some((f) => f.entityId === 'orphan')).toBe(true);
  });

  it('detects stale sources (not refreshed in 14+ days)', () => {
    const staleSource = makeSource({
      id: 'stale-ks',
      lastFetchedAt: '2026-03-01T00:00:00.000Z', // ~36 days ago from "now"
    });

    const result = runKnowledgeLint(store, [staleSource]);
    const staleFindings = result.findings.filter((f) => f.type === 'stale-source');

    expect(staleFindings.length).toBeGreaterThanOrEqual(1);
    expect(staleFindings[0].sourceId).toBe('stale-ks');
  });

  it('detects contradictions (conflicting temporal edges)', () => {
    upsertEntity(store, makeEntity({ id: 'a' }));
    upsertEntity(store, makeEntity({ id: 'b' }));

    // Two edges of same type between same entities, both active
    createRelationship(
      store,
      makeRelationship({
        from: 'a',
        to: 'b',
        type: 'leads',
        t_valid: '2024-01-01T00:00:00.000Z',
        confidence: 0.9,
      }),
    );
    createRelationship(
      store,
      makeRelationship({
        from: 'a',
        to: 'b',
        type: 'leads',
        t_valid: '2025-01-01T00:00:00.000Z',
        confidence: 0.5,
      }),
    );

    const result = runKnowledgeLint(store, []);
    const contradictions = result.findings.filter((f) => f.type === 'contradiction');

    expect(contradictions.length).toBeGreaterThanOrEqual(1);
  });

  it('detects coverage gaps (source types with zero entities)', () => {
    // Sources exist but no entities in the graph
    const sources = [
      makeSource({ id: 'ks-yt', type: 'youtube' }),
      makeSource({ id: 'ks-gh', type: 'github' }),
    ];

    const result = runKnowledgeLint(store, sources);
    const gaps = result.findings.filter((f) => f.type === 'coverage-gap');

    // Should detect that neither youtube nor github has entities
    expect(gaps.length).toBeGreaterThanOrEqual(1);
  });

  it('reports graph health stats', () => {
    upsertEntity(store, makeEntity({ id: 'e1' }));
    upsertEntity(store, makeEntity({ id: 'e2' }));
    createRelationship(store, makeRelationship({ from: 'e1', to: 'e2', type: 'knows' }));

    const result = runKnowledgeLint(store, [makeSource()]);

    expect(result.stats.entityCount).toBe(2);
    expect(result.stats.relationshipCount).toBe(1);
    expect(result.stats.sourceCount).toBe(1);
  });

  it('includes actionable suggestions per finding', () => {
    upsertEntity(store, makeEntity({ id: 'orphan', name: 'Lonely' }));

    const result = runKnowledgeLint(store, []);
    const orphanFindings = result.findings.filter((f) => f.type === 'orphan-entity');

    for (const finding of orphanFindings) {
      expect(finding.suggestion).toBeTruthy();
    }
  });
});
