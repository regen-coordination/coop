import type {
  ArchiveBlobUpload,
  ArchiveBundle,
  ArchivePayloadEncryption,
  ArchiveReceipt,
  ArchiveRecoveryRecord,
  Artifact,
  CoopArchiveConfig,
  CoopArchiveSecrets,
  CoopChainKey,
  CoopSharedState,
  TrustedNodeArchiveConfig,
} from '../../contracts/schema';
import { trustedNodeArchiveConfigSchema } from '../../contracts/schema';
import { createId, extractDomain, nowIso, toPseudoCid } from '../../utils';
import { decryptArchivePayloadEnvelope, isArchiveEncryptedEnvelope } from './crypto';
import { verifyArchiveOnChainSealWitnessArtifact } from './filecoin-witness';
import {
  computeStorachaFileRootCid,
  createArchiveDataAggregationProofArtifact,
  parseArchiveInclusionProof,
  serializeArchiveInclusionProof,
  verifyArchiveDataAggregationProofArtifact,
  verifyArchiveInclusionProofArtifact,
} from './verification';

type ArchiveFilecoinInfoInput = {
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

function isSummarizedArchiveFilecoinInfo(
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

export interface ArchiveRetrievalVerification {
  payloadBoundToReceipt: boolean;
  receiptIssues: string[];
}

type ArchiveReceiptFilecoinInfo = NonNullable<ArchiveReceipt['filecoinInfo']>;

function findLatestSnapshotCid(receipts: readonly ArchiveReceipt[]): string | undefined {
  let latest: ArchiveReceipt | undefined;
  for (const receipt of receipts) {
    if (receipt.scope !== 'snapshot') continue;
    if (!latest || Date.parse(receipt.uploadedAt) > Date.parse(latest.uploadedAt)) {
      latest = receipt;
    }
  }
  return latest?.rootCid;
}

function normalizeUploadedBlob(upload: ArchiveBlobUpload) {
  return typeof upload === 'string' ? { archiveCid: upload } : upload;
}

function applyBlobUploadsToArtifact(
  artifact: Artifact,
  blobUploads: Record<string, ArchiveBlobUpload>,
) {
  if (!Array.isArray(artifact.attachments) || artifact.attachments.length === 0) {
    return artifact;
  }

  let changed = false;
  const attachments = artifact.attachments.map((attachment) => {
    const upload = blobUploads[attachment.blobId];
    if (!upload) {
      return attachment;
    }
    const normalized = normalizeUploadedBlob(upload);
    const archiveCid = normalized.archiveCid;
    const archiveEncryption = normalized.archiveEncryption;
    const alreadyApplied =
      attachment.archiveCid === archiveCid &&
      (!archiveEncryption ||
        JSON.stringify(attachment.archiveEncryption) === JSON.stringify(archiveEncryption));
    if (alreadyApplied) {
      return attachment;
    }

    changed = true;
    return {
      ...attachment,
      archiveCid,
      archiveEncryption,
    };
  });

  if (!changed) {
    return artifact;
  }

  return {
    ...artifact,
    attachments,
  };
}

export function applyArchiveBlobCidsToPayload(
  payload: Record<string, unknown>,
  blobUploads: Record<string, ArchiveBlobUpload>,
) {
  if (Object.keys(blobUploads).length === 0) {
    return payload;
  }

  const blobCids = Object.fromEntries(
    Object.entries(blobUploads).map(([blobId, upload]) => [
      blobId,
      normalizeUploadedBlob(upload).archiveCid,
    ]),
  );
  const nextPayload: Record<string, unknown> = {
    ...payload,
    blobCids,
  };

  if (!Array.isArray(payload.artifacts)) {
    return nextPayload;
  }

  let changed = false;
  const artifacts = payload.artifacts.map((artifact) => {
    if (!artifact || typeof artifact !== 'object') {
      return artifact;
    }

    const nextArtifact = applyBlobUploadsToArtifact(artifact as Artifact, blobUploads);
    if (nextArtifact !== artifact) {
      changed = true;
    }
    return nextArtifact;
  });

  if (changed) {
    nextPayload.artifacts = artifacts;
  }

  return nextPayload;
}

function validateArchiveGatewayBinding(receipt: ArchiveReceipt) {
  const issues: string[] = [];

  try {
    const url = new URL(receipt.gatewayUrl);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const ipfsIndex = pathSegments.lastIndexOf('ipfs');
    const gatewayRootCid =
      ipfsIndex >= 0 ? pathSegments[ipfsIndex + 1] : pathSegments[pathSegments.length - 1];

    if (!gatewayRootCid) {
      issues.push('Archive gateway URL does not contain an IPFS root CID.');
    } else if (gatewayRootCid !== receipt.rootCid) {
      issues.push('Archive gateway URL root CID does not match the stored receipt root CID.');
    }
  } catch {
    issues.push('Archive gateway URL is invalid.');
  }

  return issues;
}

function validateArchiveInclusionProof(
  aggregate: NonNullable<NonNullable<ArchiveReceipt['filecoinInfo']>['aggregates']>[number],
  pieceCid?: string,
) {
  if (!aggregate.inclusionProofAvailable && aggregate.inclusionProof) {
    return [
      `Aggregate ${aggregate.aggregate} stores an inclusion proof but is not marked as available.`,
    ];
  }

  if (!aggregate.inclusionProofAvailable) {
    return [];
  }

  if (!aggregate.inclusionProof) {
    return [
      `Aggregate ${aggregate.aggregate} is marked as having an inclusion proof, but none is stored.`,
    ];
  }

  if (!pieceCid) {
    try {
      parseArchiveInclusionProof(aggregate.inclusionProof);
      return [
        `Aggregate ${aggregate.aggregate} has an inclusion proof, but no piece CID is stored for verification.`,
      ];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown proof parsing error.';
      return [`Aggregate ${aggregate.aggregate} inclusion proof is invalid: ${message}`];
    }
  }

  try {
    const verification = verifyArchiveInclusionProofArtifact({
      aggregateCid: aggregate.aggregate,
      pieceCid,
      serializedProof: aggregate.inclusionProof,
    });

    if (!verification.ok) {
      return [
        `Aggregate ${aggregate.aggregate} inclusion proof could not be verified: ${verification.error.message}`,
      ];
    }

    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proof parsing error.';
    return [`Aggregate ${aggregate.aggregate} inclusion proof is invalid: ${message}`];
  }
}

function validateArchiveDataAggregationProof(
  deal: NonNullable<NonNullable<ArchiveReceipt['filecoinInfo']>['deals']>[number],
  aggregate:
    | NonNullable<NonNullable<ArchiveReceipt['filecoinInfo']>['aggregates']>[number]
    | undefined,
  pieceCid?: string,
) {
  if (!deal.dataAggregationProof && !deal.dataAggregationProofCid) {
    if (!deal.dealId) {
      return [];
    }

    if (!aggregate) {
      return [];
    }

    if (!aggregate.inclusionProof) {
      return [
        `Deal for aggregate ${deal.aggregate} cannot be cryptographically verified because no matching inclusion proof is stored.`,
      ];
    }

    if (!pieceCid) {
      return [
        `Deal for aggregate ${deal.aggregate} has verifiable proof inputs, but no piece CID is stored for verification.`,
      ];
    }

    try {
      const synthesized = createArchiveDataAggregationProofArtifact({
        serializedInclusionProof: aggregate.inclusionProof,
        dealId: deal.dealId,
      });
      const verification = verifyArchiveDataAggregationProofArtifact({
        aggregateCid: deal.aggregate,
        pieceCid,
        dealId: deal.dealId,
        serializedProof: synthesized.proof,
        proofCid: synthesized.proofCid,
      });

      if (!verification.ok) {
        return [
          `Deal for aggregate ${deal.aggregate} could not be verified from the stored proof inputs: ${verification.error.message}`,
        ];
      }

      return [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown proof synthesis error.';
      return [
        `Deal for aggregate ${deal.aggregate} could not be verified from the stored proof inputs: ${message}`,
      ];
    }
  }

  if (!deal.dataAggregationProof) {
    return [
      `Deal for aggregate ${deal.aggregate} stores a data aggregation proof CID but no proof artifact.`,
    ];
  }

  if (!deal.dataAggregationProofCid) {
    return [
      `Deal for aggregate ${deal.aggregate} stores a data aggregation proof but no proof CID.`,
    ];
  }

  if (!deal.dealId) {
    return [`Deal for aggregate ${deal.aggregate} stores a data aggregation proof but no deal ID.`];
  }

  if (!pieceCid) {
    return [
      `Deal for aggregate ${deal.aggregate} has a data aggregation proof, but no piece CID is stored for verification.`,
    ];
  }

  try {
    const verification = verifyArchiveDataAggregationProofArtifact({
      aggregateCid: deal.aggregate,
      pieceCid,
      dealId: deal.dealId,
      serializedProof: deal.dataAggregationProof,
      proofCid: deal.dataAggregationProofCid,
    });

    if (!verification.ok) {
      return [
        `Deal for aggregate ${deal.aggregate} data aggregation proof could not be verified: ${verification.error.message}`,
      ];
    }

    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proof parsing error.';
    return [`Deal for aggregate ${deal.aggregate} data aggregation proof is invalid: ${message}`];
  }
}

async function validateArchiveOnChainSealWitness(
  deal: NonNullable<NonNullable<ArchiveReceipt['filecoinInfo']>['deals']>[number],
  pieceCid: string | undefined,
  requireWitness: boolean,
) {
  if (!deal.onChainSealWitness && !deal.onChainSealWitnessCid) {
    if (requireWitness && deal.dealId) {
      return [
        `Deal for aggregate ${deal.aggregate} is missing an independent on-chain seal witness artifact.`,
      ];
    }
    return [];
  }

  if (!deal.onChainSealWitness) {
    return [
      `Deal for aggregate ${deal.aggregate} stores an on-chain seal witness CID but no witness artifact.`,
    ];
  }

  if (!deal.onChainSealWitnessCid) {
    return [
      `Deal for aggregate ${deal.aggregate} stores an on-chain seal witness but no witness CID.`,
    ];
  }

  if (!deal.dealId) {
    return [`Deal for aggregate ${deal.aggregate} stores an on-chain seal witness but no deal ID.`];
  }

  if (!pieceCid) {
    return [
      `Deal for aggregate ${deal.aggregate} has an on-chain seal witness, but no piece CID is stored for verification.`,
    ];
  }

  const verification = await verifyArchiveOnChainSealWitnessArtifact({
    pieceCid,
    dealId: deal.dealId,
    provider: deal.provider,
    serializedProof: deal.onChainSealWitness,
    proofCid: deal.onChainSealWitnessCid,
  });

  if (!verification.ok) {
    return [
      `Deal for aggregate ${deal.aggregate} on-chain seal witness could not be verified: ${verification.error.message}`,
    ];
  }

  return [];
}

export async function validateArchiveReceiptConsistency(
  receipt: ArchiveReceipt,
  options?: {
    requireOnChainSealWitness?: boolean;
  },
) {
  const issues = [...validateArchiveGatewayBinding(receipt)];
  const pieceCid = receipt.filecoinInfo?.pieceCid ?? receipt.pieceCids[0];

  if (receipt.contentEncoding === 'encrypted-envelope' && !receipt.encryption) {
    issues.push('Encrypted archive receipts must store payload encryption metadata.');
  }

  if (receipt.contentEncoding !== 'encrypted-envelope' && receipt.encryption) {
    issues.push('Plain archive receipts must not store encrypted-envelope metadata.');
  }

  if (
    receipt.filecoinInfo?.pieceCid &&
    receipt.pieceCids[0] &&
    receipt.filecoinInfo.pieceCid !== receipt.pieceCids[0]
  ) {
    issues.push('Archive receipt piece CID does not match the stored Filecoin info piece CID.');
  }

  const aggregates = receipt.filecoinInfo?.aggregates ?? [];
  const deals = receipt.filecoinInfo?.deals ?? [];
  const aggregatesById = new Map(aggregates.map((aggregate) => [aggregate.aggregate, aggregate]));

  for (const aggregate of aggregates) {
    issues.push(...validateArchiveInclusionProof(aggregate, pieceCid));
  }

  for (const deal of deals) {
    const matchingAggregate = aggregatesById.get(deal.aggregate);
    if (!matchingAggregate) {
      issues.push(
        `Deal for aggregate ${deal.aggregate} is stored without a matching aggregate record.`,
      );
    }
    issues.push(...validateArchiveDataAggregationProof(deal, matchingAggregate, pieceCid));
  }

  if (receipt.filecoinStatus === 'indexed' && aggregates.length === 0) {
    issues.push('Indexed archive receipts must include at least one aggregate record.');
  }

  if (receipt.filecoinStatus === 'sealed') {
    if (deals.length === 0) {
      issues.push('Sealed archive receipts must include at least one deal record.');
    }
    for (const deal of deals) {
      if (!deal.dealId) {
        issues.push(`Sealed deal for aggregate ${deal.aggregate} is missing a deal ID.`);
      }
      issues.push(
        ...(await validateArchiveOnChainSealWitness(
          deal,
          pieceCid,
          options?.requireOnChainSealWitness === true,
        )),
      );
    }
  }

  return issues;
}

export function createArchiveRecoveryRecord(input: {
  coopId: string;
  receipt: ArchiveReceipt;
  artifactIds?: string[];
  blobUploads?: Record<string, ArchiveBlobUpload>;
  lastError?: string;
}) {
  return {
    id: createId('archive-recovery'),
    coopId: input.coopId,
    createdAt: nowIso(),
    receipt: input.receipt,
    artifactIds: input.artifactIds ?? [],
    blobUploads: input.blobUploads ?? {},
    lastError: input.lastError,
  } satisfies ArchiveRecoveryRecord;
}

export function applyArchiveRecoveryRecord(
  state: CoopSharedState,
  recovery: ArchiveRecoveryRecord,
) {
  if (recovery.receipt.targetCoopId !== state.profile.id) {
    throw new Error('Archive recovery record does not belong to this coop.');
  }

  if (state.archiveReceipts.some((receipt) => receipt.id === recovery.receipt.id)) {
    return state;
  }

  return recordArchiveReceipt(state, recovery.receipt, recovery.artifactIds, recovery.blobUploads);
}

export function createArchiveBundle(input: {
  scope: ArchiveBundle['scope'];
  state: CoopSharedState;
  artifactIds?: string[];
  blobs?: Map<string, Uint8Array>;
}) {
  const payload: Record<string, unknown> =
    input.scope === 'artifact'
      ? {
          coop: {
            id: input.state.profile.id,
            name: input.state.profile.name,
          },
          artifacts: input.state.artifacts.filter((artifact) =>
            (input.artifactIds ?? []).includes(artifact.id),
          ),
        }
      : {
          ...structuredClone(input.state),
          previousSnapshotCid: findLatestSnapshotCid(input.state.archiveReceipts),
        };

  if (input.blobs && input.blobs.size > 0) {
    payload.blobManifest = Array.from(input.blobs.entries()).map(([blobId, bytes]) => ({
      blobId,
      byteSize: bytes.length,
    }));
  }

  const bundle = {
    id: createId('bundle'),
    scope: input.scope,
    targetCoopId: input.state.profile.id,
    createdAt: nowIso(),
    schemaVersion: 1,
    payload,
  } satisfies ArchiveBundle;

  return {
    ...bundle,
    blobBytes: input.blobs,
  };
}

export function createMockArchiveReceipt(input: {
  bundle: ArchiveBundle;
  delegationIssuer: string;
  artifactIds?: string[];
}): ArchiveReceipt {
  const rootCid = toPseudoCid(JSON.stringify(input.bundle.payload));
  return {
    id: createId('receipt'),
    scope: input.bundle.scope,
    targetCoopId: input.bundle.targetCoopId,
    artifactIds: input.artifactIds ?? [],
    bundleReference: input.bundle.id,
    rootCid,
    shardCids: [toPseudoCid(`${rootCid}:shard:0`)],
    pieceCids: [],
    gatewayUrl: `https://storacha.link/ipfs/${rootCid}`,
    uploadedAt: nowIso(),
    filecoinStatus: 'offered',
    delegationIssuer: input.delegationIssuer,
    contentEncoding: 'plain-json',
    delegation: {
      issuer: input.delegationIssuer,
      mode: 'mock',
      allowsFilecoinInfo: false,
    },
    followUp: {
      refreshCount: 0,
    },
    filecoinInfo: undefined,
    anchorStatus: 'pending',
  };
}

export function createArchiveReceiptFromUpload(input: {
  bundle: ArchiveBundle;
  delegationIssuer: string;
  delegationMode?: NonNullable<ArchiveReceipt['delegation']>['mode'];
  delegationIssuerUrl?: string;
  delegationAudienceDid?: string;
  allowsFilecoinInfo?: boolean;
  rootCid: string;
  shardCids: string[];
  pieceCids: string[];
  gatewayUrl: string;
  artifactIds?: string[];
  uploadedAt?: string;
  filecoinStatus?: ArchiveReceipt['filecoinStatus'];
  contentEncoding?: ArchiveReceipt['contentEncoding'];
  encryption?: ArchivePayloadEncryption;
}): ArchiveReceipt {
  return {
    id: createId('receipt'),
    scope: input.bundle.scope,
    targetCoopId: input.bundle.targetCoopId,
    artifactIds: input.artifactIds ?? [],
    bundleReference: input.bundle.id,
    rootCid: input.rootCid,
    shardCids: input.shardCids,
    pieceCids: input.pieceCids,
    gatewayUrl: input.gatewayUrl,
    uploadedAt: input.uploadedAt ?? nowIso(),
    filecoinStatus: input.filecoinStatus ?? (input.pieceCids.length > 0 ? 'offered' : 'pending'),
    delegationIssuer: input.delegationIssuer,
    contentEncoding: input.contentEncoding ?? 'plain-json',
    encryption: input.encryption,
    delegation: {
      issuer: input.delegationIssuer,
      issuerUrl: input.delegationIssuerUrl,
      audienceDid: input.delegationAudienceDid,
      mode: input.delegationMode ?? 'live',
      allowsFilecoinInfo: input.allowsFilecoinInfo ?? false,
    },
    followUp: {
      refreshCount: 0,
    },
    filecoinInfo:
      input.pieceCids.length > 0
        ? {
            pieceCid: input.pieceCids[0],
            aggregates: [],
            deals: [],
          }
        : undefined,
    anchorStatus: 'pending',
  };
}

export function deriveArchiveReceiptFilecoinStatus(input: {
  currentStatus?: ArchiveReceipt['filecoinStatus'];
  pieceCids?: string[];
  filecoinInfo?: ArchiveReceipt['filecoinInfo'];
}) {
  if ((input.filecoinInfo?.deals.length ?? 0) > 0) {
    return 'sealed' satisfies ArchiveReceipt['filecoinStatus'];
  }

  if ((input.filecoinInfo?.aggregates.length ?? 0) > 0) {
    return 'indexed' satisfies ArchiveReceipt['filecoinStatus'];
  }

  if ((input.pieceCids?.length ?? 0) > 0 || input.filecoinInfo?.pieceCid) {
    return 'offered' satisfies ArchiveReceipt['filecoinStatus'];
  }

  return input.currentStatus ?? ('pending' satisfies ArchiveReceipt['filecoinStatus']);
}

export function isArchiveReceiptRefreshable(receipt: ArchiveReceipt) {
  return (
    receipt.delegation?.mode === 'live' &&
    receipt.filecoinStatus !== 'sealed' &&
    Boolean(receipt.filecoinInfo?.pieceCid ?? receipt.pieceCids[0])
  );
}

export function doesArchiveReceiptNeedOnChainSealWitness(receipt: ArchiveReceipt) {
  return (
    receipt.delegation?.mode === 'live' &&
    receipt.filecoinStatus === 'sealed' &&
    Boolean(receipt.filecoinInfo?.pieceCid ?? receipt.pieceCids[0]) &&
    (receipt.filecoinInfo?.deals ?? []).some(
      (deal) => Boolean(deal.dealId) && (!deal.onChainSealWitness || !deal.onChainSealWitnessCid),
    )
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

function normalizeArchiveReceiptFilecoinInfo(
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

function mergeArchiveFilecoinInfo(
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

export function applyArchiveReceiptFollowUp(input: {
  receipt: ArchiveReceipt;
  refreshedAt?: string;
  filecoinInfo?: ArchiveFilecoinInfoInput | ArchiveReceiptFilecoinInfo;
  error?: string;
}) {
  const refreshedAt = input.refreshedAt ?? nowIso();
  const nextFilecoinInfo = input.filecoinInfo
    ? mergeArchiveFilecoinInfo(
        input.receipt.filecoinInfo,
        normalizeArchiveReceiptFilecoinInfo(input.filecoinInfo, refreshedAt),
      )
    : input.receipt.filecoinInfo;
  const nextStatus = deriveArchiveReceiptFilecoinStatus({
    currentStatus: input.receipt.filecoinStatus,
    pieceCids: input.receipt.pieceCids,
    filecoinInfo: nextFilecoinInfo,
  });
  const statusChanged = nextStatus !== input.receipt.filecoinStatus;

  return {
    ...input.receipt,
    filecoinStatus: nextStatus,
    filecoinInfo: nextFilecoinInfo,
    followUp: {
      refreshCount: (input.receipt.followUp?.refreshCount ?? 0) + 1,
      lastRefreshRequestedAt: refreshedAt,
      lastRefreshedAt: input.error ? input.receipt.followUp?.lastRefreshedAt : refreshedAt,
      lastStatusChangeAt: statusChanged ? refreshedAt : input.receipt.followUp?.lastStatusChangeAt,
      lastError: input.error,
    },
  } satisfies ArchiveReceipt;
}

export function applyArchiveOnChainSealWitnesses(
  receipt: ArchiveReceipt,
  witnesses: Array<{
    aggregate: string;
    dealId: string;
    proof: string;
    proofCid: string;
  }>,
) {
  if (!receipt.filecoinInfo || witnesses.length === 0) {
    return receipt;
  }

  const witnessByDeal = new Map(
    witnesses.map((witness) => [`${witness.aggregate}:${witness.dealId}`, witness]),
  );
  let changed = false;
  const deals = receipt.filecoinInfo.deals.map((deal) => {
    const witness = deal.dealId ? witnessByDeal.get(`${deal.aggregate}:${deal.dealId}`) : undefined;
    if (!witness) {
      return deal;
    }

    if (
      deal.onChainSealWitness === witness.proof &&
      deal.onChainSealWitnessCid === witness.proofCid
    ) {
      return deal;
    }

    changed = true;
    return {
      ...deal,
      onChainSealWitness: witness.proof,
      onChainSealWitnessCid: witness.proofCid,
    };
  });

  if (!changed) {
    return receipt;
  }

  return {
    ...receipt,
    filecoinInfo: {
      ...receipt.filecoinInfo,
      deals,
    },
  };
}

export function applyArchiveAnchor(
  receipt: ArchiveReceipt,
  anchor: { txHash: string; chainKey: CoopChainKey },
): ArchiveReceipt {
  return {
    ...receipt,
    anchorTxHash: anchor.txHash,
    anchorChainKey: anchor.chainKey,
    anchorStatus: 'anchored' as const,
  };
}

export function updateArchiveReceipt(
  state: CoopSharedState,
  receiptId: string,
  nextReceipt: ArchiveReceipt,
) {
  let updated = false;
  const archiveReceipts = state.archiveReceipts.map((receipt) => {
    if (receipt.id !== receiptId) {
      return receipt;
    }

    updated = true;
    return nextReceipt;
  });

  if (!updated) {
    return state;
  }

  return {
    ...state,
    archiveReceipts,
  } satisfies CoopSharedState;
}

export function recordArchiveReceipt(
  state: CoopSharedState,
  receipt: ArchiveReceipt,
  artifactIds: string[] = [],
  blobCids?: Record<string, ArchiveBlobUpload>,
) {
  const archivedArtifacts = state.artifacts.filter((artifact) => artifactIds.includes(artifact.id));
  const nextArchiveSignals = structuredClone(state.memoryProfile.archiveSignals);
  const blobCidMap = blobCids ?? {};
  const hasBlobCids = Object.keys(blobCidMap).length > 0;
  const shouldPatchAllArtifacts = receipt.scope === 'snapshot' && artifactIds.length === 0;

  for (const artifact of archivedArtifacts) {
    for (const tag of artifact.tags) {
      nextArchiveSignals.archivedTagCounts[tag] =
        (nextArchiveSignals.archivedTagCounts[tag] ?? 0) + 1;
    }
    const domain = extractDomain(artifact.sources[0]?.url ?? 'https://coop.local');
    nextArchiveSignals.archivedDomainCounts[domain] =
      (nextArchiveSignals.archivedDomainCounts[domain] ?? 0) + 1;
  }

  return {
    ...state,
    archiveReceipts: [...state.archiveReceipts, receipt],
    memoryProfile: {
      ...state.memoryProfile,
      updatedAt: nowIso(),
      archiveSignals: nextArchiveSignals,
    },
    artifacts: state.artifacts.map((artifact) => {
      const patchedArtifact =
        shouldPatchAllArtifacts || hasBlobCids
          ? applyBlobUploadsToArtifact(artifact, blobCidMap)
          : artifact;

      if (!artifactIds.includes(artifact.id)) {
        return patchedArtifact;
      }

      return {
        ...patchedArtifact,
        archiveStatus: 'archived' as const,
        archiveReceiptIds: [...patchedArtifact.archiveReceiptIds, receipt.id],
      };
    }),
  };
}

/**
 * Merge a public CoopArchiveConfig (from CRDT state) with local
 * CoopArchiveSecrets (from Dexie) into a full TrustedNodeArchiveConfig.
 */
export function mergeCoopArchiveConfig(
  publicConfig: CoopArchiveConfig,
  secrets: CoopArchiveSecrets,
): TrustedNodeArchiveConfig {
  return trustedNodeArchiveConfigSchema.parse({
    spaceDid: publicConfig.spaceDid,
    delegationIssuer: publicConfig.delegationIssuer,
    gatewayBaseUrl: publicConfig.gatewayBaseUrl,
    allowsFilecoinInfo: publicConfig.allowsFilecoinInfo,
    expirationSeconds: publicConfig.expirationSeconds,
    agentPrivateKey: secrets.agentPrivateKey,
    spaceDelegation: secrets.spaceDelegation,
    proofs: secrets.proofs,
    filecoinWitnessRpcUrl: secrets.filecoinWitnessRpcUrl,
    filecoinWitnessRpcToken: secrets.filecoinWitnessRpcToken,
  });
}

/**
 * Fetch archived content from the IPFS gateway and verify the CID.
 *
 * Verification recomputes the UnixFS file root CID that Storacha generated at
 * upload time and compares it to the stored receipt root CID. The payload is
 * still returned so that callers can decide how to proceed.
 */
export async function retrieveArchiveBundle(
  receipt: ArchiveReceipt,
  archiveConfig?: TrustedNodeArchiveConfig,
): Promise<{
  payload: Record<string, unknown>;
  verified: boolean;
  schemaVersion?: number;
  verification: ArchiveRetrievalVerification;
}> {
  if (!receipt.gatewayUrl) {
    throw new Error('Archive receipt has no gateway URL.');
  }

  const response = await fetch(receipt.gatewayUrl, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Gateway fetch failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const fetched = JSON.parse(text) as Record<string, unknown>;
  const receiptIssues = await validateArchiveReceiptConsistency(receipt, {
    requireOnChainSealWitness:
      Boolean(archiveConfig?.filecoinWitnessRpcUrl) && receipt.filecoinStatus === 'sealed',
  });
  const computedRootCid = await computeStorachaFileRootCid(
    new Blob([text], { type: 'application/json' }),
  );
  const rootCidMatchesReceipt = computedRootCid === receipt.rootCid;

  if (isArchiveEncryptedEnvelope(fetched)) {
    if (
      receipt.encryption &&
      (fetched.algorithm !== receipt.encryption.algorithm ||
        fetched.keyDerivation !== receipt.encryption.keyDerivation)
    ) {
      throw new Error(
        'Encrypted archive envelope does not match the stored receipt encryption metadata.',
      );
    }

    if (!archiveConfig) {
      throw new Error('Archive bundle is encrypted, but local archive secrets are unavailable.');
    }

    const payload = await decryptArchivePayloadEnvelope({
      envelope: fetched,
      receipt: {
        bundleReference: receipt.bundleReference,
        scope: receipt.scope,
        targetCoopId: receipt.targetCoopId,
      },
      config: archiveConfig,
    });
    const schemaVersion =
      typeof payload.schemaVersion === 'number' ? payload.schemaVersion : undefined;
    return {
      payload,
      verified: rootCidMatchesReceipt,
      schemaVersion,
      verification: {
        payloadBoundToReceipt: rootCidMatchesReceipt,
        receiptIssues,
      },
    };
  }

  if (receipt.contentEncoding === 'encrypted-envelope') {
    throw new Error(
      'Archive receipt expects an encrypted envelope, but the gateway returned plaintext content.',
    );
  }

  const schemaVersion =
    typeof fetched.schemaVersion === 'number' ? fetched.schemaVersion : undefined;

  return {
    payload: fetched,
    verified: rootCidMatchesReceipt,
    schemaVersion,
    verification: {
      payloadBoundToReceipt: rootCidMatchesReceipt,
      receiptIssues,
    },
  };
}
