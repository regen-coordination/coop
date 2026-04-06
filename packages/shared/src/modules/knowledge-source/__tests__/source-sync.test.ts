import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';
import {
  readSourcesFromYDoc,
  watchSourceChanges,
  writeSourceToYDoc,
} from '../sync-sources';
import { githubSource, youtubeSource, rssSource } from './fixtures';

/* ---------------------------------------------------------------------------
 * writeSourceToYDoc / readSourcesFromYDoc
 * --------------------------------------------------------------------------- */

describe('writeSourceToYDoc', () => {
  it('writes a source to Y.Map and can be read back', () => {
    const doc = new Y.Doc();
    writeSourceToYDoc(doc, youtubeSource);

    const sources = readSourcesFromYDoc(doc);
    expect(sources).toHaveLength(1);
    expect(sources[0].id).toBe(youtubeSource.id);
    expect(sources[0].type).toBe('youtube');
    expect(sources[0].identifier).toBe(youtubeSource.identifier);
  });

  it('reads back correct data for multiple sources', () => {
    const doc = new Y.Doc();
    writeSourceToYDoc(doc, youtubeSource);
    writeSourceToYDoc(doc, githubSource);
    writeSourceToYDoc(doc, rssSource);

    const sources = readSourcesFromYDoc(doc);
    expect(sources).toHaveLength(3);
    const ids = sources.map((s) => s.id);
    expect(ids).toContain(youtubeSource.id);
    expect(ids).toContain(githubSource.id);
    expect(ids).toContain(rssSource.id);
  });

  it('overwrites existing entry for same id', () => {
    const doc = new Y.Doc();
    writeSourceToYDoc(doc, youtubeSource);
    const updated = { ...youtubeSource, label: 'Updated Label' };
    writeSourceToYDoc(doc, updated);

    const sources = readSourcesFromYDoc(doc);
    expect(sources).toHaveLength(1);
    expect(sources[0].label).toBe('Updated Label');
  });
});

describe('readSourcesFromYDoc', () => {
  it('returns empty array for empty doc', () => {
    const doc = new Y.Doc();
    expect(readSourcesFromYDoc(doc)).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------
 * Concurrent add from two Y.Docs merges without data loss
 * --------------------------------------------------------------------------- */

describe('concurrent add merge', () => {
  it('merges two independently-added sources without data loss', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    writeSourceToYDoc(doc1, youtubeSource);
    writeSourceToYDoc(doc2, githubSource);

    // Exchange state vectors to simulate sync
    const state1 = Y.encodeStateAsUpdate(doc1);
    const state2 = Y.encodeStateAsUpdate(doc2);
    Y.applyUpdate(doc1, state2);
    Y.applyUpdate(doc2, state1);

    const sources1 = readSourcesFromYDoc(doc1);
    const sources2 = readSourcesFromYDoc(doc2);

    expect(sources1).toHaveLength(2);
    expect(sources2).toHaveLength(2);

    const ids1 = sources1.map((s) => s.id);
    expect(ids1).toContain(youtubeSource.id);
    expect(ids1).toContain(githubSource.id);
  });
});

/* ---------------------------------------------------------------------------
 * Remove propagates between two Y.Docs
 * --------------------------------------------------------------------------- */

describe('remove propagation', () => {
  it('propagates remove between two Y.Docs', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    // Both docs start with the same source
    writeSourceToYDoc(doc1, youtubeSource);
    const initialState = Y.encodeStateAsUpdate(doc1);
    Y.applyUpdate(doc2, initialState);

    expect(readSourcesFromYDoc(doc2)).toHaveLength(1);

    // Remove from doc1 by deleting from Y.Map
    const map = doc1.getMap<string>('knowledge-sources-v1');
    map.delete(youtubeSource.id);

    // Sync the removal to doc2
    const removeUpdate = Y.encodeStateAsUpdate(doc1);
    Y.applyUpdate(doc2, removeUpdate);

    expect(readSourcesFromYDoc(doc2)).toHaveLength(0);
  });
});

/* ---------------------------------------------------------------------------
 * Offline add syncs when Y.Docs reconnect
 * --------------------------------------------------------------------------- */

describe('offline sync', () => {
  it('offline-added source syncs when docs reconnect', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    // Initial sync
    writeSourceToYDoc(doc1, youtubeSource);
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2));

    // doc2 goes "offline" and adds a source
    writeSourceToYDoc(doc2, githubSource);

    // doc1 adds a source independently
    writeSourceToYDoc(doc1, rssSource);

    // Both are "back online" — exchange state
    const sv1 = Y.encodeStateVector(doc1);
    const sv2 = Y.encodeStateVector(doc2);
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2, sv1));
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1, sv2));

    const sources1 = readSourcesFromYDoc(doc1);
    const sources2 = readSourcesFromYDoc(doc2);

    // Both docs converge with all 3 sources
    expect(sources1).toHaveLength(3);
    expect(sources2).toHaveLength(3);
  });
});

/* ---------------------------------------------------------------------------
 * watchSourceChanges
 * --------------------------------------------------------------------------- */

describe('watchSourceChanges', () => {
  it('calls callback when a source is added', () => {
    const doc = new Y.Doc();
    const received: unknown[] = [];

    watchSourceChanges(doc, (sources) => {
      received.push(...sources);
    });

    writeSourceToYDoc(doc, youtubeSource);

    expect(received.length).toBeGreaterThan(0);
  });
});
