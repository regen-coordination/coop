import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as DataSegment from '@web3-storage/data-segment';
import { createCoop } from '../../coop/flows';
import type { TrustedNodeArchiveConfig } from '../../../contracts/schema';
import {
  createArchiveBundle,
  createArchiveReceiptFromUpload,
  retrieveArchiveBundle,
} from '../archive';
import { encryptArchivePayloadEnvelope } from '../crypto';
import { createArchiveOnChainSealWitnessArtifact } from '../filecoin-witness';
import {
  computeStorachaFileRootCid,
  createArchiveDataAggregationProofArtifact,
  serializeArchiveInclusionProof,
} from '../verification';

function buildSetupInsights() {
  return {
    summary: 'A compact setup payload for retrieval coverage.',
    crossCuttingPainPoints: ['Archived content is hard to verify'],
    crossCuttingOpportunities: ['Gateway retrieval with CID check'],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'Funding evidence archived.',
        painPoints: 'No retrieval pathway.',
        improvements: 'Retrieve and verify.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Evidence is durable.',
        painPoints: 'Retrieval is manual.',
        improvements: 'Automate it.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Governance artifacts on Filecoin.',
        painPoints: 'No programmatic access.',
        improvements: 'Add gateway retrieval.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Resources archived.',
        painPoints: 'No verification.',
        improvements: 'CID verification on retrieval.',
      },
    ],
  } as const;
}

