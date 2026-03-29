import { afterEach, describe, expect, it } from 'vitest';
import {
  createArchiveBundle,
  createArchiveRecoveryRecord,
  createMockArchiveReceipt,
} from '../../archive';
import { createCoop } from '../../coop';
import type { CoopDexie } from '../db';
import {
  createCoopDb,
  listArchiveRecoveryRecords,
  removeArchiveRecoveryRecord,
  setArchiveRecoveryRecord,
} from '../db';

const databases: CoopDexie[] = [];
const ARCHIVE_RECOVERY_TEST_TIMEOUT_MS = 20_000;

function freshDb(): CoopDexie {
  const db = createCoopDb(`archive-recovery-${crypto.randomUUID()}`);
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

function buildSetupInsights() {
  return {
    summary: 'Archive recovery storage test insights.',
    crossCuttingPainPoints: ['Recovery records can be lost silently'],
    crossCuttingOpportunities: ['Keep post-upload recovery local and explicit'],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'Archive receipts matter.',
        painPoints: 'Recovery can be implicit.',
        improvements: 'Persist it directly.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Proofs are durable.',
        painPoints: 'Local persistence can fail.',
        improvements: 'Reconcile later.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Operators need visibility.',
        painPoints: 'Recovery state disappears.',
        improvements: 'Track it locally.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Archived resources are useful.',
        painPoints: 'Receipts can be orphaned locally.',
        improvements: 'Keep a recovery ledger.',
      },
    ],
  } as const;
}

function buildRecoveryRecord() {
  const created = createCoop({
    coopName: 'Archive Recovery Coop',
    purpose: 'Exercise archive recovery record storage.',
    creatorDisplayName: 'Ari',
    captureMode: 'manual',
    seedContribution: 'I bring recovery storage coverage.',
    setupInsights: buildSetupInsights(),
  });
  const artifact = created.state.artifacts[0];
  if (!artifact) {
    throw new Error('Expected an initial artifact.');
  }

  const bundle = createArchiveBundle({
    scope: 'artifact',
    state: created.state,
    artifactIds: [artifact.id],
  });
  const receipt = createMockArchiveReceipt({
    bundle,
    delegationIssuer: 'did:key:issuer',
    artifactIds: [artifact.id],
  });

  return createArchiveRecoveryRecord({
    coopId: created.state.profile.id,
    receipt,
    artifactIds: [artifact.id],
    blobUploads: {
      'blob-1': {
        archiveCid: 'bafyblob',
      },
    },
  });
}

describe('archive recovery record persistence', () => {
  it(
    'stores and lists recovery records by coop',
    async () => {
      const db = freshDb();
      const recovery = buildRecoveryRecord();

      await setArchiveRecoveryRecord(db, recovery);

      await expect(listArchiveRecoveryRecords(db, recovery.coopId)).resolves.toEqual([recovery]);
    },
    ARCHIVE_RECOVERY_TEST_TIMEOUT_MS,
  );

  it(
    'removes recovery records by id',
    async () => {
      const db = freshDb();
      const recovery = buildRecoveryRecord();

      await setArchiveRecoveryRecord(db, recovery);
      await removeArchiveRecoveryRecord(db, recovery.id);

      await expect(listArchiveRecoveryRecords(db, recovery.coopId)).resolves.toEqual([]);
    },
    ARCHIVE_RECOVERY_TEST_TIMEOUT_MS,
  );
});
