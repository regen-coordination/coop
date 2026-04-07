import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type CoopDexie, createCoopDb } from '../../storage/db';
import { assertAllowedSource } from '../allowlist';
import { createKnowledgeSource } from '../knowledge-source';
import { DENYLIST_URLS } from './fixtures';

let db: CoopDexie;

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

beforeEach(async () => {
  db = createCoopDb(`test-ks-allowlist-${crypto.randomUUID()}`);
  // Register a few sources to serve as the allowlist
  await createKnowledgeSource(db, {
    type: 'youtube',
    identifier: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    label: 'Google Developers',
    coopId: 'coop-1',
    addedBy: 'member-1',
  });
  await createKnowledgeSource(db, {
    type: 'github',
    identifier: 'anthropics/claude-code',
    label: 'Claude Code',
    coopId: 'coop-1',
    addedBy: 'member-1',
  });
  await createKnowledgeSource(db, {
    type: 'rss',
    identifier: 'https://blog.example.com/feed.xml',
    label: 'Example Blog',
    coopId: 'coop-1',
    addedBy: 'member-1',
  });
});

afterEach(async () => {
  await db.delete();
});

describe('assertAllowedSource', () => {
  it('passes for registered youtube channel', async () => {
    await expect(
      assertAllowedSource(
        db,
        'https://youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw',
        'youtube',
        'coop-1',
      ),
    ).resolves.not.toThrow();
  });

  it('passes for registered github repo', async () => {
    await expect(
      assertAllowedSource(db, 'https://github.com/anthropics/claude-code', 'github', 'coop-1'),
    ).resolves.not.toThrow();
  });

  it('passes for registered rss feed URL', async () => {
    await expect(
      assertAllowedSource(db, 'https://blog.example.com/feed.xml', 'rss', 'coop-1'),
    ).resolves.not.toThrow();
  });

  it('throws for unregistered URL', async () => {
    await expect(
      assertAllowedSource(db, 'https://unknown.com/feed.xml', 'rss', 'coop-1'),
    ).rejects.toThrow(/not registered/i);
  });

  it('throws for private IP 127.0.0.1', async () => {
    await expect(
      assertAllowedSource(db, 'http://127.0.0.1/secret', 'rss', 'coop-1'),
    ).rejects.toThrow(/private|local/i);
  });

  it('throws for private IP 10.x range', async () => {
    await expect(
      assertAllowedSource(db, 'http://10.0.0.1/internal', 'rss', 'coop-1'),
    ).rejects.toThrow(/private|local/i);
  });

  it('throws for private IP 192.168.x range', async () => {
    await expect(
      assertAllowedSource(db, 'http://192.168.1.1/config', 'rss', 'coop-1'),
    ).rejects.toThrow(/private|local/i);
  });

  it('throws for localhost variants', async () => {
    await expect(
      assertAllowedSource(db, 'http://localhost/admin', 'rss', 'coop-1'),
    ).rejects.toThrow(/private|local/i);

    await expect(assertAllowedSource(db, 'http://0.0.0.0/admin', 'rss', 'coop-1')).rejects.toThrow(
      /private|local/i,
    );
  });

  it('throws for credential file paths (.env, .ssh)', async () => {
    await expect(
      assertAllowedSource(db, 'https://example.com/.env', 'rss', 'coop-1'),
    ).rejects.toThrow(/credential|sensitive/i);

    await expect(
      assertAllowedSource(db, 'https://example.com/.ssh/id_rsa', 'rss', 'coop-1'),
    ).rejects.toThrow(/credential|sensitive/i);
  });

  it('handles path traversal attempts', async () => {
    await expect(
      assertAllowedSource(db, 'https://example.com/../../etc/passwd', 'rss', 'coop-1'),
    ).rejects.toThrow(/traversal|invalid/i);
  });

  it('handles subdomain normalization for github', async () => {
    // www.github.com should still match github.com/anthropics/claude-code
    await expect(
      assertAllowedSource(db, 'https://www.github.com/anthropics/claude-code', 'github', 'coop-1'),
    ).resolves.not.toThrow();
  });
});
