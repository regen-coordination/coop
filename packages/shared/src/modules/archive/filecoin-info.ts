import type { ArchiveReceipt } from '../../contracts/schema';
import { nowIso } from '../../utils';
import {
  createArchiveDataAggregationProofArtifact,
  serializeArchiveInclusionProof,
} from './verification';

export type ArchiveFilecoinInfoInput = {
  piece?: { toString(): string } | string;
  aggregates?: Array<{
    aggregate: { toString(): string } | string;
    inclusion?: unknown;
  }>;
  deals?: Array<{
    aggregate: { toString(): string } | string;
    provider?: { toString(): string } | string;
    aux?: {
      dataType?: bigint | number | string;
      dataSource?: {
        dealID?: bigint | number | string;
      };
    };
  }>;
};

export type ArchiveReceiptFilecoinInfo = NonNullable<ArchiveReceipt['filecoinInfo']>;

export function isSummarizedArchiveFilecoinInfo(
  value: ArchiveFilecoinInfoInput | ArchiveReceiptFilecoinInfo,
): value is ArchiveReceiptFilecoinInfo {
  return (
    'pieceCid' in value ||
    'lastUpdatedAt' in value ||
    value.aggregates?.some(
      (aggregate) => 'inclusionProofAvailable' in aggregate || 'inclusionProof' in aggregate,
    ) === true ||
    value.deals?.some(
      (deal) => 'dealId' in deal || 'dataAggregationProof' in deal || 'onChainSealWitness' in deal,
    ) === true
  );
}

export function summarizeArchiveFilecoinInfo(
  value: ArchiveFilecoinInfoInput,
  updatedAt = nowIso(),
) {
  const aggregates =
    value.aggregates?.map((aggregate) => ({
      aggregate:
        typeof aggregate.aggregate === 'string'
          ? aggregate.aggregate
          : aggregate.aggregate.toString(),
      inclusionProofAvailable: Boolean(aggregate.inclusion),
      inclusionProof: aggregate.inclusion
        ? serializeArchiveInclusionProof(aggregate.inclusion)
        : undefined,
    })) ?? [];
  const aggregateProofsByCid = new Map(
    aggregates
      .filter((aggregate) => aggregate.inclusionProof)
      .map((aggregate) => [aggregate.aggregate, aggregate.inclusionProof as string]),
  );

  return {
    pieceCid:
      typeof value.piece === 'string'
        ? value.piece
        : value.piece
          ? value.piece.toString()
          : undefined,
    aggregates,
    deals:
      value.deals?.map((deal) => {
        const aggregateCid =
          typeof deal.aggregate === 'string' ? deal.aggregate : deal.aggregate.toString();
        const dealId =
          deal.aux?.dataSource?.dealID !== undefined
            ? String(deal.aux.dataSource.dealID)
            : undefined;
        const serializedInclusionProof = aggregateProofsByCid.get(aggregateCid);

        let proofArtifact:
          | {
              proof: string;
              proofCid: string;
            }
          | undefined;
        if (dealId && serializedInclusionProof) {
          try {
            proofArtifact = createArchiveDataAggregationProofArtifact({
              serializedInclusionProof,
              dealId,
            });
          } catch {
            proofArtifact = undefined;
          }
        }

        return {
          aggregate: aggregateCid,
          provider:
            typeof deal.provider === 'string'
              ? deal.provider
              : deal.provider
                ? deal.provider.toString()
                : undefined,
          dealId,
          dataAggregationProof: proofArtifact?.proof,
          dataAggregationProofCid: proofArtifact?.proofCid,
        };
      }) ?? [],
    lastUpdatedAt: updatedAt,
  } satisfies NonNullable<ArchiveReceipt['filecoinInfo']>;
}

export function normalizeArchiveReceiptFilecoinInfo(
  value: ArchiveFilecoinInfoInput | ArchiveReceiptFilecoinInfo,
  updatedAt: string,
) {
  if (isSummarizedArchiveFilecoinInfo(value)) {
    return {
      ...value,
      lastUpdatedAt: value.lastUpdatedAt ?? updatedAt,
    } satisfies ArchiveReceiptFilecoinInfo;
  }

  return summarizeArchiveFilecoinInfo(value, updatedAt);
}

export function mergeArchiveFilecoinInfo(
  previous: ArchiveReceipt['filecoinInfo'] | undefined,
  next: NonNullable<ArchiveReceipt['filecoinInfo']>,
) {
  if (!previous) {
    return next;
  }

  const previousAggregatesById = new Map(
    previous.aggregates.map((aggregate) => [aggregate.aggregate, aggregate]),
  );
  const nextAggregateIds = new Set(next.aggregates.map((aggregate) => aggregate.aggregate));
  const mergedAggregates = [
    ...next.aggregates.map((aggregate) => {
      const prior = previousAggregatesById.get(aggregate.aggregate);
      if (aggregate.inclusionProof || !prior?.inclusionProof) {
        return aggregate;
      }
      return {
        ...aggregate,
        inclusionProofAvailable: prior.inclusionProofAvailable,
        inclusionProof: prior.inclusionProof,
      };
    }),
    ...previous.aggregates.filter((aggregate) => !nextAggregateIds.has(aggregate.aggregate)),
  ];
  const mergedAggregatesById = new Map(
    mergedAggregates.map((aggregate) => [aggregate.aggregate, aggregate]),
  );

  const dealKey = (
    deal: NonNullable<NonNullable<ArchiveReceipt['filecoinInfo']>['deals']>[number],
  ) => `${deal.aggregate}:${deal.dealId ?? ''}`;
  const previousDealsByKey = new Map(previous.deals.map((deal) => [dealKey(deal), deal]));
  const nextDealKeys = new Set(next.deals.map((deal) => dealKey(deal)));
  const mergedDeals = [
    ...next.deals.map((deal) => {
      const prior = previousDealsByKey.get(dealKey(deal));
      let merged = {
        ...deal,
        dataAggregationProof: deal.dataAggregationProof ?? prior?.dataAggregationProof,
        dataAggregationProofCid: deal.dataAggregationProofCid ?? prior?.dataAggregationProofCid,
        onChainSealWitness: deal.onChainSealWitness ?? prior?.onChainSealWitness,
        onChainSealWitnessCid: deal.onChainSealWitnessCid ?? prior?.onChainSealWitnessCid,
      };

      if (!merged.dataAggregationProof && merged.dealId) {
        const inclusionProof = mergedAggregatesById.get(merged.aggregate)?.inclusionProof;
        if (inclusionProof) {
          try {
            const artifact = createArchiveDataAggregationProofArtifact({
              serializedInclusionProof: inclusionProof,
              dealId: merged.dealId,
            });
            merged = {
              ...merged,
              dataAggregationProof: artifact.proof,
              dataAggregationProofCid: artifact.proofCid,
            };
          } catch {
            // Preserve the rest of the follow-up data; validation will surface proof issues later.
          }
        }
      }

      return merged;
    }),
    ...previous.deals.filter((deal) => !nextDealKeys.has(dealKey(deal))),
  ];

  return {
    pieceCid: next.pieceCid ?? previous.pieceCid,
    aggregates: mergedAggregates,
    deals: mergedDeals,
    lastUpdatedAt: next.lastUpdatedAt,
  } satisfies NonNullable<ArchiveReceipt['filecoinInfo']>;
}
