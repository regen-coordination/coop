import type { SyncOutboxEntry, SyncOutboxEntryStatus, SyncOutboxEntryType } from '../storage/db';
import type { CoopDexie } from '../storage/db';
import { createId, nowIso } from '../../utils';

const OUTBOX_PRUNE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Create an outbox entry for a pending sync operation. */
export function createOutboxEntry(input: {
  coopId: string;
  type: SyncOutboxEntryType;
  entityKey: string;
}): SyncOutboxEntry {
  return {
    id: createId('outbox'),
    coopId: input.coopId,
    type: input.type,
    entityKey: input.entityKey,
    createdAt: nowIso(),
    status: 'pending',
    retryCount: 0,
  };
}

/** Write an outbox entry to the database. */
export async function addOutboxEntry(db: CoopDexie, entry: SyncOutboxEntry): Promise<void> {
  await db.syncOutbox.put(entry);
}

/** Mark an outbox entry as synced. */
export async function markOutboxSynced(db: CoopDexie, id: string): Promise<void> {
  await db.syncOutbox.update(id, {
    status: 'synced' satisfies SyncOutboxEntryStatus,
    syncedAt: nowIso(),
  });
}

/** Mark an outbox entry as failed. */
export async function markOutboxFailed(db: CoopDexie, id: string, error: string): Promise<void> {
  const entry = await db.syncOutbox.get(id);
  if (!entry) return;
  await db.syncOutbox.update(id, {
    status: 'failed' satisfies SyncOutboxEntryStatus,
    retryCount: entry.retryCount + 1,
    lastError: error,
  });
}

/** Get pending outbox entries for a coop. */
export async function getPendingOutboxEntries(
  db: CoopDexie,
  coopId: string,
): Promise<SyncOutboxEntry[]> {
  return db.syncOutbox.where({ coopId, status: 'pending' }).toArray();
}

/** Get the count of pending outbox entries across all coops. */
export async function getPendingOutboxCount(db: CoopDexie): Promise<number> {
  return db.syncOutbox.where('status').equals('pending').count();
}

/** Prune old synced/failed entries beyond the retention period. */
export async function pruneOutbox(db: CoopDexie): Promise<number> {
  const cutoff = new Date(Date.now() - OUTBOX_PRUNE_AGE_MS).toISOString();
  const staleEntries = await db.syncOutbox
    .where('status')
    .anyOf('synced', 'failed')
    .and((entry) => entry.createdAt < cutoff)
    .toArray();

  if (staleEntries.length === 0) return 0;

  await db.syncOutbox.bulkDelete(staleEntries.map((e) => e.id));
  return staleEntries.length;
}

/** Mark outbox entries as synced when their entity keys appear in the shared state. */
export async function reconcileOutbox(
  db: CoopDexie,
  coopId: string,
  syncedEntityKeys: Set<string>,
): Promise<number> {
  const pending = await getPendingOutboxEntries(db, coopId);
  let count = 0;
  for (const entry of pending) {
    if (syncedEntityKeys.has(entry.entityKey)) {
      await markOutboxSynced(db, entry.id);
      count++;
    }
  }
  return count;
}
