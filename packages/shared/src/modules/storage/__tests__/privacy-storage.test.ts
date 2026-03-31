import { afterEach, describe, expect, it } from 'vitest';
import type { PrivacyIdentityRecord, StealthKeyPairRecord } from '../../../contracts/schema';
import {
  type CoopDexie,
  createCoopDb,
  getEncryptedLocalPayloadRecord,
  getPrivacyIdentitiesForCoop,
  getPrivacyIdentity,
  getStealthKeyPair,
  savePrivacyIdentity,
  saveStealthKeyPair,
} from '../db';

const databases: CoopDexie[] = [];

function freshDb(): CoopDexie {
  const db = createCoopDb(`coop-privacy-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

const NOW = '2026-03-14T12:00:00.000Z';

afterEach(async () => {
  for (const db of databases) {
    db.close();
    await db.delete();
  }
  databases.length = 0;
});

describe('privacy identity storage', () => {
  const record: PrivacyIdentityRecord = {
    id: 'privacy-id-1',
    coopId: 'coop-1',
    memberId: 'member-1',
    commitment: '12345678901234567890',
    publicKey: ['pub-x-123', 'pub-y-456'],
    exportedPrivateKey: 'exported-priv-key-abc',
    createdAt: NOW,
  };

  it('saves and retrieves a privacy identity by coopId + memberId', async () => {
    const db = freshDb();
    await savePrivacyIdentity(db, record);
    const result = await getPrivacyIdentity(db, 'coop-1', 'member-1');
    expect(result).toEqual(record);
  });

  it('returns undefined when no identity exists', async () => {
    const db = freshDb();
    const result = await getPrivacyIdentity(db, 'coop-999', 'member-999');
    expect(result).toBeUndefined();
  });

  it('lists all identities for a coop', async () => {
    const db = freshDb();
    const record2: PrivacyIdentityRecord = {
      ...record,
      id: 'privacy-id-2',
      memberId: 'member-2',
      commitment: '99988877766655544433',
      exportedPrivateKey: 'exported-priv-key-def',
    };
    await savePrivacyIdentity(db, record);
    await savePrivacyIdentity(db, record2);
    const results = await getPrivacyIdentitiesForCoop(db, 'coop-1');
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.memberId).sort()).toEqual(['member-1', 'member-2']);
  });

  it('overwrites an existing identity on duplicate put', async () => {
    const db = freshDb();
    await savePrivacyIdentity(db, record);
    const updated = { ...record, commitment: 'new-commitment-value' };
    await savePrivacyIdentity(db, updated);
    const result = await getPrivacyIdentity(db, 'coop-1', 'member-1');
    expect(result?.commitment).toBe('new-commitment-value');
  });

  it('stores the private key in encrypted local payload storage and leaves only a redacted row', async () => {
    const db = freshDb();
    await savePrivacyIdentity(db, record);

    const rawRecord = await db.privacyIdentities.get(record.id);
    expect(rawRecord?.commitment).toBe(record.commitment);
    expect(rawRecord?.exportedPrivateKey).toContain('encrypted://local/privacy-identity/');

    const payload = await getEncryptedLocalPayloadRecord(db, 'privacy-identity', record.id);
    expect(payload?.entityId).toBe(record.id);

    const hydrated = await getPrivacyIdentity(db, 'coop-1', 'member-1');
    expect(hydrated).toEqual(record);
  });
});

describe('stealth key pair storage', () => {
  const keyPair: StealthKeyPairRecord = {
    id: 'stealth-kp-1',
    coopId: 'coop-1',
    spendingKey: 'spending-key-abc',
    viewingKey: 'viewing-key-def',
    spendingPublicKey: 'spending-pub-abc',
    viewingPublicKey: 'viewing-pub-def',
    metaAddress: 'st:eth:0xabc123def456',
    createdAt: NOW,
  };

  it('saves and retrieves a stealth key pair by coopId', async () => {
    const db = freshDb();
    await saveStealthKeyPair(db, keyPair);
    const result = await getStealthKeyPair(db, 'coop-1');
    expect(result).toEqual(keyPair);
  });

  it('returns undefined when no key pair exists', async () => {
    const db = freshDb();
    const result = await getStealthKeyPair(db, 'coop-999');
    expect(result).toBeUndefined();
  });

  it('overwrites an existing key pair on duplicate put', async () => {
    const db = freshDb();
    await saveStealthKeyPair(db, keyPair);
    const updated = { ...keyPair, metaAddress: 'st:eth:0xnewmeta' };
    await saveStealthKeyPair(db, updated);
    const result = await getStealthKeyPair(db, 'coop-1');
    expect(result?.metaAddress).toBe('st:eth:0xnewmeta');
  });

  it('stores stealth private keys in encrypted local payload storage and leaves only public metadata in the row', async () => {
    const db = freshDb();
    await saveStealthKeyPair(db, keyPair);

    const rawRecord = await db.stealthKeyPairs.get(keyPair.id);
    expect(rawRecord?.metaAddress).toBe(keyPair.metaAddress);
    expect(rawRecord?.spendingKey).toContain('encrypted://local/stealth-key-pair/');
    expect(rawRecord?.viewingKey).toContain('encrypted://local/stealth-key-pair/');

    const payload = await getEncryptedLocalPayloadRecord(db, 'stealth-key-pair', keyPair.id);
    expect(payload?.entityId).toBe(keyPair.id);

    const hydrated = await getStealthKeyPair(db, 'coop-1');
    expect(hydrated).toEqual(keyPair);
  });
});
