import * as DataSegment from '@web3-storage/data-segment';
import { describe, expect, it } from 'vitest';
import { createCoop } from '../../coop/flows';
import {
  applyArchiveOnChainSealWitnesses,
  applyArchiveReceiptFollowUp,
  createArchiveBundle,
  createArchiveReceiptFromUpload,
  updateArchiveReceipt,
} from '../archive';
import { createArchiveOnChainSealWitnessArtifact } from '../filecoin-witness';

function buildSetupInsights() {
  return {
    summary: 'A compact setup payload for archive follow-up coverage.',
    crossCuttingPainPoints: ['Archive status stays invisible'],
    crossCuttingOpportunities: ['Refresh Filecoin info from a visible operator flow'],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'Funding context is scattered.',
        painPoints: 'Archive status goes stale.',
        improvements: 'Refresh it directly from the node.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Evidence is durable but hard to inspect.',
        painPoints: 'Filecoin follow-up is opaque.',
        improvements: 'Persist the useful subset.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Follow-up is manual.',
        painPoints: 'Operators lack confidence.',
        improvements: 'Keep the log and receipt in sync.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Resources are archived with little context.',
        painPoints: 'Piece status is missing.',
        improvements: 'Keep piece and deal data legible.',
      },
    ],
  } as const;
}

