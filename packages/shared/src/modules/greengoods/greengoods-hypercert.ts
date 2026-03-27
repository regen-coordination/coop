import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { type Address, decodeEventLog, encodeFunctionData, getAddress } from 'viem';
import type {
  AuthSession,
  GreenGoodsHypercertAttestation,
  GreenGoodsHypercertCapital,
  GreenGoodsHypercertDomain,
  GreenGoodsHypercertDomainInput,
  GreenGoodsHypercertMintRequest,
  GreenGoodsHypercertOutcomeMetrics,
  OnchainState,
} from '../../contracts/schema';
import { greenGoodsHypercertMintRequestSchema } from '../../contracts/schema';
import { hashJson, toPseudoCid, unique } from '../../utils';
import type { CoopOnchainMode } from '../onchain/onchain';
import {
  type GreenGoodsLiveExecutor,
  type GreenGoodsTransactionResult,
  describeGreenGoodsMode,
  ensureLiveExecutionReady,
  getGreenGoodsDeployment,
  requireLiveExecutionCredentials,
  sendViaCoopSafe,
} from './greengoods-deployments';

export const GREEN_GOODS_HYPERCERT_TOTAL_UNITS = 100_000_000n;
export const GREEN_GOODS_HYPERCERT_PROTOCOL_VERSION = '1.0.0' as const;

type GreenGoodsHypercertAllowlistDump = ReturnType<StandardMerkleTree<any[]>['dump']>;
type GreenGoodsLiveReceipt = NonNullable<Awaited<ReturnType<GreenGoodsLiveExecutor>>['receipt']>;

const greenGoodsHypercertsModuleAbi = [
  {
    type: 'function',
    name: 'mintAndRegister',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'garden', type: 'address' },
      { name: 'totalUnits', type: 'uint256' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'metadataUri', type: 'string' },
    ],
    outputs: [{ name: 'hypercertId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'HypercertMintedAndRegistered',
    inputs: [
      { indexed: true, name: 'garden', type: 'address' },
      { indexed: true, name: 'hypercertId', type: 'uint256' },
      { indexed: false, name: 'pool', type: 'address' },
    ],
    anonymous: false,
  },
] as const;

export type GreenGoodsHypercertJsonUploader = (input: {
  kind: 'metadata' | 'allowlist';
  filename: string;
  payload: Record<string, unknown>;
}) => Promise<{
  cid: string;
  uri?: string;
}>;

export type GreenGoodsHypercertPackage = {
  metadata: Record<string, unknown>;
  allowlistTree: GreenGoodsHypercertAllowlistDump;
  merkleRoot: `0x${string}`;
  metadataCid: string;
  metadataUri: string;
  allowlistCid: string;
  allowlistUri: string;
};

export type GreenGoodsHypercertMintResult = GreenGoodsTransactionResult &
  GreenGoodsHypercertPackage & {
    hypercertId?: string;
  };

function normalizeGreenGoodsHypercertDomain(
  value?: GreenGoodsHypercertDomainInput,
): GreenGoodsHypercertDomain {
  switch (value) {
    case 'agro':
    case 'agroforestry':
      return 'agroforestry';
    case 'edu':
    case 'education':
      return 'education';
    case 'solar':
    case 'waste':
    case 'mutual_credit':
      return value;
    default:
      return 'mutual_credit';
  }
}

function formatEpochDay(value: number) {
  return new Date(value * 1000).toISOString().slice(0, 10);
}

function formatTimeframeDisplay(start: number, end: number | null, indefinite = false) {
  const startLabel = start > 0 ? formatEpochDay(start) : '';
  const endLabel =
    end === 0 && indefinite ? 'Indefinite' : end && end > 0 ? formatEpochDay(end) : '';
  return startLabel && endLabel ? `${startLabel} - ${endLabel}` : startLabel || endLabel || '';
}

