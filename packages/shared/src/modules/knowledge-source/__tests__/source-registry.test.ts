import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCoopDb, type CoopDexie } from '../../storage/db';
import {
  createKnowledgeSource,
  listKnowledgeSources,
  removeKnowledgeSource,
  updateKnowledgeSourceMeta,
} from '../knowledge-source';
import {
  githubSource,
  makeKnowledgeSource,
  npmSource,
  rssSource,
  redditSource,
  youtubeSource,
  wikipediaSource,
} from './fixtures';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

let db: CoopDexie;

beforeEach(() => {
  db = createCoopDb(`test-ks-registry-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

/* ---------------------------------------------------------------------------
 * createKnowledgeSource
 * --------------------------------------------------------------------------- */

describe('createKnowledgeSource', () => {
  it('stores a youtube source with correct schema', async () => {
    const stored = await createKnowledgeSource(db, youtubeSource);
    expect(stored.id).toBe(youtubeSource.id);
    expect(stored.type).toBe('youtube');
    expect(stored.identifier).toBe(youtubeSource.identifier);
    expect(stored.coopId).toBe(youtubeSource.coopId);
    expect(stored.active).toBe(true);
    expect(stored.addedAt).toBeTruthy();

    const fetched = await db.knowledgeSources.get(stored.id);
    expect(fetched).toBeDefined();
    expect(fetched?.type).toBe('youtube');
  });

  it('stores a github source', async () => {
    const stored = await createKnowledgeSource(db, githubSource);
    expect(stored.type).toBe('github');
    expect(stored.identifier).toBe('greenpill-dev-guild/coop');
  });

  it('stores an rss source', async () => {
    const stored = await createKnowledgeSource(db, rssSource);
    expect(stored.type).toBe('rss');
  });

  it('stores a reddit source', async () => {
    const stored = await createKnowledgeSource(db, redditSource);
    expect(stored.type).toBe('reddit');
  });

  it('stores an npm source', async () => {
    const stored = await createKnowledgeSource(db, npmSource);
    expect(stored.type).toBe('npm');
  });

  it('stores a wikipedia source', async () => {
    const stored = await createKnowledgeSource(db, wikipediaSource);
    expect(stored.type).toBe('wikipedia');
    expect(stored.identifier).toBe('Ethereum');
  });

  it('rejects duplicate identifier for the same coop', async () => {
    await createKnowledgeSource(db, youtubeSource);
    await expect(createKnowledgeSource(db, youtubeSource)).rejects.toThrow(/duplicate/i);
  });

  it('allows same identifier for different coops', async () => {
    await createKnowledgeSource(db, youtubeSource);
    const otherCoopSource = { ...youtubeSource, id: 'ks-youtube-2', coopId: 'coop-other' };
    const stored = await createKnowledgeSource(db, otherCoopSource);
    expect(stored.coopId).toBe('coop-other');
  });
});

/* ---------------------------------------------------------------------------
 * removeKnowledgeSource
 * --------------------------------------------------------------------------- */

describe('removeKnowledgeSource', () => {
  it('deletes by id', async () => {
    await createKnowledgeSource(db, youtubeSource);
    await removeKnowledgeSource(db, youtubeSource.id);
    const fetched = await db.knowledgeSources.get(youtubeSource.id);
    expect(fetched).toBeUndefined();
  });

  it('is a no-op for non-existent id (no throw)', async () => {
    await expect(removeKnowledgeSource(db, 'nonexistent-id')).resolves.not.toThrow();
  });
});

/* ---------------------------------------------------------------------------
 * listKnowledgeSources
 * --------------------------------------------------------------------------- */

describe('listKnowledgeSources', () => {
  beforeEach(async () => {
    await createKnowledgeSource(db, youtubeSource);
    await createKnowledgeSource(db, githubSource);
    await createKnowledgeSource(db, rssSource);
    await createKnowledgeSource(
      db,
      makeKnowledgeSource({ type: 'npm', id: 'ks-npm-other', coopId: 'coop-other' }),
    );
    const inactiveSource = makeKnowledgeSource({
      type: 'reddit',
      id: 'ks-reddit-inactive',
      coopId: 'coop-test-1',
      active: false,
    });
    await createKnowledgeSource(db, inactiveSource);
  });

  it('returns all sources for a coopId', async () => {
    const sources = await listKnowledgeSources(db, { coopId: 'coop-test-1' });
    expect(sources.length).toBeGreaterThanOrEqual(4);
    expect(sources.every((s) => s.coopId === 'coop-test-1')).toBe(true);
  });

  it('filters by type', async () => {
    const sources = await listKnowledgeSources(db, { coopId: 'coop-test-1', type: 'youtube' });
    expect(sources.every((s) => s.type === 'youtube')).toBe(true);
    expect(sources.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by active status (true)', async () => {
    const sources = await listKnowledgeSources(db, { coopId: 'coop-test-1', active: true });
    expect(sources.every((s) => s.active)).toBe(true);
    // should NOT include the inactive reddit source
    expect(sources.find((s) => s.id === 'ks-reddit-inactive')).toBeUndefined();
  });

  it('filters by active status (false)', async () => {
    const sources = await listKnowledgeSources(db, { coopId: 'coop-test-1', active: false });
    expect(sources.every((s) => !s.active)).toBe(true);
    expect(sources.find((s) => s.id === 'ks-reddit-inactive')).toBeDefined();
  });

  it('returns empty array when coopId has no sources', async () => {
    const sources = await listKnowledgeSources(db, { coopId: 'coop-empty' });
    expect(sources).toEqual([]);
  });

  it('does not leak sources from other coops when filtering by coopId', async () => {
    const sources = await listKnowledgeSources(db, { coopId: 'coop-test-1' });
    expect(sources.find((s) => s.coopId === 'coop-other')).toBeUndefined();
  });
});

/* ---------------------------------------------------------------------------
 * updateKnowledgeSourceMeta
 * --------------------------------------------------------------------------- */

describe('updateKnowledgeSourceMeta', () => {
  it('updates lastFetchedAt and entityCount', async () => {
    await createKnowledgeSource(db, youtubeSource);
    const updated = await updateKnowledgeSourceMeta(db, youtubeSource.id, {
      lastFetchedAt: '2026-04-06T12:00:00.000Z',
      entityCount: 42,
    });
    expect(updated.lastFetchedAt).toBe('2026-04-06T12:00:00.000Z');
    expect(updated.entityCount).toBe(42);
  });

  it('only updates provided fields (partial update)', async () => {
    await createKnowledgeSource(db, youtubeSource);
    const updated = await updateKnowledgeSourceMeta(db, youtubeSource.id, {
      entityCount: 7,
    });
    expect(updated.entityCount).toBe(7);
    expect(updated.label).toBe(youtubeSource.label);
  });

  it('throws for non-existent id', async () => {
    await expect(
      updateKnowledgeSourceMeta(db, 'nonexistent', { entityCount: 1 }),
    ).rejects.toThrow();
  });
});
