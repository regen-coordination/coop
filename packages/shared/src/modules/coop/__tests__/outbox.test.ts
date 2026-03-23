import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCoopDb } from '../../storage/db';
import {
  addOutboxEntry,
  createOutboxEntry,
  getPendingOutboxCount,
  getPendingOutboxEntries,
  markOutboxFailed,
  markOutboxSynced,
  pruneOutbox,
  reconcileOutbox,
} from '../outbox';

describe('sync outbox', () => {
  const db = createCoopDb('outbox-test');

  beforeEach(async () => {
    await db.open();
    await db.syncOutbox.clear();
  });

  afterEach(async () => {
    await db.syncOutbox.clear();
    db.close();
  });

  it('creates and persists an outbox entry', async () => {
    const entry = createOutboxEntry({
      coopId: 'coop-1',
      type: 'artifact-publish',
      entityKey: 'artifact-123',
    });

    expect(entry.status).toBe('pending');
    expect(entry.retryCount).toBe(0);
    expect(entry.coopId).toBe('coop-1');

    await addOutboxEntry(db, entry);

    const stored = await db.syncOutbox.get(entry.id);
    expect(stored).toBeDefined();
    expect(stored?.entityKey).toBe('artifact-123');
  });

  it('marks an entry as synced', async () => {
    const entry = createOutboxEntry({
      coopId: 'coop-1',
      type: 'artifact-publish',
      entityKey: 'artifact-1',
    });
    await addOutboxEntry(db, entry);

    await markOutboxSynced(db, entry.id);

    const stored = await db.syncOutbox.get(entry.id);
    expect(stored?.status).toBe('synced');
    expect(stored?.syncedAt).toBeDefined();
  });

  it('marks an entry as failed with error and increments retryCount', async () => {
    const entry = createOutboxEntry({
      coopId: 'coop-1',
      type: 'state-update',
      entityKey: 'state-1',
    });
    await addOutboxEntry(db, entry);

    await markOutboxFailed(db, entry.id, 'Network error');
    let stored = await db.syncOutbox.get(entry.id);
    expect(stored?.status).toBe('failed');
    expect(stored?.retryCount).toBe(1);
    expect(stored?.lastError).toBe('Network error');

    // Reset to pending and fail again
    await db.syncOutbox.update(entry.id, { status: 'pending' });
    await markOutboxFailed(db, entry.id, 'Timeout');
    stored = await db.syncOutbox.get(entry.id);
    expect(stored?.retryCount).toBe(2);
    expect(stored?.lastError).toBe('Timeout');
  });

  it('gets pending entries for a specific coop', async () => {
    await addOutboxEntry(
      db,
      createOutboxEntry({ coopId: 'coop-1', type: 'artifact-publish', entityKey: 'a1' }),
    );
    await addOutboxEntry(
      db,
      createOutboxEntry({ coopId: 'coop-2', type: 'artifact-publish', entityKey: 'a2' }),
    );
    await addOutboxEntry(
      db,
      createOutboxEntry({ coopId: 'coop-1', type: 'state-update', entityKey: 's1' }),
    );

    const coop1Pending = await getPendingOutboxEntries(db, 'coop-1');
    expect(coop1Pending).toHaveLength(2);

    const coop2Pending = await getPendingOutboxEntries(db, 'coop-2');
    expect(coop2Pending).toHaveLength(1);
  });

  it('counts pending entries across all coops', async () => {
    await addOutboxEntry(
      db,
      createOutboxEntry({ coopId: 'coop-1', type: 'artifact-publish', entityKey: 'a1' }),
    );
    await addOutboxEntry(
      db,
      createOutboxEntry({ coopId: 'coop-2', type: 'artifact-publish', entityKey: 'a2' }),
    );

    const entry3 = createOutboxEntry({
      coopId: 'coop-1',
      type: 'state-update',
      entityKey: 's1',
    });
    await addOutboxEntry(db, entry3);
    await markOutboxSynced(db, entry3.id);

    const count = await getPendingOutboxCount(db);
    expect(count).toBe(2);
  });

  it('reconciles outbox entries when entity keys appear in synced state', async () => {
    const e1 = createOutboxEntry({
      coopId: 'coop-1',
      type: 'artifact-publish',
      entityKey: 'art-a',
    });
    const e2 = createOutboxEntry({
      coopId: 'coop-1',
      type: 'artifact-publish',
      entityKey: 'art-b',
    });
    await addOutboxEntry(db, e1);
    await addOutboxEntry(db, e2);

    const reconciled = await reconcileOutbox(db, 'coop-1', new Set(['art-a']));
    expect(reconciled).toBe(1);

    const stored1 = await db.syncOutbox.get(e1.id);
    expect(stored1?.status).toBe('synced');

    const stored2 = await db.syncOutbox.get(e2.id);
    expect(stored2?.status).toBe('pending');
  });

  it('prunes old synced entries beyond 7 days', async () => {
    const entry = createOutboxEntry({
      coopId: 'coop-1',
      type: 'artifact-publish',
      entityKey: 'old-one',
    });
    // Backdate the entry
    entry.createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    await addOutboxEntry(db, entry);
    await markOutboxSynced(db, entry.id);

    const pruned = await pruneOutbox(db);
    expect(pruned).toBe(1);

    const stored = await db.syncOutbox.get(entry.id);
    expect(stored).toBeUndefined();
  });

  it('does not prune pending entries', async () => {
    const entry = createOutboxEntry({
      coopId: 'coop-1',
      type: 'artifact-publish',
      entityKey: 'still-pending',
    });
    entry.createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    await addOutboxEntry(db, entry);

    const pruned = await pruneOutbox(db);
    expect(pruned).toBe(0);

    const stored = await db.syncOutbox.get(entry.id);
    expect(stored).toBeDefined();
  });
});