function buildFallbackImage(title: string) {
  const safeTitle = title
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1200" viewBox="0 0 1200 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e5f8e5" />
      <stop offset="100%" stop-color="#cde6ff" />
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)" />
  <rect x="120" y="120" width="960" height="960" rx="48" fill="#ffffff" fill-opacity="0.92" />
  <text x="600" y="560" text-anchor="middle" font-family="'Inter', sans-serif" font-size="56" fill="#1f2937">
    ${safeTitle || 'Hypercert'}
  </text>
  <text x="600" y="760" text-anchor="middle" font-family="'Inter', sans-serif" font-size="24" fill="#9ca3af">Green Goods Hypercert</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function aggregateOutcomeMetrics(attestations: GreenGoodsHypercertAttestation[]) {
  const predefined: GreenGoodsHypercertOutcomeMetrics['predefined'] = {};

  for (const attestation of attestations) {
    if (!attestation.metrics) {
      continue;
    }
    for (const [key, metric] of Object.entries(attestation.metrics)) {
      if (!metric || typeof metric.value !== 'number' || Number.isNaN(metric.value)) {
        continue;
      }
      const existing = predefined[key];
      if (existing) {
        predefined[key] = {
          ...existing,
          value: existing.value + metric.value,
        };
      } else {
        predefined[key] = {
          value: metric.value,
          unit: metric.unit,
          aggregation: 'sum',
          label: key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .trim(),
        };
      }
    }
  }

  predefined.attestation_count = {
    value: attestations.length,
    unit: 'count',
    aggregation: 'count',
    label: 'Attestation count',
  };

  return {
    predefined,
    custom: {},
  } satisfies GreenGoodsHypercertOutcomeMetrics;
}

function hasOutcomeMetrics(outcomes: GreenGoodsHypercertOutcomeMetrics) {
  return Object.keys(outcomes.predefined).length > 0 || Object.keys(outcomes.custom).length > 0;
}

function deriveWorkTimeframe(attestations: GreenGoodsHypercertAttestation[]) {
  if (attestations.length === 0) {
    return { start: null, end: null } as const;
  }

  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;

  for (const attestation of attestations) {
    const createdAt = attestation.createdAt ?? attestation.approvedAt;
    const approvedAt = attestation.approvedAt ?? attestation.createdAt;
    if (typeof createdAt === 'number' && createdAt < start) {
      start = createdAt;
    }
    if (typeof approvedAt === 'number' && approvedAt > end) {
      end = approvedAt;
    }
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { start: null, end: null } as const;
  }

  return { start, end } as const;
}

function normalizeCapitals(input: GreenGoodsHypercertCapital[]) {
  return unique(input);
}

export function buildGreenGoodsHypercertMetadata(input: {
  request: GreenGoodsHypercertMintRequest;
}) {
  const request = greenGoodsHypercertMintRequestSchema.parse(input.request);
  const derivedTimeframe = deriveWorkTimeframe(request.attestations);
  const contributorAddresses = request.allowlist.map((entry) => getAddress(entry.address));
  const contributors = unique(contributorAddresses);
  const derivedWorkScopes = unique(request.attestations.flatMap((attestation) => attestation.workScope));
  const workScopes = request.workScopes.length > 0 ? request.workScopes : derivedWorkScopes;
  const normalizedWorkScopes = workScopes.length > 0 ? workScopes : ['all'];
  const impactScopes = request.impactScopes.length > 0 ? request.impactScopes : ['all'];
  const workTimeframeStart = request.workTimeframeStart ?? derivedTimeframe.start ?? 0;
  const workTimeframeEnd =
    request.workTimeframeEnd ?? derivedTimeframe.end ?? request.workTimeframeStart ?? workTimeframeStart;
  const impactTimeframeStart =
    request.impactTimeframeStart ?? request.workTimeframeStart ?? derivedTimeframe.start ?? workTimeframeStart;
  const impactTimeframeEnd = request.impactTimeframeEnd ?? 0;
  const normalizedDomain =
    request.domain ??
    request.attestations.find((attestation) => attestation.domain)?.domain ??
    'mutual_credit';

  return {
    name: request.title,
    description: request.description,
    image: request.imageUri ?? buildFallbackImage(request.title),
    ...(request.externalUrl ? { external_url: request.externalUrl } : {}),
    hypercert: {
      work_scope: {
        name: 'Work scope',
        value: normalizedWorkScopes,
        display_value: normalizedWorkScopes.join(', '),
      },
      impact_scope: {
        name: 'Impact scope',
        value: impactScopes,
        display_value: impactScopes.join(', '),
      },
      work_timeframe: {
        name: 'Work timeframe',
        value: [workTimeframeStart, workTimeframeEnd] as [number, number],
        display_value: formatTimeframeDisplay(workTimeframeStart, workTimeframeEnd),
      },
      impact_timeframe: {
        name: 'Impact timeframe',
        value: [impactTimeframeStart, impactTimeframeEnd] as [number, number],
        display_value: formatTimeframeDisplay(impactTimeframeStart, impactTimeframeEnd, true),
      },
      contributors: {
        name: 'Contributors',
        value: contributors,
        display_value: contributors.join(', '),
      },
      rights: {
        name: 'Rights',
        value: ['Public Display'],
        display_value: 'Public Display',
      },
    },
    hidden_properties: {
      gardenId: request.gardenAddress,
      attestationRefs: request.attestations.map((attestation) => ({
        uid: attestation.uid,
        title: attestation.title,
        domain: attestation.domain
          ? normalizeGreenGoodsHypercertDomain(attestation.domain)
          : undefined,
      })),
      sdgs: unique(request.sdgs),
      capitals: normalizeCapitals(request.capitals),
      outcomes: hasOutcomeMetrics(request.outcomes)
        ? request.outcomes
        : aggregateOutcomeMetrics(request.attestations),
      domain: normalizeGreenGoodsHypercertDomain(normalizedDomain),
      ...(request.gapProjectUid ? { karmaGapProjectId: request.gapProjectUid } : {}),
      protocolVersion: GREEN_GOODS_HYPERCERT_PROTOCOL_VERSION,
    },
  } satisfies Record<string, unknown>;
}

