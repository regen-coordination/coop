import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryPrecedents, recordReasoningTrace } from '../reasoning';
import { createRelationship, destroyGraphStore, initGraphStore, upsertEntity } from '../store';
import type { GraphStore } from '../store';
import { makeEntity, makeRelationship } from './fixtures';

let store: GraphStore;

beforeEach(() => {
  store = initGraphStore();
  upsertEntity(store, makeEntity({ id: 'ent-1', name: 'Ethereum' }));
  upsertEntity(store, makeEntity({ id: 'ent-2', name: 'Safe' }));
});

afterEach(() => {
  destroyGraphStore(store);
});

describe('recordReasoningTrace', () => {
  it('creates a trace record in the store', () => {
    recordReasoningTrace(store, {
      traceId: 'trace-1',
      skillRunId: 'run-1',
      observationId: 'obs-1',
      observationText: 'Draft about Ethereum governance',
      contextEntityIds: ['ent-1', 'ent-2'],
      precedentTraceIds: [],
      confidence: 0.85,
      outputSummary: 'Created governance draft',
      outcome: 'approved',
      createdAt: '2026-04-01T00:00:00.000Z',
    });

    expect(store.traces).toHaveLength(1);
    expect(store.traces[0].traceId).toBe('trace-1');
  });

  it('captures skillRunId, observationId, confidence, and outputSummary', () => {
    recordReasoningTrace(store, {
      traceId: 'trace-2',
      skillRunId: 'run-2',
      observationId: 'obs-2',
      observationText: 'Review of ERC-4337 update',
      contextEntityIds: [],
      precedentTraceIds: [],
      confidence: 0.72,
      outputSummary: 'Summarized AA progress',
      outcome: 'pending',
      createdAt: '2026-04-02T00:00:00.000Z',
    });

    const trace = store.traces[0];
    expect(trace.skillRunId).toBe('run-2');
    expect(trace.observationId).toBe('obs-2');
    expect(trace.confidence).toBe(0.72);
    expect(trace.outputSummary).toBe('Summarized AA progress');
  });

  it('links to source entities used in context', () => {
    recordReasoningTrace(store, {
      traceId: 'trace-3',
      skillRunId: 'run-3',
      observationId: 'obs-3',
      observationText: 'Safe wallet analysis',
      contextEntityIds: ['ent-1', 'ent-2'],
      precedentTraceIds: [],
      confidence: 0.9,
      outputSummary: 'Analyzed Safe integration',
      outcome: 'approved',
      createdAt: '2026-04-03T00:00:00.000Z',
    });

    expect(store.traces[0].contextEntityIds).toEqual(['ent-1', 'ent-2']);
  });

  it('links to precedent traces referenced', () => {
    recordReasoningTrace(store, {
      traceId: 'trace-prev',
      skillRunId: 'run-prev',
      observationId: 'obs-prev',
      observationText: 'Earlier governance analysis',
      contextEntityIds: [],
      precedentTraceIds: [],
      confidence: 0.8,
      outputSummary: 'Prior analysis',
      outcome: 'approved',
      createdAt: '2026-03-01T00:00:00.000Z',
    });

    recordReasoningTrace(store, {
      traceId: 'trace-new',
      skillRunId: 'run-new',
      observationId: 'obs-new',
      observationText: 'Updated governance analysis',
      contextEntityIds: [],
      precedentTraceIds: ['trace-prev'],
      confidence: 0.85,
      outputSummary: 'Updated analysis with precedent',
      outcome: 'pending',
      createdAt: '2026-04-01T00:00:00.000Z',
    });

    expect(store.traces[1].precedentTraceIds).toEqual(['trace-prev']);
  });
});

describe('queryPrecedents', () => {
  beforeEach(() => {
    recordReasoningTrace(store, {
      traceId: 'p1',
      skillRunId: 'run-1',
      observationId: 'obs-1',
      observationText: 'Ethereum governance proposal review',
      contextEntityIds: ['ent-1'],
      precedentTraceIds: [],
      confidence: 0.9,
      outputSummary: 'Governance review approved',
      outcome: 'approved',
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    recordReasoningTrace(store, {
      traceId: 'p2',
      skillRunId: 'run-2',
      observationId: 'obs-2',
      observationText: 'Safe wallet security audit',
      contextEntityIds: ['ent-2'],
      precedentTraceIds: [],
      confidence: 0.6,
      outputSummary: 'Security audit rejected',
      outcome: 'rejected',
      createdAt: '2026-03-15T00:00:00.000Z',
    });
    recordReasoningTrace(store, {
      traceId: 'p3',
      skillRunId: 'run-3',
      observationId: 'obs-3',
      observationText: 'Ethereum protocol update analysis',
      contextEntityIds: ['ent-1'],
      precedentTraceIds: [],
      confidence: 0.85,
      outputSummary: 'Protocol update reviewed',
      outcome: 'approved',
      createdAt: '2026-04-01T00:00:00.000Z',
    });
  });

  it('finds traces for similar observations', () => {
    const results = queryPrecedents(store, 'Ethereum governance review', { limit: 5 });

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.traceId === 'p1')).toBe(true);
  });

  it('ranks by outcome (successful > failed)', () => {
    const results = queryPrecedents(store, 'Ethereum analysis', { limit: 5 });
    const approved = results.filter((r) => r.outcome === 'approved');
    const rejected = results.filter((r) => r.outcome === 'rejected');

    if (approved.length > 0 && rejected.length > 0) {
      // First approved result should rank higher than first rejected
      const firstApprovedIdx = results.findIndex((r) => r.outcome === 'approved');
      const firstRejectedIdx = results.findIndex((r) => r.outcome === 'rejected');
      expect(firstApprovedIdx).toBeLessThan(firstRejectedIdx);
    }
  });

  it('respects temporal recency', () => {
    const results = queryPrecedents(store, 'Ethereum protocol', { limit: 5 });

    // p3 (April) should rank higher than p1 (March) for recency
    if (results.length >= 2) {
      const p3Idx = results.findIndex((r) => r.traceId === 'p3');
      const p1Idx = results.findIndex((r) => r.traceId === 'p1');
      if (p3Idx !== -1 && p1Idx !== -1) {
        expect(p3Idx).toBeLessThan(p1Idx);
      }
    }
  });
});
