import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { appendLogEntry, getRecentLog } from '../../knowledge-source/activity-log';
import { assertAllowedSource } from '../../knowledge-source/allowlist';
import { createKnowledgeSource } from '../../knowledge-source/knowledge-source';
import { type CoopDexie, createCoopDb } from '../../storage/db';
import { createValidatedInsight, strengthenSourceEdges, weakenSourceEdges } from '../compound';
import { assembleGraphContext } from '../context';
import { computePrecedentAdjustment, queryPrecedents, recordReasoningTrace } from '../reasoning';
import { hybridSearch } from '../retrieval';
import {
  type GraphStore,
  createRelationship,
  destroyGraphStore,
  initGraphStore,
  upsertEntity,
} from '../store';
import { makeEntity, makeRelationship } from './fixtures';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

let db: CoopDexie;
let store: GraphStore;
let doc: Y.Doc;

beforeEach(async () => {
  db = createCoopDb(`test-integration-${crypto.randomUUID()}`);
  store = initGraphStore();
  doc = new Y.Doc();
});

afterEach(async () => {
  destroyGraphStore(store);
  doc.destroy();
  await db.delete();
});

describe('knowledge sandbox integration', () => {
  it('full cycle: source registry → graph population → retrieval → context', async () => {
    // 1. Register a source
    const source = await createKnowledgeSource(db, {
      type: 'github',
      identifier: 'anthropics/claude-code',
      label: 'Claude Code',
      coopId: 'coop-1',
      addedBy: 'member-1',
    });
    expect(source.id).toBeTruthy();

    // 2. Populate graph with entities (simulating adapter → extraction output)
    upsertEntity(
      store,
      makeEntity({
        id: 'anthropic',
        name: 'Anthropic',
        type: 'organization',
        description: 'AI company that created Claude',
        sourceRef: 'github:anthropics/claude-code',
      }),
    );
    upsertEntity(
      store,
      makeEntity({
        id: 'claude-code',
        name: 'Claude Code',
        type: 'object',
        description: 'CLI tool for AI-assisted coding',
        sourceRef: 'github:anthropics/claude-code',
      }),
    );
    createRelationship(
      store,
      makeRelationship({
        from: 'anthropic',
        to: 'claude-code',
        type: 'created',
      }),
    );

    // 5. Retrieve via hybrid search
    const results = hybridSearch(store, 'Claude Code CLI tool', { maxResults: 5 });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.entity.id === 'claude-code')).toBe(true);

    // 6. Assemble context for skill prompt
    const context = assembleGraphContext(results, 500);
    expect(context).toContain('Claude Code');
    expect(context).toContain('github:anthropics/claude-code');
  });

  it('compound loop: approval strengthens edges + creates insight + logs', async () => {
    upsertEntity(store, makeEntity({ id: 'e1', name: 'Ethereum' }));
    upsertEntity(store, makeEntity({ id: 'e2', name: 'Safe' }));
    createRelationship(
      store,
      makeRelationship({
        from: 'e1',
        to: 'e2',
        type: 'uses',
        confidence: 0.7,
      }),
    );

    recordReasoningTrace(store, {
      traceId: 'trace-approval',
      skillRunId: 'run-1',
      observationId: 'obs-1',
      observationText: 'Ethereum Safe integration',
      contextEntityIds: ['e1', 'e2'],
      precedentTraceIds: [],
      confidence: 0.85,
      outputSummary: 'Draft about Safe usage',
      outcome: 'approved',
      createdAt: '2026-04-01T00:00:00.000Z',
    });

    // Approve: strengthen + insight + log
    strengthenSourceEdges(store, 'trace-approval', 'approved');
    const insight = createValidatedInsight(store, {
      draftSummary: 'Safe integration is production-ready',
      sourceEntityIds: ['e1', 'e2'],
      traceId: 'trace-approval',
    });
    appendLogEntry(doc, {
      type: 'approval',
      timestamp: '2026-04-01T00:00:00.000Z',
      summary: 'Draft approved: Safe integration',
      traceId: 'trace-approval',
    });

    // Verify
    const edge = store.relationships.find((r) => r.from === 'e1' && r.to === 'e2');
    expect(edge?.confidence).toBeGreaterThan(0.7);
    expect(insight.insightId).toBeTruthy();
    expect(store.insights).toHaveLength(1);

    const log = getRecentLog(doc, 10);
    expect(log[0].type).toBe('approval');
  });

  it('compound loop: rejection weakens edges + logs', () => {
    upsertEntity(store, makeEntity({ id: 'e1', name: 'Ethereum' }));
    upsertEntity(store, makeEntity({ id: 'e2', name: 'BadProject' }));
    createRelationship(
      store,
      makeRelationship({
        from: 'e1',
        to: 'e2',
        type: 'funds',
        confidence: 0.6,
      }),
    );

    recordReasoningTrace(store, {
      traceId: 'trace-reject',
      skillRunId: 'run-2',
      observationId: 'obs-2',
      observationText: 'BadProject funding analysis',
      contextEntityIds: ['e1', 'e2'],
      precedentTraceIds: [],
      confidence: 0.4,
      outputSummary: 'Funding analysis draft',
      outcome: 'rejected',
      createdAt: '2026-04-01T00:00:00.000Z',
    });

    weakenSourceEdges(store, 'trace-reject', 'rejected');
    appendLogEntry(doc, {
      type: 'rejection',
      timestamp: '2026-04-01T00:00:00.000Z',
      summary: 'Draft rejected: BadProject funding',
      traceId: 'trace-reject',
    });

    const edge = store.relationships.find((r) => r.from === 'e1' && r.to === 'e2');
    expect(edge?.confidence).toBeLessThan(0.6);

    const log = getRecentLog(doc, 10);
    expect(log[0].type).toBe('rejection');
  });

  it('allowlist enforcement: non-registered URL blocked', async () => {
    await createKnowledgeSource(db, {
      type: 'github',
      identifier: 'anthropics/claude-code',
      label: 'Claude Code',
      coopId: 'coop-1',
      addedBy: 'member-1',
    });

    // Registered URL passes
    await expect(
      assertAllowedSource(db, 'https://github.com/anthropics/claude-code', 'github', 'coop-1'),
    ).resolves.not.toThrow();

    // Non-registered URL blocked
    await expect(
      assertAllowedSource(db, 'https://github.com/evil/repo', 'github', 'coop-1'),
    ).rejects.toThrow(/not registered/i);
  });

  it('precedent query informs confidence', () => {
    recordReasoningTrace(store, {
      traceId: 'past-good',
      skillRunId: 'run-past',
      observationId: 'obs-past',
      observationText: 'Similar governance proposal',
      contextEntityIds: [],
      precedentTraceIds: [],
      confidence: 0.9,
      outputSummary: 'Good governance draft',
      outcome: 'approved',
      createdAt: '2026-03-01T00:00:00.000Z',
    });

    const precedents = queryPrecedents(store, 'governance proposal', { limit: 5 });
    expect(precedents.length).toBeGreaterThanOrEqual(1);

    const delta = computePrecedentAdjustment(precedents);
    expect(delta).toBeGreaterThan(0);
  });
});
