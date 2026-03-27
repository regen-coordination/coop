import * as DataSegment from '@web3-storage/data-segment';
import { describe, expect, it } from 'vitest';
import { archiveReceiptSchema } from '../../../contracts/schema';
import { summarizeArchiveFilecoinInfo } from '../archive';
import {
  createArchiveDataAggregationProofArtifact,
  parseArchiveDataAggregationProof,
  parseArchiveInclusionProof,
  verifyArchiveDataAggregationProofArtifact,
} from '../verification';

describe('inclusion proof storage', () => {
  const fixedTimestamp = '2026-03-14T00:00:00.000Z';

  it('stores serialized inclusion proof when aggregate.inclusion is present', () => {
    const inclusionData = {
      subtree: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])],
      index: [new Uint8Array([7, 8, 9])],
    };

    const result = summarizeArchiveFilecoinInfo(
      {
        piece: 'bafkpiece',
        aggregates: [
          {
            aggregate: 'bafyaggregate',
            inclusion: inclusionData,
          },
        ],
        deals: [],
      },
      fixedTimestamp,
    );

    expect(result.aggregates).toHaveLength(1);
    expect(result.aggregates[0].inclusionProofAvailable).toBe(true);
    expect(result.aggregates[0].inclusionProof).toBeDefined();
    expect(typeof result.aggregates[0].inclusionProof).toBe('string');

    // The serialized proof should be parseable back to an object
    const proof = result.aggregates[0].inclusionProof;
    if (!proof) throw new Error('Expected inclusionProof to be defined');
    const parsed = JSON.parse(proof);
    expect(parsed).toHaveProperty('subtree');
    expect(parsed).toHaveProperty('index');
  });

  it('leaves inclusionProof undefined when aggregate.inclusion is absent', () => {
    const result = summarizeArchiveFilecoinInfo(
      {
        piece: 'bafkpiece',
        aggregates: [
          {
            aggregate: 'bafyaggregate',
          },
        ],
        deals: [],
      },
      fixedTimestamp,
    );

    expect(result.aggregates).toHaveLength(1);
    expect(result.aggregates[0].inclusionProofAvailable).toBe(false);
    expect(result.aggregates[0].inclusionProof).toBeUndefined();
  });

  it('handles multiple aggregates with mixed inclusion availability', () => {
    const result = summarizeArchiveFilecoinInfo(
      {
        piece: 'bafkpiece',
        aggregates: [
          {
            aggregate: 'bafyaggregate1',
            inclusion: { subtree: ['proof1'], index: 0 },
          },
          {
            aggregate: 'bafyaggregate2',
            // no inclusion
          },
          {
            aggregate: 'bafyaggregate3',
            inclusion: { subtree: ['proof3'], index: 2 },
          },
        ],
        deals: [],
      },
      fixedTimestamp,
    );

    expect(result.aggregates).toHaveLength(3);

    expect(result.aggregates[0].inclusionProofAvailable).toBe(true);
    expect(result.aggregates[0].inclusionProof).toBeDefined();

    expect(result.aggregates[1].inclusionProofAvailable).toBe(false);
    expect(result.aggregates[1].inclusionProof).toBeUndefined();

    expect(result.aggregates[2].inclusionProofAvailable).toBe(true);
    expect(result.aggregates[2].inclusionProof).toBeDefined();
  });

  it('backward compat: existing receipts without inclusionProof pass schema validation', () => {
    // Simulate a receipt created before the inclusionProof field existed
    const legacyReceipt = {
      id: 'receipt-legacy',
      scope: 'artifact',
      targetCoopId: 'coop-1',
      artifactIds: [],
      bundleReference: 'bundle-1',
      rootCid: 'bafyroot',
      shardCids: ['bafyshard'],
      pieceCids: ['bafkpiece'],
      gatewayUrl: 'https://storacha.link/ipfs/bafyroot',
      uploadedAt: '2026-03-14T00:00:00.000Z',
      filecoinStatus: 'indexed',
      delegationIssuer: 'did:key:issuer',
      filecoinInfo: {
        pieceCid: 'bafkpiece',
        aggregates: [
          {
            aggregate: 'bafyaggregate',
            inclusionProofAvailable: true,
            // No inclusionProof field — old format
          },
        ],
        deals: [],
        lastUpdatedAt: '2026-03-14T00:00:00.000Z',
      },
    };

    const parsed = archiveReceiptSchema.parse(legacyReceipt);
    expect(parsed.filecoinInfo?.aggregates[0].inclusionProofAvailable).toBe(true);
    expect(parsed.filecoinInfo?.aggregates[0].inclusionProof).toBeUndefined();
  });

  it('schema validates receipts with inclusionProof present', () => {
    const receiptWithProof = {
      id: 'receipt-with-proof',
      scope: 'artifact',
      targetCoopId: 'coop-1',
      artifactIds: [],
      bundleReference: 'bundle-1',
      rootCid: 'bafyroot',
      shardCids: ['bafyshard'],
      pieceCids: ['bafkpiece'],
      gatewayUrl: 'https://storacha.link/ipfs/bafyroot',
      uploadedAt: '2026-03-14T00:00:00.000Z',
      filecoinStatus: 'indexed',
      delegationIssuer: 'did:key:issuer',
      filecoinInfo: {
        pieceCid: 'bafkpiece',
        aggregates: [
          {
            aggregate: 'bafyaggregate',
            inclusionProofAvailable: true,
            inclusionProof: JSON.stringify({ subtree: ['a', 'b'], index: 1 }),
          },
        ],
        deals: [],
        lastUpdatedAt: '2026-03-14T00:00:00.000Z',
      },
    };

    const parsed = archiveReceiptSchema.parse(receiptWithProof);
    expect(parsed.filecoinInfo?.aggregates[0].inclusionProof).toBe(
      JSON.stringify({ subtree: ['a', 'b'], index: 1 }),
    );
    expect(parsed.filecoinInfo?.aggregates[0].inclusionProofAvailable).toBe(true);
  });

  it('round-trips real inclusion proofs that contain BigInt offsets and Uint8Array nodes', () => {
    const piece = DataSegment.Piece.fromPayload(new Uint8Array(65).fill(9));
    const aggregate = DataSegment.Aggregate.build({ pieces: [piece] });
    const proof = aggregate.resolveProof(piece.link);
    if (proof.error) {
      throw proof.error;
    }

    const result = summarizeArchiveFilecoinInfo(
      {
        piece: piece.link.toString(),
        aggregates: [
          {
            aggregate: aggregate.link.toString(),
            inclusion: {
              subtree: proof.ok[0],
              index: proof.ok[1],
            },
          },
        ],
        deals: [],
      },
      fixedTimestamp,
    );

    const serialized = result.aggregates[0]?.inclusionProof;
    expect(serialized).toBeDefined();
    const parsed = parseArchiveInclusionProof(serialized ?? '');
    const resolved = DataSegment.Inclusion.resolveAggregate(parsed, piece.link);

    expect(resolved.error).toBeUndefined();
    expect(resolved.ok?.toString()).toBe(aggregate.link.toString());
  });

  it('stores and verifies canonical data aggregation proofs for sealed deals', () => {
    const piece = DataSegment.Piece.fromPayload(new Uint8Array(65).fill(5));
    const aggregate = DataSegment.Aggregate.build({ pieces: [piece] });
    const proof = aggregate.resolveProof(piece.link);
    if (proof.error) {
      throw proof.error;
    }

    const result = summarizeArchiveFilecoinInfo(
      {
        piece: piece.link.toString(),
        aggregates: [
          {
            aggregate: aggregate.link.toString(),
            inclusion: {
              subtree: proof.ok[0],
              index: proof.ok[1],
            },
          },
        ],
        deals: [
          {
            aggregate: aggregate.link.toString(),
            provider: 'f01234',
            aux: { dataSource: { dealID: 44 } },
          },
        ],
      },
      fixedTimestamp,
    );

    const storedDeal = result.deals[0];
    expect(storedDeal?.dataAggregationProof).toBeDefined();
    expect(storedDeal?.dataAggregationProofCid).toBeDefined();

    const verification = verifyArchiveDataAggregationProofArtifact({
      aggregateCid: aggregate.link.toString(),
      pieceCid: piece.link.toString(),
      dealId: '44',
      serializedProof: storedDeal?.dataAggregationProof ?? '',
      proofCid: storedDeal?.dataAggregationProofCid,
    });

    expect(verification.ok).toBe(true);

    const decoded = parseArchiveDataAggregationProof(storedDeal?.dataAggregationProof ?? '');
    expect(DataSegment.DataAggregationProof.dealID(decoded)).toBe(44n);
  });

  it('creates canonical data aggregation proof artifacts from stored inclusion proofs', () => {
    const piece = DataSegment.Piece.fromPayload(new Uint8Array(65).fill(3));
    const aggregate = DataSegment.Aggregate.build({ pieces: [piece] });
    const proof = aggregate.resolveProof(piece.link);
    if (proof.error) {
      throw proof.error;
    }

    const artifact = createArchiveDataAggregationProofArtifact({
      serializedInclusionProof: JSON.stringify(
        {
          subtree: proof.ok[0],
          index: proof.ok[1],
        },
        (_key, value) => {
          if (typeof value === 'bigint') {
            return value.toString();
          }
          if (value instanceof Uint8Array) {
            return Array.from(value);
          }
          return value;
        },
      ),
      dealId: 99,
    });

    const verification = verifyArchiveDataAggregationProofArtifact({
      aggregateCid: aggregate.link.toString(),
      pieceCid: piece.link.toString(),
      dealId: 99,
      serializedProof: artifact.proof,
      proofCid: artifact.proofCid,
    });

    expect(verification.ok).toBe(true);
  });
});
