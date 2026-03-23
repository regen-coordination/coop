import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCoop } from '../../coop/flows';
import { type CoopDexie, createCoopDb, loadCoopState } from '../../storage/db';
import { createArchiveBundle, createMockArchiveReceipt } from '../archive';
import { exportCoopSnapshotJson } from '../export';
import {
  restoreFromArchive,
  restoreFromExportedSnapshot,
  validateArchivePayload,
} from '../restore';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

const databases: CoopDexie[] = [];

function freshDb(): CoopDexie {
  const db = createCoopDb(`restore-test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

afterEach(async () => {
  for (const db of databases) {
    db.close();
    await Dexie.delete(db.name);
  }
  databases.length = 0;
});

function buildSetupInsights() {
  return {
    summary: 'A valid setup payload for archive restore tests.',
    crossCuttingPainPoints: ['Archived coops cannot be restored'],
    crossCuttingOpportunities: ['Full restore pipeline from IPFS'],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'Funding tracked.',
        painPoints: 'No restore path.',
        improvements: 'Build restore pipeline.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Evidence durable.',
        painPoints: 'No import.',
        improvements: 'Import from archive.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Governance on chain.',
        painPoints: 'Restore missing.',
        improvements: 'Add restore.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Resources archived.',
        painPoints: 'Cannot restore.',
        improvements: 'Restore pipeline.',
      },
    ],
  } as const;
}

function buildCoopState() {
  return createCoop({
    coopName: 'Restore Test Coop',
    purpose: 'Test the archive restore pipeline.',
    creatorDisplayName: 'Restorer',
    captureMode: 'manual',
    seedContribution: 'I bring restore test coverage.',
    setupInsights: buildSetupInsights(),
  });
}

describe('restoreFromExportedSnapshot', () => {
  let db: CoopDexie;

  beforeEach(() => {
    db = freshDb();
  });

  it('round-trips: create → export → restore → load', async () => {
    const { state: original } = buildCoopState();
    const json = exportCoopSnapshotJson(original);

    const { state: restored, coopId } = await restoreFromExportedSnapshot(json, db);

    expect(coopId).toBe(original.profile.id);
    expect(restored.profile.id).toBe(original.profile.id);
    expect(restored.profile.name).toBe(original.profile.name);
    expect(restored.soul.purposeStatement).toBe(original.soul.purposeStatement);
    expect(restored.artifacts).toHaveLength(original.artifacts.length);
    expect(restored.members).toHaveLength(original.members.length);

    // Verify it was actually written to Dexie
    const loaded = await loadCoopState(db, coopId);
    expect(loaded).not.toBeNull();
    expect(loaded?.profile.id).toBe(original.profile.id);
    expect(loaded?.profile.name).toBe(original.profile.name);
  });

  it('rejects invalid JSON', async () => {
    await expect(restoreFromExportedSnapshot('not json at all', db)).rejects.toThrow();
  });

  it('rejects JSON with wrong type field', async () => {
    const json = JSON.stringify({ type: 'wrong-type', snapshot: {} });
    await expect(restoreFromExportedSnapshot(json, db)).rejects.toThrow(
      'Expected type "coop-snapshot"',
    );
  });

  it('rejects JSON missing snapshot field', async () => {
    const json = JSON.stringify({ type: 'coop-snapshot' });
    await expect(restoreFromExportedSnapshot(json, db)).rejects.toThrow();
  });
});

describe('restoreFromArchive', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches archive bundle and writes state to Dexie', async () => {
    const db = freshDb();
    const { state } = buildCoopState();
    const bundle = createArchiveBundle({ scope: 'snapshot', state });
    const receipt = createMockArchiveReceipt({
      bundle,
      delegationIssuer: 'did:key:test-issuer',
    });

    // Mock fetch to return the bundle
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(bundle)),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const result = await restoreFromArchive(receipt, db);

    expect(result.coopId).toBe(state.profile.id);
    expect(result.state.profile.name).toBe(state.profile.name);

    // Verify it was written to Dexie
    const loaded = await loadCoopState(db, result.coopId);
    expect(loaded).not.toBeNull();
    expect(loaded?.profile.id).toBe(state.profile.id);
  });

  it('handles network errors with a clear message', async () => {
    const db = freshDb();
    const { state } = buildCoopState();
    const bundle = createArchiveBundle({ scope: 'snapshot', state });
    const receipt = createMockArchiveReceipt({
      bundle,
      delegationIssuer: 'did:key:test-issuer',
    });

    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network failure'));

    await expect(restoreFromArchive(receipt, db)).rejects.toThrow('Network failure');
  });

  it('handles non-200 responses', async () => {
    const db = freshDb();
    const { state } = buildCoopState();
    const bundle = createArchiveBundle({ scope: 'snapshot', state });
    const receipt = createMockArchiveReceipt({
      bundle,
      delegationIssuer: 'did:key:test-issuer',
    });

    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve(''),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    await expect(restoreFromArchive(receipt, db)).rejects.toThrow('Gateway fetch failed');
  });
});

describe('validateArchivePayload', () => {
  it('validates a correct snapshot payload', async () => {
    const { state } = buildCoopState();
    const bundle = createArchiveBundle({ scope: 'snapshot', state });
    const payload = bundle.payload as Record<string, unknown>;

    const result = await validateArchivePayload(payload, 'snapshot');

    expect(result.valid).toBe(true);
    expect(result.state).toBeDefined();
    expect(result.state?.profile.name).toBe(state.profile.name);
  });

  it('returns errors for invalid snapshot payload', async () => {
    const payload = { coop: { id: 'bad' } };

    const result = await validateArchivePayload(payload, 'snapshot');

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('validates artifact scope with valid artifacts', async () => {
    const { state } = buildCoopState();
    const artifact = state.artifacts[0];
    expect(artifact).toBeDefined();
    const bundle = createArchiveBundle({
      scope: 'artifact',
      state,
      artifactIds: [artifact.id],
    });
    const payload = bundle.payload as Record<string, unknown>;

    const result = await validateArchivePayload(payload, 'artifact');

    expect(result.valid).toBe(true);
  });

  it('returns errors for artifact scope without artifacts array', async () => {
    const payload = { coop: { id: 'test', name: 'test' } };

    const result = await validateArchivePayload(payload, 'artifact');

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

describe('full round-trip via loadCoopState', () => {
  let db: CoopDexie;

  beforeEach(() => {
    db = freshDb();
  });

  it('restored state matches original across all key fields', async () => {
    const { state: original } = buildCoopState();
    const json = exportCoopSnapshotJson(original);

    const { coopId } = await restoreFromExportedSnapshot(json, db);
    const loaded = await loadCoopState(db, coopId);

    expect(loaded).not.toBeNull();
    expect(loaded?.profile).toEqual(original.profile);
    expect(loaded?.soul).toEqual(original.soul);
    expect(loaded?.rituals).toEqual(original.rituals);
    expect(loaded?.members).toEqual(original.members);
    expect(loaded?.artifacts).toHaveLength(original.artifacts.length);
    expect(loaded?.reviewBoard).toEqual(original.reviewBoard);
    expect(loaded?.archiveReceipts).toEqual(original.archiveReceipts);
  });
});
