import { afterEach, describe, expect, it } from 'vitest';
import type { CoopArchiveSecrets } from '../../../contracts/schema';
import {
  type CoopDexie,
  createCoopDb,
  getCoopArchiveSecrets,
  removeCoopArchiveSecrets,
  setCoopArchiveSecrets,
} from '../db';

const databases: CoopDexie[] = [];
const STORAGE_CRYPTO_TEST_TIMEOUT_MS = 20_000;

function freshDb(): CoopDexie {
  const db = createCoopDb(`coop-secrets-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

afterEach(async () => {
  for (const db of databases) {
    db.close();
    await db.delete();
  }
  databases.length = 0;
});

describe('coop archive secrets persistence', () => {
  it(
    'saves and retrieves secrets by coopId',
    async () => {
      const db = freshDb();
      const secrets: CoopArchiveSecrets = {
        coopId: 'coop-abc',
        agentPrivateKey: 'MgCY...key',
        spaceDelegation: 'delegation-proof-abc',
        proofs: ['proof-1'],
      };

      await setCoopArchiveSecrets(db, 'coop-abc', secrets);
      const loaded = await getCoopArchiveSecrets(db, 'coop-abc');
      const plaintextSetting = await db.settings.get('archive-secrets:coop-abc');
      const encryptedPayload = await db.encryptedLocalPayloads.get('archive-secrets:coop-abc');

      expect(loaded).not.toBeNull();
      expect(loaded?.coopId).toBe('coop-abc');
      expect(loaded?.agentPrivateKey).toBe('MgCY...key');
      expect(loaded?.spaceDelegation).toBe('delegation-proof-abc');
      expect(loaded?.proofs).toEqual(['proof-1']);
      expect(plaintextSetting).toBeUndefined();
      expect(encryptedPayload).toBeDefined();
      expect(encryptedPayload?.ciphertext).not.toContain('delegation-proof-abc');
    },
    STORAGE_CRYPTO_TEST_TIMEOUT_MS,
  );

  it(
    'returns null when no secrets exist for a coopId',
    async () => {
      const db = freshDb();
      const loaded = await getCoopArchiveSecrets(db, 'coop-nonexistent');
      expect(loaded).toBeNull();
    },
    STORAGE_CRYPTO_TEST_TIMEOUT_MS,
  );

  it(
    'isolates secrets by coopId',
    async () => {
      const db = freshDb();

      await setCoopArchiveSecrets(db, 'coop-1', {
        coopId: 'coop-1',
        spaceDelegation: 'delegation-1',
        proofs: [],
      });
      await setCoopArchiveSecrets(db, 'coop-2', {
        coopId: 'coop-2',
        agentPrivateKey: 'key-2',
        spaceDelegation: 'delegation-2',
        proofs: ['p2'],
      });

      const s1 = await getCoopArchiveSecrets(db, 'coop-1');
      const s2 = await getCoopArchiveSecrets(db, 'coop-2');

      expect(s1?.spaceDelegation).toBe('delegation-1');
      expect(s2?.spaceDelegation).toBe('delegation-2');
      expect(s2?.agentPrivateKey).toBe('key-2');
    },
    STORAGE_CRYPTO_TEST_TIMEOUT_MS,
  );

  it(
    'removes secrets for a specific coopId',
    async () => {
      const db = freshDb();

      await setCoopArchiveSecrets(db, 'coop-remove', {
        coopId: 'coop-remove',
        spaceDelegation: 'delegation-remove',
        proofs: [],
      });

      expect(await getCoopArchiveSecrets(db, 'coop-remove')).not.toBeNull();

      await removeCoopArchiveSecrets(db, 'coop-remove');

      expect(await getCoopArchiveSecrets(db, 'coop-remove')).toBeNull();
      expect(await db.settings.get('archive-secrets:coop-remove')).toBeUndefined();
      expect(await db.encryptedLocalPayloads.get('archive-secrets:coop-remove')).toBeUndefined();
    },
    STORAGE_CRYPTO_TEST_TIMEOUT_MS,
  );

  it(
    'remove is a no-op for nonexistent coopId',
    async () => {
      const db = freshDb();
      // Should not throw
      await removeCoopArchiveSecrets(db, 'coop-nonexistent');
    },
    STORAGE_CRYPTO_TEST_TIMEOUT_MS,
  );

  it(
    'returns null when stored value does not match schema',
    async () => {
      const db = freshDb();
      await db.settings.put({
        key: 'archive-secrets:coop-corrupt',
        value: { corrupt: true },
      });

      const loaded = await getCoopArchiveSecrets(db, 'coop-corrupt');
      expect(loaded).toBeNull();
    },
    STORAGE_CRYPTO_TEST_TIMEOUT_MS,
  );

  it(
    'migrates legacy plaintext settings into encrypted local payload storage on read',
    async () => {
      const db = freshDb();
      await db.settings.put({
        key: 'archive-secrets:coop-legacy',
        value: {
          spaceDelegation: 'legacy-delegation',
          proofs: ['legacy-proof'],
        },
      });

      const loaded = await getCoopArchiveSecrets(db, 'coop-legacy');

      expect(loaded).toEqual({
        coopId: 'coop-legacy',
        spaceDelegation: 'legacy-delegation',
        proofs: ['legacy-proof'],
      });
      expect(await db.settings.get('archive-secrets:coop-legacy')).toBeUndefined();
      expect(await db.encryptedLocalPayloads.get('archive-secrets:coop-legacy')).toBeDefined();
    },
    STORAGE_CRYPTO_TEST_TIMEOUT_MS,
  );

  it(
    'overwrites existing secrets on re-set',
    async () => {
      const db = freshDb();

      await setCoopArchiveSecrets(db, 'coop-update', {
        coopId: 'coop-update',
        spaceDelegation: 'old-delegation',
        proofs: [],
      });

      await setCoopArchiveSecrets(db, 'coop-update', {
        coopId: 'coop-update',
        agentPrivateKey: 'new-key',
        spaceDelegation: 'new-delegation',
        proofs: ['new-proof'],
      });

      const loaded = await getCoopArchiveSecrets(db, 'coop-update');
      expect(loaded?.spaceDelegation).toBe('new-delegation');
      expect(loaded?.agentPrivateKey).toBe('new-key');
      expect(loaded?.proofs).toEqual(['new-proof']);
    },
    STORAGE_CRYPTO_TEST_TIMEOUT_MS,
  );
});
