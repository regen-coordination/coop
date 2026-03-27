import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import * as DataSegment from '@web3-storage/data-segment';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrustedNodeArchiveConfig } from '../../../contracts/schema';
import { createCoop } from '../../coop/flows';
import { type CoopDexie, createCoopDb, loadCoopState } from '../../storage/db';
import { createArchiveBundle, createMockArchiveReceipt } from '../archive';
import { encryptArchivePayloadEnvelope } from '../crypto';
import { exportCoopSnapshotJson } from '../export';
import { createArchiveOnChainSealWitnessArtifact } from '../filecoin-witness';
import { computeStorachaFileRootCid, serializeArchiveInclusionProof } from '../verification';
import {
  restoreFromArchive,
  restoreFromExportedSnapshot,
  validateArchivePayload,
} from '../restore';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

const databases: CoopDexie[] = [];
const ARCHIVE_RESTORE_TEST_TIMEOUT_MS = 20_000;

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

function buildArchiveConfig(): TrustedNodeArchiveConfig {
  return {
    spaceDid: 'did:key:space',
    delegationIssuer: 'did:key:issuer',
    gatewayBaseUrl: 'https://storacha.link',
    spaceDelegation: 'space-proof',
    proofs: ['proof-a'],
    allowsFilecoinInfo: true,
    expirationSeconds: 600,
    agentPrivateKey: 'agent-private-key',
  };
}

