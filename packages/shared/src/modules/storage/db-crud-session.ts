import type {
  EncryptedSessionMaterial,
  LocalMemberSignerBinding,
  SessionCapability,
  SessionCapabilityLogEntry,
} from '../../contracts/schema';
import {
  encryptedSessionMaterialSchema,
  localMemberSignerBindingSchema,
  sessionCapabilityLogEntrySchema,
  sessionCapabilitySchema,
} from '../../contracts/schema';
import type { CoopDexie } from './db-schema';

// --- Session capability persistence ---

export async function saveSessionCapability(db: CoopDexie, capability: SessionCapability) {
  await db.sessionCapabilities.put(sessionCapabilitySchema.parse(capability));
}

export async function getSessionCapability(db: CoopDexie, capabilityId: string) {
  return db.sessionCapabilities.get(capabilityId);
}

export async function listSessionCapabilities(db: CoopDexie) {
  return db.sessionCapabilities.orderBy('createdAt').reverse().toArray();
}

export async function listSessionCapabilitiesByCoopId(db: CoopDexie, coopId: string) {
  return db.sessionCapabilities.where('coopId').equals(coopId).reverse().sortBy('createdAt');
}

export async function saveSessionCapabilityLogEntry(
  db: CoopDexie,
  entry: SessionCapabilityLogEntry,
) {
  await db.sessionCapabilityLogEntries.put(sessionCapabilityLogEntrySchema.parse(entry));
}

export async function listSessionCapabilityLogEntries(db: CoopDexie, limit = 200) {
  return db.sessionCapabilityLogEntries.orderBy('createdAt').reverse().limit(limit).toArray();
}

export async function saveEncryptedSessionMaterial(
  db: CoopDexie,
  material: EncryptedSessionMaterial,
) {
  await db.encryptedSessionMaterials.put(encryptedSessionMaterialSchema.parse(material));
}

export async function getEncryptedSessionMaterial(db: CoopDexie, capabilityId: string) {
  return db.encryptedSessionMaterials.get(capabilityId);
}

export async function deleteEncryptedSessionMaterial(db: CoopDexie, capabilityId: string) {
  await db.encryptedSessionMaterials.delete(capabilityId);
}

// --- Local member signer binding persistence ---

export async function saveLocalMemberSignerBinding(
  db: CoopDexie,
  binding: LocalMemberSignerBinding,
) {
  await db.localMemberSignerBindings.put(localMemberSignerBindingSchema.parse(binding));
}

export async function getLocalMemberSignerBinding(db: CoopDexie, coopId: string, memberId: string) {
  return db.localMemberSignerBindings.where('[coopId+memberId]').equals([coopId, memberId]).first();
}

export async function listLocalMemberSignerBindingsByCoopId(db: CoopDexie, coopId: string) {
  return db.localMemberSignerBindings.where('coopId').equals(coopId).toArray();
}
