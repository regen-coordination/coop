import type {
  ActionBundle,
  ActionLogEntry,
  ActionPolicy,
  ExecutionPermit,
  PermitLogEntry,
} from '../../contracts/schema';
import {
  actionBundleSchema,
  actionLogEntrySchema,
  actionPolicySchema,
  executionPermitSchema,
  permitLogEntrySchema,
} from '../../contracts/schema';
import type { CoopDexie } from './db-schema';

// --- Action Policy persistence (stored in settings) ---

export async function setActionPolicies(db: CoopDexie, policies: ActionPolicy[]) {
  await db.settings.put({ key: 'action-policies', value: policies });
}

export async function listActionPolicies(db: CoopDexie): Promise<ActionPolicy[]> {
  const record = await db.settings.get('action-policies');
  if (!record?.value || !Array.isArray(record.value)) {
    return [];
  }
  return record.value.map((entry) => actionPolicySchema.parse(entry));
}

// --- Action Bundle persistence ---

export async function saveActionBundle(db: CoopDexie, bundle: ActionBundle) {
  await db.actionBundles.put(actionBundleSchema.parse(bundle));
}

export async function getActionBundle(db: CoopDexie, bundleId: string) {
  return db.actionBundles.get(bundleId);
}

export async function listActionBundles(db: CoopDexie) {
  return db.actionBundles.orderBy('createdAt').reverse().toArray();
}

export async function listActionBundlesByStatus(db: CoopDexie, statuses: ActionBundle['status'][]) {
  const all = await listActionBundles(db);
  const set = new Set(statuses);
  return all.filter((bundle) => set.has(bundle.status));
}

// --- Action Log persistence ---

export async function saveActionLogEntry(db: CoopDexie, entry: ActionLogEntry) {
  await db.actionLogEntries.put(actionLogEntrySchema.parse(entry));
}

export async function listActionLogEntries(db: CoopDexie, limit = 100) {
  return db.actionLogEntries.orderBy('createdAt').reverse().limit(limit).toArray();
}

// --- Replay ID persistence ---

export async function recordReplayId(
  db: CoopDexie,
  replayId: string,
  bundleId: string,
  executedAt: string,
) {
  await db.replayIds.put({ replayId, bundleId, executedAt });
}

export async function isReplayIdRecorded(db: CoopDexie, replayId: string) {
  return (await db.replayIds.get(replayId)) !== undefined;
}

export async function listRecordedReplayIds(db: CoopDexie) {
  const records = await db.replayIds.toArray();
  return records.map((r) => r.replayId);
}

// --- Execution Permit persistence ---

export async function saveExecutionPermit(db: CoopDexie, permit: ExecutionPermit) {
  await db.executionPermits.put(executionPermitSchema.parse(permit));
}

export async function getExecutionPermit(db: CoopDexie, permitId: string) {
  return db.executionPermits.get(permitId);
}

export async function listExecutionPermits(db: CoopDexie) {
  return db.executionPermits.orderBy('createdAt').reverse().toArray();
}

export async function listExecutionPermitsByCoopId(db: CoopDexie, coopId: string) {
  return db.executionPermits.where('coopId').equals(coopId).reverse().sortBy('createdAt');
}

// --- Permit Log persistence ---

export async function savePermitLogEntry(db: CoopDexie, entry: PermitLogEntry) {
  await db.permitLogEntries.put(permitLogEntrySchema.parse(entry));
}

export async function listPermitLogEntries(db: CoopDexie, limit = 100) {
  return db.permitLogEntries.orderBy('createdAt').reverse().limit(limit).toArray();
}