describe('archive follow-up helpers', () => {
  it('persists live delegation and piece metadata on live receipts', () => {
    const created = createCoop({
      coopName: 'Archive Follow-Up Coop',
      purpose: 'Keep live archive metadata operational.',
      creatorDisplayName: 'Ari',
      captureMode: 'manual',
      seedContribution: 'I bring a durable operator trail.',
      setupInsights: buildSetupInsights(),
    });
    const artifact = created.state.artifacts[0];
    if (!artifact) {
      throw new Error('Expected an initial artifact.');
    }

    const receipt = createArchiveReceiptFromUpload({
      bundle: createArchiveBundle({
        scope: 'artifact',
        state: created.state,
        artifactIds: [artifact.id],
      }),
      delegationIssuer: 'did:key:issuer',
      delegationIssuerUrl: 'https://issuer.example/delegate',
      delegationAudienceDid: 'did:key:audience',
      delegationMode: 'live',
      allowsFilecoinInfo: true,
      rootCid: 'bafyroot',
      shardCids: ['bafyshard'],
      pieceCids: ['bafkpiece'],
      gatewayUrl: 'https://storacha.link/ipfs/bafyroot',
      artifactIds: [artifact.id],
    });

    expect(receipt.delegation?.mode).toBe('live');
    expect(receipt.delegation?.issuerUrl).toBe('https://issuer.example/delegate');
    expect(receipt.filecoinInfo?.pieceCid).toBe('bafkpiece');
  });

  it('promotes receipt status as Filecoin follow-up becomes richer', () => {
    const created = createCoop({
      coopName: 'Archive Follow-Up Coop',
      purpose: 'Keep live archive metadata operational.',
      creatorDisplayName: 'Ari',
      captureMode: 'manual',
      seedContribution: 'I bring a durable operator trail.',
      setupInsights: buildSetupInsights(),
    });
    const artifact = created.state.artifacts[0];
    if (!artifact) {
      throw new Error('Expected an initial artifact.');
    }

    const receipt = createArchiveReceiptFromUpload({
      bundle: createArchiveBundle({
        scope: 'artifact',
        state: created.state,
        artifactIds: [artifact.id],
      }),
      delegationIssuer: 'did:key:issuer',
      delegationMode: 'live',
      allowsFilecoinInfo: true,
      rootCid: 'bafyroot',
      shardCids: ['bafyshard'],
      pieceCids: ['bafkpiece'],
      gatewayUrl: 'https://storacha.link/ipfs/bafyroot',
      artifactIds: [artifact.id],
    });

    const piece = DataSegment.Piece.fromPayload(new Uint8Array(65).fill(6));
    const aggregate = DataSegment.Aggregate.build({ pieces: [piece] });
    const proof = aggregate.resolveProof(piece.link);
    if (proof.error) {
      throw proof.error;
    }

    const indexed = applyArchiveReceiptFollowUp({
      receipt,
      refreshedAt: '2026-03-13T00:10:00.000Z',
      filecoinInfo: {
        piece: piece.link.toString(),
        aggregates: [
          {
            aggregate: aggregate.link.toString(),
            inclusion: { subtree: proof.ok[0], index: proof.ok[1] },
          },
        ],
        deals: [],
      },
    });
    const sealed = applyArchiveReceiptFollowUp({
      receipt: indexed,
      refreshedAt: '2026-03-13T00:12:00.000Z',
      filecoinInfo: {
        piece: piece.link.toString(),
        aggregates: [{ aggregate: aggregate.link.toString() }],
        deals: [
          {
            aggregate: aggregate.link.toString(),
            provider: 'f01234',
            aux: {
              dataSource: {
                dealID: 44,
              },
            },
          },
        ],
      },
    });
    const updatedState = updateArchiveReceipt(
      {
        ...created.state,
        archiveReceipts: [receipt],
      },
      receipt.id,
      sealed,
    );

    expect(indexed.filecoinStatus).toBe('indexed');
    expect(sealed.filecoinStatus).toBe('sealed');
    expect(sealed.followUp?.refreshCount).toBe(2);
    expect(updatedState.archiveReceipts[0]?.filecoinInfo?.deals[0]?.dealId).toBe('44');
    expect(
      updatedState.archiveReceipts[0]?.filecoinInfo?.deals[0]?.dataAggregationProof,
    ).toBeDefined();
    expect(
      updatedState.archiveReceipts[0]?.filecoinInfo?.deals[0]?.dataAggregationProofCid,
    ).toBeDefined();
  });

  it('preserves independent on-chain seal witnesses across sparser follow-up refreshes', async () => {
    const created = createCoop({
      coopName: 'Archive Follow-Up Coop',
      purpose: 'Keep live archive metadata operational.',
      creatorDisplayName: 'Ari',
      captureMode: 'manual',
      seedContribution: 'I bring a durable operator trail.',
      setupInsights: buildSetupInsights(),
    });
    const artifact = created.state.artifacts[0];
    if (!artifact) {
      throw new Error('Expected an initial artifact.');
    }

    const piece = DataSegment.Piece.fromPayload(new Uint8Array(65).fill(12));
    const aggregate = DataSegment.Aggregate.build({ pieces: [piece] });
    const proof = aggregate.resolveProof(piece.link);
    if (proof.error) {
      throw proof.error;
    }
    const receipt = createArchiveReceiptFromUpload({
      bundle: createArchiveBundle({
        scope: 'artifact',
        state: created.state,
        artifactIds: [artifact.id],
      }),
      delegationIssuer: 'did:key:issuer',
      delegationMode: 'live',
      allowsFilecoinInfo: true,
      rootCid: 'bafyroot',
      shardCids: ['bafyshard'],
      pieceCids: [piece.link.toString()],
      gatewayUrl: 'https://storacha.link/ipfs/bafyroot',
      artifactIds: [artifact.id],
    });
    const sealed = applyArchiveReceiptFollowUp({
      receipt,
      refreshedAt: '2026-03-13T00:12:00.000Z',
      filecoinInfo: {
        piece: piece.link.toString(),
        aggregates: [
          {
            aggregate: aggregate.link.toString(),
            inclusion: { subtree: proof.ok[0], index: proof.ok[1] },
          },
        ],
        deals: [
          {
            aggregate: aggregate.link.toString(),
            provider: 'f01234',
            aux: {
              dataSource: {
                dealID: 44,
              },
            },
          },
        ],
      },
    });
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
        dealId: '44',
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
    const witnessed = applyArchiveOnChainSealWitnesses(sealed, [
      {
        aggregate: aggregate.link.toString(),
        dealId: '44',
        proof: sealWitness.proof,
        proofCid: sealWitness.proofCid,
      },
    ]);

    const refreshed = applyArchiveReceiptFollowUp({
      receipt: witnessed,
      refreshedAt: '2026-03-13T00:14:00.000Z',
      filecoinInfo: {
        pieceCid: piece.link.toString(),
        aggregates: [{ aggregate: aggregate.link.toString(), inclusionProofAvailable: false }],
        deals: [
          {
            aggregate: aggregate.link.toString(),
            provider: 'f01234',
            dealId: '44',
          },
        ],
        lastUpdatedAt: '2026-03-13T00:14:00.000Z',
      },
    });

    expect(refreshed.filecoinInfo?.deals[0]?.onChainSealWitness).toBe(sealWitness.proof);
    expect(refreshed.filecoinInfo?.deals[0]?.onChainSealWitnessCid).toBe(sealWitness.proofCid);
  });
});
