import { afterEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  readSourcesFromYDoc,
  removeSourceFromYDoc,
  watchSourceChanges,
  writeSourceToYDoc,
} from '../sync-sources';
import { makeKnowledgeSource } from './fixtures';

function createTestDoc() {
  return new Y.Doc();
}

function syncTwoDocs(doc1: Y.Doc, doc2: Y.Doc) {
  const state1 = Y.encodeStateAsUpdate(doc1);
  const state2 = Y.encodeStateAsUpdate(doc2);
  Y.applyUpdate(doc1, state2);
  Y.applyUpdate(doc2, state1);
}

describe('source Yjs sync', () => {
  const docs: Y.Doc[] = [];

  afterEach(() => {
    for (const doc of docs) doc.destroy();
    docs.length = 0;
  });

  it('writes a source to Y.Map and reads it back', () => {
    const doc = createTestDoc();
    docs.push(doc);

    const source = makeKnowledgeSource({ id: 'sync-1', type: 'youtube', identifier: 'channel-1' });
    writeSourceToYDoc(doc, source);

    const sources = readSourcesFromYDoc(doc);
    expect(sources).toHaveLength(1);
    expect(sources[0].id).toBe('sync-1');
    expect(sources[0].type).toBe('youtube');
    expect(sources[0].identifier).toBe('channel-1');
  });

  it('concurrent add from two Y.Docs merges without data loss', () => {
    const doc1 = createTestDoc();
    const doc2 = createTestDoc();
    docs.push(doc1, doc2);

    const source1 = makeKnowledgeSource({ id: 'a', type: 'youtube' });
    const source2 = makeKnowledgeSource({ id: 'b', type: 'github' });

    writeSourceToYDoc(doc1, source1);
    writeSourceToYDoc(doc2, source2);

    syncTwoDocs(doc1, doc2);

    const fromDoc1 = readSourcesFromYDoc(doc1);
    const fromDoc2 = readSourcesFromYDoc(doc2);

    expect(fromDoc1).toHaveLength(2);
    expect(fromDoc2).toHaveLength(2);

    const ids1 = fromDoc1.map((s) => s.id).sort();
    const ids2 = fromDoc2.map((s) => s.id).sort();
    expect(ids1).toEqual(['a', 'b']);
    expect(ids2).toEqual(['a', 'b']);
  });

  it('remove propagates between two Y.Docs', () => {
    const doc1 = createTestDoc();
    const doc2 = createTestDoc();
    docs.push(doc1, doc2);

    const source = makeKnowledgeSource({ id: 'to-remove', type: 'rss' });
    writeSourceToYDoc(doc1, source);
    syncTwoDocs(doc1, doc2);

    expect(readSourcesFromYDoc(doc2)).toHaveLength(1);

    removeSourceFromYDoc(doc1, 'to-remove');
    syncTwoDocs(doc1, doc2);

    expect(readSourcesFromYDoc(doc2)).toHaveLength(0);
  });

  it('offline add syncs when Y.Docs reconnect', () => {
    const doc1 = createTestDoc();
    const doc2 = createTestDoc();
    docs.push(doc1, doc2);

    // Initial sync
    syncTwoDocs(doc1, doc2);

    // Both add offline
    const offlineSource1 = makeKnowledgeSource({ id: 'offline-1', type: 'npm' });
    const offlineSource2 = makeKnowledgeSource({ id: 'offline-2', type: 'reddit' });
    writeSourceToYDoc(doc1, offlineSource1);
    writeSourceToYDoc(doc2, offlineSource2);

    // Reconnect
    syncTwoDocs(doc1, doc2);

    const sources = readSourcesFromYDoc(doc1);
    expect(sources).toHaveLength(2);
    const ids = sources.map((s) => s.id).sort();
    expect(ids).toEqual(['offline-1', 'offline-2']);
  });

  it('watchSourceChanges fires callback on add', () => {
    const doc = createTestDoc();
    docs.push(doc);

    const events: string[] = [];
    const unsub = watchSourceChanges(doc, (sources) => {
      events.push(sources.map((s) => s.id).join(','));
    });

    const source = makeKnowledgeSource({ id: 'watch-1', type: 'wikipedia' });
    writeSourceToYDoc(doc, source);

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[events.length - 1]).toContain('watch-1');

    unsub();
  });
});