function buildReceipt(gatewayUrl?: string) {
  const created = createCoop({
    coopName: 'Retrieval Test Coop',
    purpose: 'Test gateway retrieval of archived bundles.',
    creatorDisplayName: 'Tester',
    captureMode: 'manual',
    seedContribution: 'I bring retrieval test coverage.',
    setupInsights: buildSetupInsights(),
  });
  const artifact = created.state.artifacts[0];
  if (!artifact) {
    throw new Error('Expected an initial artifact.');
  }

  return createArchiveReceiptFromUpload({
    bundle: createArchiveBundle({
      scope: 'artifact',
      state: created.state,
      artifactIds: [artifact.id],
    }),
    delegationIssuer: 'did:key:issuer',
    delegationMode: 'live',
    allowsFilecoinInfo: true,
    rootCid: 'bafyroot123',
    shardCids: ['bafyshard1'],
    pieceCids: ['bafkpiece1'],
    gatewayUrl: gatewayUrl ?? 'https://storacha.link/ipfs/bafyroot123',
    artifactIds: [artifact.id],
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

describe('retrieveArchiveBundle', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches and parses valid JSON from gateway', async () => {
    const receipt = buildReceipt();
    const payload = { schemaVersion: 1, coop: { id: 'coop-1', name: 'Test' } };
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(payload)),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const result = await retrieveArchiveBundle(receipt);

    expect(result.payload).toEqual(payload);
    expect(result.schemaVersion).toBe(1);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      receipt.gatewayUrl,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('throws when receipt has no gateway URL', async () => {
    const receipt = buildReceipt();
    const noGateway = { ...receipt, gatewayUrl: '' };

    await expect(retrieveArchiveBundle(noGateway)).rejects.toThrow(
      'Archive receipt has no gateway URL.',
    );
  });

  it('throws on non-200 response', async () => {
    const receipt = buildReceipt();
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve(''),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    await expect(retrieveArchiveBundle(receipt)).rejects.toThrow(
      'Gateway fetch failed: 404 Not Found',
    );
  });

  it('returns verified: false when CID does not match', async () => {
    const receipt = buildReceipt();
    // The payload will hash to a different CID than bafyroot123
    const payload = { data: 'some content that will not match the rootCid' };
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(payload)),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const result = await retrieveArchiveBundle(receipt);

    // CID won't match because bafyroot123 is a fake CID
    expect(result.verified).toBe(false);
    expect(result.payload).toEqual(payload);
  });

  it('extracts schemaVersion from payload', async () => {
    const receipt = buildReceipt();
    const payload = { schemaVersion: 2, artifacts: [] };
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(payload)),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const result = await retrieveArchiveBundle(receipt);

    expect(result.schemaVersion).toBe(2);
  });

  it('returns undefined schemaVersion when payload lacks it', async () => {
    const receipt = buildReceipt();
    const payload = { data: 'no schema version here' };
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(payload)),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const result = await retrieveArchiveBundle(receipt);

    expect(result.schemaVersion).toBeUndefined();
  });

  it('still returns payload even when verification fails', async () => {
    const receipt = buildReceipt();
    const payload = { important: 'data' };
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(payload)),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const result = await retrieveArchiveBundle(receipt);

    // Verification will fail (fake CID) but payload should still be returned
    expect(result.payload).toEqual(payload);
    expect(typeof result.verified).toBe('boolean');
  });

  it('surfaces receipt consistency issues for malformed proofs and deal metadata', async () => {
    const receipt = {
      ...buildReceipt(),
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
    const payload = { schemaVersion: 1, coop: { id: 'coop-1', name: 'Verification Test' } };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(payload)),
    } as Response);

    const result = await retrieveArchiveBundle(receipt);

    expect(result.verification.receiptIssues).toEqual(
      expect.arrayContaining([
        'Archive receipt piece CID does not match the stored Filecoin info piece CID.',
        expect.stringContaining('Aggregate bafyaggregate-1 inclusion proof is invalid:'),
        'Deal for aggregate bafyaggregate-missing is stored without a matching aggregate record.',
      ]),
    );
  });

  it('cryptographically validates stored inclusion proofs against the receipt piece CID', async () => {
    const piece = DataSegment.Piece.fromPayload(new Uint8Array(65).fill(7));
    const aggregate = DataSegment.Aggregate.build({ pieces: [piece] });
    const proof = aggregate.resolveProof(piece.link);
    if (proof.error) {
      throw proof.error;
    }

    const receipt = {
      ...buildReceipt(),
      pieceCids: [piece.link.toString()],
      filecoinStatus: 'indexed' as const,
      filecoinInfo: {
        pieceCid: piece.link.toString(),
        aggregates: [
          {
            aggregate: aggregate.link.toString(),
            inclusionProofAvailable: true,
            inclusionProof: serializeArchiveInclusionProof(proof.ok),
          },
        ],
        deals: [],
      },
    };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ schemaVersion: 1, artifacts: [] }, null, 2)),
    } as Response);

    const result = await retrieveArchiveBundle(receipt);

    expect(result.verification.receiptIssues).toEqual([]);
  });

  it('flags sealed deals that cannot be verified because no aggregate inclusion proof is stored', async () => {
    const receipt = {
      ...buildReceipt(),
      filecoinStatus: 'sealed' as const,
      filecoinInfo: {
        pieceCid: 'bafkpiece1',
        aggregates: [
          {
            aggregate: 'bafyaggregate-1',
            inclusionProofAvailable: false,
          },
        ],
        deals: [
          {
            aggregate: 'bafyaggregate-1',
            dealId: '44',
          },
        ],
      },
    };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ schemaVersion: 1, artifacts: [] }, null, 2)),
    } as Response);

    const result = await retrieveArchiveBundle(receipt);

    expect(result.verification.receiptIssues).toEqual(
      expect.arrayContaining([
        'Deal for aggregate bafyaggregate-1 cannot be cryptographically verified because no matching inclusion proof is stored.',
      ]),
    );
  });

  it('verifies sealed deal metadata by synthesizing a data aggregation proof from stored inputs', async () => {
    const piece = DataSegment.Piece.fromPayload(new Uint8Array(65).fill(11));
    const aggregate = DataSegment.Aggregate.build({ pieces: [piece] });
    const proof = aggregate.resolveProof(piece.link);
    if (proof.error) {
      throw proof.error;
    }

    const receipt = {
      ...buildReceipt(),
      pieceCids: [piece.link.toString()],
      filecoinStatus: 'sealed' as const,
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
            dealId: '77',
          },
        ],
      },
    };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ schemaVersion: 1, artifacts: [] }, null, 2)),
    } as Response);

    const result = await retrieveArchiveBundle(receipt);

    expect(result.verification.receiptIssues).toEqual([]);
  });

  it('flags invalid stored data aggregation proofs on sealed receipts', async () => {
    const piece = DataSegment.Piece.fromPayload(new Uint8Array(65).fill(13));
    const aggregate = DataSegment.Aggregate.build({ pieces: [piece] });
    const proof = aggregate.resolveProof(piece.link);
    if (proof.error) {
      throw proof.error;
    }
    const artifact = createArchiveDataAggregationProofArtifact({
      serializedInclusionProof: serializeArchiveInclusionProof(proof.ok),
      dealId: 88,
    });

    const receipt = {
      ...buildReceipt(),
      pieceCids: [piece.link.toString()],
      filecoinStatus: 'sealed' as const,
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
            dealId: '88',
            dataAggregationProof: artifact.proof,
            dataAggregationProofCid: 'bafywrongproofcid',
          },
        ],
      },
    };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ schemaVersion: 1, artifacts: [] }, null, 2)),
    } as Response);

    const result = await retrieveArchiveBundle(receipt);

    expect(result.verification.receiptIssues).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `Deal for aggregate ${aggregate.link.toString()} data aggregation proof could not be verified:`,
        ),
      ]),
    );
  });

  it('requires an independent on-chain seal witness when local witness RPC verification is enabled', async () => {
    const piece = DataSegment.Piece.fromPayload(new Uint8Array(65).fill(15));
    const aggregate = DataSegment.Aggregate.build({ pieces: [piece] });
    const proof = aggregate.resolveProof(piece.link);
    if (proof.error) {
      throw proof.error;
    }

    const receipt = {
      ...buildReceipt(),
      pieceCids: [piece.link.toString()],
      filecoinStatus: 'sealed' as const,
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
            dealId: '55',
          },
        ],
      },
    };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ schemaVersion: 1, artifacts: [] }, null, 2)),
    } as Response);

    const result = await retrieveArchiveBundle(receipt, {
      ...buildArchiveConfig(),
      filecoinWitnessRpcUrl: 'https://lotus.example/rpc/v1',
    });

    expect(result.verification.receiptIssues).toEqual(
      expect.arrayContaining([
        `Deal for aggregate ${aggregate.link.toString()} is missing an independent on-chain seal witness artifact.`,
      ]),
    );
  });

  it('verifies stored on-chain seal witness artifacts when local witness RPC verification is enabled', async () => {
    const piece = DataSegment.Piece.fromPayload(new Uint8Array(65).fill(17));
    const aggregate = DataSegment.Aggregate.build({ pieces: [piece] });
    const proof = aggregate.resolveProof(piece.link);
    if (proof.error) {
      throw proof.error;
    }
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

    const receipt = {
      ...buildReceipt(),
      pieceCids: [piece.link.toString()],
      filecoinStatus: 'sealed' as const,
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
      },
    };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ schemaVersion: 1, artifacts: [] }, null, 2)),
    } as Response);

    const result = await retrieveArchiveBundle(receipt, {
      ...buildArchiveConfig(),
      filecoinWitnessRpcUrl: 'https://lotus.example/rpc/v1',
    });

    expect(result.verification.receiptIssues).toEqual([]);
  });

  it('verifies plaintext archive bundles against the stored Storacha UnixFS root', async () => {
    const payload = { schemaVersion: 1, coop: { id: 'coop-1', name: 'Plaintext Test' } };
    const text = JSON.stringify(payload, null, 2);
    const rootCid = await computeStorachaFileRootCid(
      new Blob([text], { type: 'application/json' }),
    );
    const receipt = buildReceipt(`https://storacha.link/ipfs/${rootCid}`);
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(text),
    } as Response);

    const result = await retrieveArchiveBundle({
      ...receipt,
      rootCid,
    });

    expect(result.verified).toBe(true);
    expect(result.verification.payloadBoundToReceipt).toBe(true);
  });

  it('decrypts encrypted archive envelopes when local archive secrets are available', async () => {
    const receipt = buildReceipt();
    const config = buildArchiveConfig();
    const payload = { schemaVersion: 1, coop: { id: 'coop-1', name: 'Encrypted Test' } };
    const envelope = await encryptArchivePayloadEnvelope({
      bundle: {
        id: receipt.bundleReference,
        scope: receipt.scope,
        targetCoopId: receipt.targetCoopId,
        createdAt: new Date().toISOString(),
        schemaVersion: 1,
        payload,
      },
      payload,
      config,
    });
    const envelopeText = JSON.stringify(envelope, null, 2);
    const rootCid = await computeStorachaFileRootCid(
      new Blob([envelopeText], { type: 'application/json' }),
    );
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(envelopeText),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const result = await retrieveArchiveBundle(
      {
        ...receipt,
        rootCid,
        gatewayUrl: `https://storacha.link/ipfs/${rootCid}`,
        contentEncoding: 'encrypted-envelope',
        encryption: {
          algorithm: 'aes-gcm',
          keyDerivation: 'coop-archive-config-v1',
        },
      },
      config,
    );

    expect(result.payload).toEqual(payload);
    expect(result.verified).toBe(true);
    expect(result.verification.payloadBoundToReceipt).toBe(true);
    expect(result.schemaVersion).toBe(1);
  });

  it('rejects encrypted archive envelopes when local archive secrets are unavailable', async () => {
    const receipt = buildReceipt();
    const config = buildArchiveConfig();
    const payload = { schemaVersion: 1, coop: { id: 'coop-1', name: 'Encrypted Test' } };
    const envelope = await encryptArchivePayloadEnvelope({
      bundle: {
        id: receipt.bundleReference,
        scope: receipt.scope,
        targetCoopId: receipt.targetCoopId,
        createdAt: new Date().toISOString(),
        schemaVersion: 1,
        payload,
      },
      payload,
      config,
    });
    const envelopeText = JSON.stringify(envelope, null, 2);
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(envelopeText),
    } as Response);

    await expect(
      retrieveArchiveBundle({
        ...receipt,
        contentEncoding: 'encrypted-envelope',
        encryption: {
          algorithm: 'aes-gcm',
          keyDerivation: 'coop-archive-config-v1',
        },
      }),
    ).rejects.toThrow('Archive bundle is encrypted, but local archive secrets are unavailable.');
  });
});