export function buildGreenGoodsHypercertAllowlistTree(input: {
  request: GreenGoodsHypercertMintRequest;
}) {
  const request = greenGoodsHypercertMintRequestSchema.parse(input.request);
  const values = request.allowlist.map(
    (entry) => [getAddress(entry.address), String(entry.units)] as [Address, string],
  );
  const tree = StandardMerkleTree.of(values, ['address', 'uint256']);
  return {
    root: tree.root as `0x${string}`,
    dump: tree.dump(),
  };
}

async function uploadGreenGoodsHypercertJson(input: {
  request: GreenGoodsHypercertMintRequest;
  uploader?: GreenGoodsHypercertJsonUploader;
  metadata: Record<string, unknown>;
  allowlistTree: GreenGoodsHypercertAllowlistDump;
}) {
  if (!input.uploader) {
    const metadataCid = toPseudoCid(hashJson(input.metadata));
    const allowlistCid = toPseudoCid(hashJson(input.allowlistTree));
    return {
      metadataCid,
      metadataUri: `ipfs://${metadataCid}`,
      allowlistCid,
      allowlistUri: `ipfs://${allowlistCid}`,
    };
  }

  const [metadataUpload, allowlistUpload] = await Promise.all([
    input.uploader({
      kind: 'metadata',
      filename: 'green-goods-hypercert-metadata.json',
      payload: input.metadata,
    }),
    input.uploader({
      kind: 'allowlist',
      filename: 'green-goods-hypercert-allowlist.json',
      payload: input.allowlistTree as unknown as Record<string, unknown>,
    }),
  ]);

  return {
    metadataCid: metadataUpload.cid,
    metadataUri: metadataUpload.uri ?? `ipfs://${metadataUpload.cid}`,
    allowlistCid: allowlistUpload.cid,
    allowlistUri: allowlistUpload.uri ?? `ipfs://${allowlistUpload.cid}`,
  };
}

