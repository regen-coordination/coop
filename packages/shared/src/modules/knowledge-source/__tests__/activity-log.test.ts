import { afterEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { appendLogEntry, getRecentLog } from '../activity-log';

function createTestDoc() {
  return new Y.Doc();
}

function syncTwoDocs(doc1: Y.Doc, doc2: Y.Doc) {
  const state1 = Y.encodeStateAsUpdate(doc1);
  const state2 = Y.encodeStateAsUpdate(doc2);
  Y.applyUpdate(doc1, state2);
  Y.applyUpdate(doc2, state1);
}

describe('activity log', () => {
  const docs: Y.Doc[] = [];

  afterEach(() => {
    for (const doc of docs) doc.destroy();
    docs.length = 0;
  });

  it('appendLogEntry writes ingest entry', () => {
    const doc = createTestDoc();
    docs.push(doc);

    appendLogEntry(doc, {
      type: 'ingest',
      timestamp: '2026-04-01T00:00:00.000Z',
      summary: 'Ingested 5 articles from RSS feed',
      sourceId: 'ks-rss-1',
      entityCount: 12,
    });

    const entries = getRecentLog(doc, 10);
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe('ingest');
    expect(entries[0].sourceId).toBe('ks-rss-1');
  });

  it('appendLogEntry writes query entry with sourceId', () => {
    const doc = createTestDoc();
    docs.push(doc);

    appendLogEntry(doc, {
      type: 'query',
      timestamp: '2026-04-01T01:00:00.000Z',
      summary: 'Queried graph for Ethereum entities',
      sourceId: 'ks-yt-1',
    });

    const entries = getRecentLog(doc, 10);
    expect(entries[0].type).toBe('query');
  });

  it('appendLogEntry writes lint entry with health summary', () => {
    const doc = createTestDoc();
    docs.push(doc);

    appendLogEntry(doc, {
      type: 'lint',
      timestamp: '2026-04-01T02:00:00.000Z',
      summary: '2 orphan entities, 1 stale source',
    });

    const entries = getRecentLog(doc, 10);
    expect(entries[0].type).toBe('lint');
    expect(entries[0].summary).toContain('orphan');
  });

  it('appendLogEntry writes approval entry with traceId', () => {
    const doc = createTestDoc();
    docs.push(doc);

    appendLogEntry(doc, {
      type: 'approval',
      timestamp: '2026-04-01T03:00:00.000Z',
      summary: 'Draft approved: Safe integration',
      traceId: 'trace-1',
    });

    const entries = getRecentLog(doc, 10);
    expect(entries[0].traceId).toBe('trace-1');
  });

  it('getRecentLog returns entries in reverse chronological order', () => {
    const doc = createTestDoc();
    docs.push(doc);

    appendLogEntry(doc, {
      type: 'ingest',
      timestamp: '2026-04-01T00:00:00.000Z',
      summary: 'First',
    });
    appendLogEntry(doc, {
      type: 'query',
      timestamp: '2026-04-01T01:00:00.000Z',
      summary: 'Second',
    });
    appendLogEntry(doc, {
      type: 'lint',
      timestamp: '2026-04-01T02:00:00.000Z',
      summary: 'Third',
    });

    const entries = getRecentLog(doc, 10);
    expect(entries[0].summary).toBe('Third');
    expect(entries[1].summary).toBe('Second');
    expect(entries[2].summary).toBe('First');
  });

  it('getRecentLog respects limit', () => {
    const doc = createTestDoc();
    docs.push(doc);

    for (let i = 0; i < 10; i++) {
      appendLogEntry(doc, {
        type: 'ingest',
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        summary: `Entry ${i}`,
      });
    }

    const entries = getRecentLog(doc, 3);
    expect(entries).toHaveLength(3);
  });

  it('log entries sync between two Y.Docs', () => {
    const doc1 = createTestDoc();
    const doc2 = createTestDoc();
    docs.push(doc1, doc2);

    appendLogEntry(doc1, {
      type: 'ingest',
      timestamp: '2026-04-01T00:00:00.000Z',
      summary: 'From doc1',
    });

    syncTwoDocs(doc1, doc2);

    const entries = getRecentLog(doc2, 10);
    expect(entries).toHaveLength(1);
    expect(entries[0].summary).toBe('From doc1');
  });
});
