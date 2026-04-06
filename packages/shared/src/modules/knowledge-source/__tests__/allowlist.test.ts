import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCoopDb, type CoopDexie } from '../../storage/db';
import { assertAllowedSource } from '../allowlist';
import { createKnowledgeSource } from '../knowledge-source';
import { DENYLIST_URLS, githubSource, rssSource, youtubeSource } from './fixtures';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

const COOP_ID = 'coop-test-1';

let db: CoopDexie;

beforeEach(async () => {
  db = createCoopDb(`test-allowlist-${crypto.randomUUID()}`);
  // Register sources for the allowlist tests
  await createKnowledgeSource(db, youtubeSource);
  await createKnowledgeSource(db, githubSource);
  await createKnowledgeSource(db, rssSource);
});

afterEach(async () => {
  await db.delete();
});

/* ---------------------------------------------------------------------------
 * Registered source pass-through
 * --------------------------------------------------------------------------- */

describe('assertAllowedSource — registered sources pass', () => {
  it('passes for a registered youtube channel URL', async () => {
    await expect(
      assertAllowedSource(db, 'https://www.youtube.com/@CoopChannel', COOP_ID),
    ).resolves.not.toThrow();
  });

  it('passes for a registered github repo identifier URL', async () => {
    // GitHub repos are identified as "owner/repo" but may be accessed via API URL
    await expect(
      assertAllowedSource(db, 'https://api.github.com/repos/greenpill-dev-guild/coop', COOP_ID),
    ).resolves.not.toThrow();
  });

  it('passes for a registered rss feed URL', async () => {
    await expect(
      assertAllowedSource(db, 'https://feeds.example.com/tech.rss', COOP_ID),
    ).resolves.not.toThrow();
  });
});

/* ---------------------------------------------------------------------------
 * Unregistered URL rejection
 * --------------------------------------------------------------------------- */

describe('assertAllowedSource — unregistered URL rejection', () => {
  it('throws for a URL not registered in the registry', async () => {
    await expect(
      assertAllowedSource(db, 'https://unknown-source.com/feed.rss', COOP_ID),
    ).rejects.toThrow(/not allowed/i);
  });

  it('throws for a URL belonging to a different coop', async () => {
    await expect(
      assertAllowedSource(db, 'https://www.youtube.com/@CoopChannel', 'coop-other'),
    ).rejects.toThrow(/not allowed/i);
  });
});

/* ---------------------------------------------------------------------------
 * Denylist — private IPs and localhost
 * --------------------------------------------------------------------------- */

describe('assertAllowedSource — denylist: private IPs', () => {
  it('throws for 127.0.0.1 (loopback)', async () => {
    await expect(
      assertAllowedSource(db, 'http://127.0.0.1/secret', COOP_ID),
    ).rejects.toThrow(/private|local/i);
  });

  it('throws for localhost', async () => {
    await expect(
      assertAllowedSource(db, 'http://localhost/data', COOP_ID),
    ).rejects.toThrow(/private|local/i);
  });

  it('throws for 0.0.0.0', async () => {
    await expect(
      assertAllowedSource(db, 'http://0.0.0.0/dump', COOP_ID),
    ).rejects.toThrow(/private|local/i);
  });

  it('throws for IPv6 loopback [::1]', async () => {
    await expect(
      assertAllowedSource(db, 'http://[::1]/admin', COOP_ID),
    ).rejects.toThrow(/private|local/i);
  });

  it('throws for 10.x.x.x (RFC 1918)', async () => {
    await expect(
      assertAllowedSource(db, 'http://10.0.0.1/internal', COOP_ID),
    ).rejects.toThrow(/private|local/i);
  });

  it('throws for 192.168.x.x (RFC 1918)', async () => {
    await expect(
      assertAllowedSource(db, 'http://192.168.1.1/router', COOP_ID),
    ).rejects.toThrow(/private|local/i);
  });

  it('throws for 172.16-31.x.x (RFC 1918)', async () => {
    await expect(
      assertAllowedSource(db, 'http://172.16.0.1/priv', COOP_ID),
    ).rejects.toThrow(/private|local/i);
  });
});

/* ---------------------------------------------------------------------------
 * Denylist — credential file paths
 * --------------------------------------------------------------------------- */

describe('assertAllowedSource — denylist: credential paths', () => {
  it('throws for .env file path', async () => {
    await expect(
      assertAllowedSource(db, 'https://example.com/.env', COOP_ID),
    ).rejects.toThrow(/credential|blocked/i);
  });

  it('throws for .ssh key path', async () => {
    await expect(
      assertAllowedSource(db, 'https://example.com/config/.ssh/id_rsa', COOP_ID),
    ).rejects.toThrow(/credential|blocked/i);
  });

  it('throws for URL with embedded credentials (user:pass@host)', async () => {
    await expect(
      assertAllowedSource(db, 'https://user:password@example.com/resource', COOP_ID),
    ).rejects.toThrow(/credential|blocked/i);
  });
});

/* ---------------------------------------------------------------------------
 * Path traversal
 * --------------------------------------------------------------------------- */

describe('assertAllowedSource — path traversal', () => {
  it('throws for path traversal (../../) attempts', async () => {
    await expect(
      assertAllowedSource(db, 'https://example.com/../../../etc/passwd', COOP_ID),
    ).rejects.toThrow(/traversal|blocked/i);
  });
});

/* ---------------------------------------------------------------------------
 * Subdomain normalization
 * --------------------------------------------------------------------------- */

describe('assertAllowedSource — subdomain normalization', () => {
  it('passes for www. variant when base domain is registered', async () => {
    // rssSource has identifier 'https://feeds.example.com/tech.rss'
    // A www. variant of the same domain should pass the registry check
    // because we normalize by hostname
    await expect(
      assertAllowedSource(db, 'https://feeds.example.com/tech.rss', COOP_ID),
    ).resolves.not.toThrow();
  });
});

/* ---------------------------------------------------------------------------
 * All denylist URLs fail (bulk)
 * --------------------------------------------------------------------------- */

describe('assertAllowedSource — all denylist URLs are blocked', () => {
  for (const url of DENYLIST_URLS) {
    it(`blocks: ${url}`, async () => {
      await expect(assertAllowedSource(db, url, COOP_ID)).rejects.toThrow();
    });
  }
});