export async function packageGreenGoodsHypercert(input: {
  mode: CoopOnchainMode;
  request: GreenGoodsHypercertMintRequest;
  uploader?: GreenGoodsHypercertJsonUploader;
}): Promise<GreenGoodsHypercertPackage> {
  const request = greenGoodsHypercertMintRequestSchema.parse(input.request);
  if (input.mode === 'live' && !input.uploader) {
    throw new Error(
      'A live archive-backed uploader is required before Green Goods Hypercert packaging can execute.',
    );
  }

  const metadata = buildGreenGoodsHypercertMetadata({ request });
  const allowlistTree = buildGreenGoodsHypercertAllowlistTree({ request });
  const uploads = await uploadGreenGoodsHypercertJson({
    request,
    uploader: input.uploader,
    metadata,
    allowlistTree: allowlistTree.dump,
  });

  return {
    metadata,
    allowlistTree: allowlistTree.dump,
    merkleRoot: allowlistTree.root,
    metadataCid: uploads.metadataCid,
    metadataUri: uploads.metadataUri,
    allowlistCid: uploads.allowlistCid,
    allowlistUri: uploads.allowlistUri,
  };
}

export function buildGreenGoodsHypercertMintCalldata(input: {
  hypercertsModule: Address;
  gardenAddress: Address;
  metadataUri: string;
  merkleRoot: `0x${string}`;
}) {
  return {
    to: input.hypercertsModule,
    data: encodeFunctionData({
      abi: greenGoodsHypercertsModuleAbi,
      functionName: 'mintAndRegister',
      args: [
        input.gardenAddress,
        GREEN_GOODS_HYPERCERT_TOTAL_UNITS,
        input.merkleRoot,
        input.metadataUri,
      ],
    }),
  };
}

function decodeHypercertIdFromReceipt(input: {
  receipt?: GreenGoodsLiveReceipt;
  moduleAddress: Address;
  gardenAddress: Address;
}) {
  if (!input.receipt) {
    return undefined;
  }

  for (const log of input.receipt.logs) {
    if (log.address.toLowerCase() !== input.moduleAddress.toLowerCase()) {
      continue;
    }
    try {
      const decoded = decodeEventLog({
        abi: greenGoodsHypercertsModuleAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== 'HypercertMintedAndRegistered') {
        continue;
      }
      const args = decoded.args as {
        garden: Address;
        hypercertId: bigint;
      };
      if (args.garden.toLowerCase() !== input.gardenAddress.toLowerCase()) {
        continue;
      }
      return args.hypercertId.toString();
    } catch {
      // Ignore unrelated logs and continue scanning the receipt.
    }
  }

  return undefined;
}

export async function mintGreenGoodsHypercert(input: {
  mode: CoopOnchainMode;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  request: GreenGoodsHypercertMintRequest;
  liveExecutor?: GreenGoodsLiveExecutor;
  uploader?: GreenGoodsHypercertJsonUploader;
}): Promise<GreenGoodsHypercertMintResult> {
  ensureLiveExecutionReady(input);

  const request = greenGoodsHypercertMintRequestSchema.parse(input.request);
  const packaged = await packageGreenGoodsHypercert({
    mode: input.mode,
    request,
    uploader: input.uploader,
  });

  if (input.mode !== 'live') {
    return {
      ...packaged,
      txHash: hashJson({
        kind: 'green-goods-mint-hypercert',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: request.gardenAddress,
        metadataUri: packaged.metadataUri,
        merkleRoot: packaged.merkleRoot,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} packaged a mock Green Goods Hypercert mint.`,
    };
  }

  const deployment = getGreenGoodsDeployment(input.onchainState.chainKey);
  const tx = buildGreenGoodsHypercertMintCalldata({
    hypercertsModule: deployment.hypercertsModule,
    gardenAddress: request.gardenAddress as Address,
    metadataUri: packaged.metadataUri,
    merkleRoot: packaged.merkleRoot,
  });
  const result = input.liveExecutor
    ? await input.liveExecutor({
        to: tx.to,
        data: tx.data,
      })
    : await (async () => {
        const credentials = requireLiveExecutionCredentials(input);
        return sendViaCoopSafe({
          authSession: credentials.authSession,
          pimlicoApiKey: credentials.pimlicoApiKey,
          onchainState: input.onchainState,
          to: tx.to,
          data: tx.data,
        });
      })();

  return {
    ...packaged,
    txHash: result.txHash,
    hypercertId: decodeHypercertIdFromReceipt({
      receipt: result.receipt,
      moduleAddress: deployment.hypercertsModule,
      gardenAddress: request.gardenAddress as Address,
    }),
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} minted a Green Goods Hypercert via the Hypercerts module.`,
  };
}
