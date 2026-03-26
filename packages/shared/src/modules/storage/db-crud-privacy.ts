import type { PrivacyIdentityRecord, StealthKeyPairRecord } from '../../contracts/schema';
import type { CoopDexie } from './db-schema';

// --- Privacy identity persistence ---

export async function savePrivacyIdentity(db: CoopDexie, record: PrivacyIdentityRecord) {
  await db.privacyIdentities.put(record);
}

export async function getPrivacyIdentity(db: CoopDexie, coopId: string, memberId: string) {
  return db.privacyIdentities.where({ coopId, memberId }).first();
}

export async function getPrivacyIdentitiesForCoop(db: CoopDexie, coopId: string) {
  return db.privacyIdentities.where({ coopId }).toArray();
}

// --- Stealth key pair persistence ---

export async function saveStealthKeyPair(db: CoopDexie, record: StealthKeyPairRecord) {
  await db.stealthKeyPairs.put(record);
}

export async function getStealthKeyPair(db: CoopDexie, coopId: string) {
  return db.stealthKeyPairs.where({ coopId }).first();
}