describe('restoreFromExportedSnapshot', () => {
  let db: CoopDexie;

  beforeEach(() => {
    db = freshDb();
  });

  it(
    'round-trips: create → export → restore → load',
    async () => {
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
    },
    ARCHIVE_RESTORE_TEST_TIMEOUT_MS,
  );

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

  it(
    'restores encrypted full snapshots and preserves fields that legacy snapshots dropped',
    async () => {
      const db = freshDb();
      const { state } = buildCoopState();
      const snapshotState = {
        ...state,
        archiveConfig: {
          spaceDid: 'did:key:space',
          delegationIssuer: 'did:key:issuer',
          gatewayBaseUrl: 'https://storacha.link',
          allowsFilecoinInfo: true,
          expirationSeconds: 600,
        },
        memberCommitments: ['commitment-1'],
      };
      const bundle = createArchiveBundle({ scope: 'snapshot', state: snapshotState });
      const receipt = {
        ...createMockArchiveReceipt({
          bundle,
          delegationIssuer: 'did:key:test-issuer',
        }),
        contentEncoding: 'encrypted-envelope' as const,
        encryption: {
          algorithm: 'aes-gcm' as const,
          keyDerivation: 'coop-archive-config-v1' as const,
        },
      };
      const envelope = await encryptArchivePayloadEnvelope({
        bundle,
        payload: bundle.payload as Record<string, unknown>,
        config: buildArchiveConfig(),
      });

      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(envelope)),
      } as Response);

      const result = await restoreFromArchive(receipt, db, buildArchiveConfig());
      const loaded = await loadCoopState(db, result.coopId);

      expect(result.state.setupInsights).toEqual(snapshotState.setupInsights);
      expect(result.state.memoryProfile).toEqual(snapshotState.memoryProfile);
      expect(result.state.syncRoom).toEqual(snapshotState.syncRoom);
      expect(result.state.onchainState).toEqual(snapshotState.onchainState);
      expect(result.state.archiveConfig).toEqual(snapshotState.archiveConfig);
      expect(result.state.memberCommitments).toEqual(['commitment-1']);
      expect(loaded?.archiveConfig).toEqual(snapshotState.archiveConfig);
      expect(loaded?.syncRoom).toEqual(snapshotState.syncRoom);
    },
    ARCHIVE_RESTORE_TEST_TIMEOUT_MS,
  );

  it('restores live encrypted archives when the Storacha root and envelope binding verify', async () => {
    const db = freshDb();
    const { state } = buildCoopState();
    const bundle = createArchiveBundle({ scope: 'snapshot', state });
    const config = buildArchiveConfig();
    const envelope = await encryptArchivePayloadEnvelope({
      bundle,
      payload: bundle.payload as Record<string, unknown>,
      config,
    });
    const envelopeText = JSON.stringify(envelope, null, 2);
    const rootCid = await computeStorachaFileRootCid(
      new Blob([envelopeText], { type: 'application/json' }),
    );
    const receipt = {
      ...createMockArchiveReceipt({
        bundle,
        delegationIssuer: 'did:key:test-issuer',
      }),
      rootCid,
      gatewayUrl: `https://storacha.link/ipfs/${rootCid}`,
      delegation: {
        issuer: 'did:key:test-issuer',
        mode: 'live' as const,
        allowsFilecoinInfo: true,
      },
      contentEncoding: 'encrypted-envelope' as const,
      encryption: {
        algorithm: 'aes-gcm' as const,
        keyDerivation: 'coop-archive-config-v1' as const,
      },
    };

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(envelopeText),
    } as Response);

    const result = await restoreFromArchive(receipt, db, config);

    expect(result.coopId).toBe(state.profile.id);
    expect(result.state.profile.name).toBe(state.profile.name);
  });

  it('rejects live archive restore when receipt verification fails', async () => {
    const db = freshDb();
    const { state } = buildCoopState();
    const bundle = createArchiveBundle({ scope: 'snapshot', state });
    const config = buildArchiveConfig();
    const receipt = {
      ...createMockArchiveReceipt({
        bundle,
        delegationIssuer: 'did:key:test-issuer',
      }),
      delegation: {
        issuer: 'did:key:test-issuer',
        mode: 'live' as const,
        allowsFilecoinInfo: true,
      },
      contentEncoding: 'encrypted-envelope' as const,
      encryption: {
        algorithm: 'aes-gcm' as const,
        keyDerivation: 'coop-archive-config-v1' as const,
      },
      filecoinStatus: 'sealed' as const,
      filecoinInfo: {
        pieceCid: 'bafkpiece-mismatch',
        aggregates: [
          {
            aggregate: 'bafyaggregate-1',
            inclusionProofAvailable: true,
            inclusionProof: '{not-json',
          },
        ],
        deals: [
          {
            aggregate: 'bafyaggregate-missing',
            dealId: '44',
          },
        ],
      },
    };
    const envelope = await encryptArchivePayloadEnvelope({
      bundle,
      payload: bundle.payload as Record<string, unknown>,
      config,
    });

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(envelope)),
    } as Response);

    await expect(restoreFromArchive(receipt, db, config)).rejects.toThrow(
      'Archive restore verification failed',
    );
  });

  it('restores sealed live archives when the stored on-chain seal witness verifies locally', async () => {
    const db = freshDb();
    const { state } = buildCoopState();
    const bundle = createArchiveBundle({ scope: 'snapshot', state });
    const piece = DataSegment.Piece.fromPayload(new Uint8Array(65).fill(21));
    const aggregate = DataSegment.Aggregate.build({ pieces: [piece] });
    const proof = aggregate.resolveProof(piece.link);
    if (proof.error) {
      throw proof.error;
    }
    const config = {
      ...buildArchiveConfig(),
      filecoinWitnessRpcUrl: 'https://lotus.example/rpc/v1',
    } satisfies TrustedNodeArchiveConfig;
    const sealWitness = await createArchiveOnChainSealWitnessArtifact({
      type: 'coop-filecoin-onchain-seal-witness',
      schemaVersion: 1,
      source: 'lotus-json-rpc',
      witnessedAt: '2026-03-27T10:00:00.000Z',
      tipSet: {
        height: 12345,
        cids: ['bafyhead-1'],
      },
      deal: {
        dealId: '91',
        provider: 'f01234',
        pieceCid: piece.link.toString(),
        pieceSize: 2048,
        verifiedDeal: true,
        startEpoch: 12000,
        endEpoch: 18000,
        sectorStartEpoch: 12010,
        lastUpdatedEpoch: 12340,
        slashEpoch: -1,
      },
      activeSector: {
        sectorNumber: 9,
        activation: 12010,
        expiration: 20000,
        sealedCid: 'bafysealed-1',
      },
    });
    const envelope = await encryptArchivePayloadEnvelope({
      bundle,
      payload: bundle.payload as Record<string, unknown>,
      config,
    });
    const envelopeText = JSON.stringify(envelope, null, 2);
    const rootCid = await computeStorachaFileRootCid(
      new Blob([envelopeText], { type: 'application/json' }),
    );
    const receipt = {
      ...createMockArchiveReceipt({
        bundle,
        delegationIssuer: 'did:key:test-issuer',
      }),
      rootCid,
      gatewayUrl: `https://storacha.link/ipfs/${rootCid}`,
      delegation: {
        issuer: 'did:key:test-issuer',
        mode: 'live' as const,
        allowsFilecoinInfo: true,
      },
      contentEncoding: 'encrypted-envelope' as const,
      encryption: {
        algorithm: 'aes-gcm' as const,
        keyDerivation: 'coop-archive-config-v1' as const,
      },
      filecoinStatus: 'sealed' as const,
      pieceCids: [piece.link.toString()],
      filecoinInfo: {
        pieceCid: piece.link.toString(),
        aggregates: [
          {
            aggregate: aggregate.link.toString(),
            inclusionProofAvailable: true,
            inclusionProof: serializeArchiveInclusionProof(proof.ok),
          },
        ],
        deals: [
          {
            aggregate: aggregate.link.toString(),
            provider: 'f01234',
            dealId: '91',
            onChainSealWitness: sealWitness.proof,
            onChainSealWitnessCid: sealWitness.proofCid,
          },
        ],
        lastUpdatedAt: '2026-03-27T10:00:00.000Z',
      },
    };

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(envelopeText),
    } as Response);

    const result = await restoreFromArchive(receipt, db, config);
    expect(result.state.profile.id).toBe(state.profile.id);
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
