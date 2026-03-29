import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';
import {
  type ArchiveOnChainSealWitnessArtifact,
  archiveOnChainSealWitnessArtifactSchema,
} from '../../contracts/schema';
import { nowIso } from '../../utils';

type LotusLink = { '/': string };
type LotusTipSetKey = LotusLink[];

type LotusChainHeadResponse = {
  Height: number | string;
  Cids: LotusTipSetKey;
};

type LotusMarketStorageDealResponse = {
  Proposal: {
    PieceCID: LotusLink;
    PieceSize: number | string;
    VerifiedDeal: boolean;
    Provider: string;
    StartEpoch: number | string;
    EndEpoch: number | string;
  };
  State: {
    SectorStartEpoch: number | string;
    LastUpdatedEpoch: number | string;
    SlashEpoch: number | string;
  };
};

type LotusActiveSectorResponse = Array<{
  SectorNumber: number | string;
  SealedCID?: LotusLink | null;
  DealIDs?: Array<number | string>;
  Activation: number | string;
  Expiration: number | string;
  SectorKeyCID?: LotusLink | null;
}>;

type JsonRpcSuccess<T> = {
  jsonrpc: '2.0';
  id: number;
  result: T;
};

type JsonRpcFailure = {
  jsonrpc: '2.0';
  id: number;
  error: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

function normalizeNumericString(value: bigint | number | string, label: string) {
  if (typeof value === 'bigint' && value >= 0n) {
    return value.toString();
  }

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return String(value);
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return value;
  }

  throw new Error(`${label} must be a non-negative integer.`);
}

function normalizeNonNegativeInt(value: number | string, label: string) {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isInteger(numeric) || numeric < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return numeric;
}

function normalizePositiveInt(value: number | string, label: string) {
  const numeric = normalizeNonNegativeInt(value, label);
  if (numeric <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return numeric;
}

function normalizeInt(value: number | string, label: string) {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isInteger(numeric)) {
    throw new Error(`${label} must be an integer.`);
  }
  return numeric;
}

function normalizeLotusLink(value: unknown, label: string) {
  if (
    value &&
    typeof value === 'object' &&
    '/' in value &&
    typeof (value as { '/': unknown })['/'] === 'string' &&
    (value as { '/': string })['/'].length > 0
  ) {
    return (value as { '/': string })['/'];
  }

  throw new Error(`${label} must be an IPLD link.`);
}

function serializeArchiveOnChainSealWitnessArtifact(artifact: ArchiveOnChainSealWitnessArtifact) {
  return JSON.stringify(artifact);
}

async function computeArchiveTextArtifactCid(serialized: string) {
  const digest = await sha256.digest(new TextEncoder().encode(serialized));
  return CID.createV1(raw.code, digest).toString();
}

async function callLotusJsonRpc<T>(input: {
  rpcUrl: string;
  rpcToken?: string;
  method: string;
  params: unknown[];
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(input.rpcUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(input.rpcToken ? { authorization: `Bearer ${input.rpcToken}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: input.method,
      params: input.params,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Filecoin witness RPC failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as JsonRpcSuccess<T> | JsonRpcFailure;
  if ('error' in payload && payload.error) {
    throw new Error(payload.error.message || `Filecoin witness RPC method ${input.method} failed.`);
  }

  if (!('result' in payload)) {
    throw new Error(`Filecoin witness RPC method ${input.method} returned no result.`);
  }

  return (payload as JsonRpcSuccess<T>).result;
}

function normalizeTipSet(input: LotusChainHeadResponse) {
  const cids = Array.isArray(input.Cids)
    ? input.Cids.map((link, index) => normalizeLotusLink(link, `tip set CID ${index}`))
    : [];
  if (cids.length === 0) {
    throw new Error('Filecoin witness RPC returned a chain head without any CIDs.');
  }

  return {
    height: normalizeNonNegativeInt(input.Height, 'tip set height'),
    key: input.Cids,
    cids,
  };
}

function normalizeDealIdForRpc(value: bigint | number | string) {
  const normalized = normalizeNumericString(value, 'Deal ID');
  const numeric = Number(normalized);
  if (!Number.isSafeInteger(numeric)) {
    throw new Error('Deal ID is too large to query safely through Lotus JSON-RPC.');
  }
  return { dealId: normalized, rpcValue: numeric };
}

export async function createArchiveOnChainSealWitnessArtifact(
  artifact: ArchiveOnChainSealWitnessArtifact,
) {
  const normalized = archiveOnChainSealWitnessArtifactSchema.parse(artifact);
  const proof = serializeArchiveOnChainSealWitnessArtifact(normalized);
  return {
    proof,
    proofCid: await computeArchiveTextArtifactCid(proof),
  };
}

export function parseArchiveOnChainSealWitnessArtifact(serialized: string) {
  return archiveOnChainSealWitnessArtifactSchema.parse(JSON.parse(serialized) as unknown);
}

export async function verifyArchiveOnChainSealWitnessArtifact(input: {
  pieceCid: string;
  dealId: bigint | number | string;
  provider?: string;
  serializedProof: string;
  proofCid?: string;
}) {
  try {
    const proof = parseArchiveOnChainSealWitnessArtifact(input.serializedProof);
    const normalizedDealId = normalizeNumericString(input.dealId, 'Deal ID');

    if (input.proofCid) {
      const computedProofCid = await computeArchiveTextArtifactCid(input.serializedProof);
      if (computedProofCid !== input.proofCid) {
        return {
          ok: false as const,
          error: new Error(
            `On-chain seal witness resolves to CID ${computedProofCid} instead of ${input.proofCid}.`,
          ),
        };
      }
    }

    if (proof.deal.dealId !== normalizedDealId) {
      return {
        ok: false as const,
        error: new Error(
          `On-chain seal witness proves deal ${proof.deal.dealId} instead of ${normalizedDealId}.`,
        ),
      };
    }

    if (proof.deal.pieceCid !== input.pieceCid) {
      return {
        ok: false as const,
        error: new Error(
          `On-chain seal witness proves piece ${proof.deal.pieceCid} instead of ${input.pieceCid}.`,
        ),
      };
    }

    if (input.provider && proof.deal.provider !== input.provider) {
      return {
        ok: false as const,
        error: new Error(
          `On-chain seal witness proves provider ${proof.deal.provider} instead of ${input.provider}.`,
        ),
      };
    }

    if (proof.activeSector.expiration < proof.deal.endEpoch) {
      return {
        ok: false as const,
        error: new Error(
          `On-chain seal witness sector expires at epoch ${proof.activeSector.expiration}, before the deal ends at ${proof.deal.endEpoch}.`,
        ),
      };
    }

    if (proof.tipSet.height < proof.activeSector.activation) {
      return {
        ok: false as const,
        error: new Error(
          `On-chain seal witness tip set height ${proof.tipSet.height} predates sector activation ${proof.activeSector.activation}.`,
        ),
      };
    }

    return {
      ok: true as const,
      artifact: proof,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error : new Error('Invalid on-chain seal witness artifact.'),
    };
  }
}

export async function requestArchiveOnChainSealWitness(input: {
  pieceCid: string;
  dealId: bigint | number | string;
  provider?: string;
  rpcUrl: string;
  rpcToken?: string;
  fetchImpl?: typeof fetch;
  witnessedAt?: string;
}) {
  const { dealId, rpcValue } = normalizeDealIdForRpc(input.dealId);
  const head = normalizeTipSet(
    await callLotusJsonRpc<LotusChainHeadResponse>({
      rpcUrl: input.rpcUrl,
      rpcToken: input.rpcToken,
      method: 'Filecoin.ChainHead',
      params: [],
      fetchImpl: input.fetchImpl,
    }),
  );
  const marketDeal = await callLotusJsonRpc<LotusMarketStorageDealResponse>({
    rpcUrl: input.rpcUrl,
    rpcToken: input.rpcToken,
    method: 'Filecoin.StateMarketStorageDeal',
    params: [rpcValue, head.key],
    fetchImpl: input.fetchImpl,
  });
  if (!marketDeal || typeof marketDeal !== 'object' || !marketDeal.Proposal || !marketDeal.State) {
    throw new Error('Filecoin witness RPC returned an invalid market deal response.');
  }

  const pieceCid = normalizeLotusLink(marketDeal.Proposal.PieceCID, 'Market deal PieceCID');
  if (pieceCid !== input.pieceCid) {
    throw new Error(
      `Filecoin witness RPC returned piece CID ${pieceCid}, which does not match receipt piece CID ${input.pieceCid}.`,
    );
  }

  if (input.provider && marketDeal.Proposal.Provider !== input.provider) {
    throw new Error(
      `Filecoin witness RPC returned provider ${marketDeal.Proposal.Provider}, which does not match receipt provider ${input.provider}.`,
    );
  }

  const activeSectors = await callLotusJsonRpc<LotusActiveSectorResponse>({
    rpcUrl: input.rpcUrl,
    rpcToken: input.rpcToken,
    method: 'Filecoin.StateMinerActiveSectors',
    params: [marketDeal.Proposal.Provider, head.key],
    fetchImpl: input.fetchImpl,
  });
  if (!Array.isArray(activeSectors)) {
    throw new Error('Filecoin witness RPC returned an invalid active sector response.');
  }
  const matchingSector = activeSectors.find((sector: LotusActiveSectorResponse[number]) =>
    (sector.DealIDs ?? []).some(
      (candidate: number | string) =>
        normalizeNumericString(candidate, 'Sector deal ID') === dealId,
    ),
  );

  if (!matchingSector) {
    throw new Error(
      `Filecoin witness RPC did not find deal ${dealId} in provider ${marketDeal.Proposal.Provider}'s active sectors at the witnessed tip set.`,
    );
  }

  const artifact = archiveOnChainSealWitnessArtifactSchema.parse({
    type: 'coop-filecoin-onchain-seal-witness',
    schemaVersion: 1,
    source: 'lotus-json-rpc',
    witnessedAt: input.witnessedAt ?? nowIso(),
    tipSet: {
      height: head.height,
      cids: head.cids,
    },
    deal: {
      dealId,
      provider: marketDeal.Proposal.Provider,
      pieceCid,
      pieceSize: normalizePositiveInt(marketDeal.Proposal.PieceSize, 'Market deal piece size'),
      verifiedDeal: Boolean(marketDeal.Proposal.VerifiedDeal),
      startEpoch: normalizeNonNegativeInt(
        marketDeal.Proposal.StartEpoch,
        'Market deal start epoch',
      ),
      endEpoch: normalizeNonNegativeInt(marketDeal.Proposal.EndEpoch, 'Market deal end epoch'),
      sectorStartEpoch: normalizePositiveInt(
        marketDeal.State.SectorStartEpoch,
        'Market deal sector start epoch',
      ),
      lastUpdatedEpoch: normalizeNonNegativeInt(
        marketDeal.State.LastUpdatedEpoch,
        'Market deal last updated epoch',
      ),
      slashEpoch: normalizeInt(marketDeal.State.SlashEpoch, 'Market deal slash epoch'),
    },
    activeSector: {
      sectorNumber: normalizePositiveInt(matchingSector.SectorNumber, 'Active sector number'),
      activation: normalizePositiveInt(matchingSector.Activation, 'Active sector activation'),
      expiration: normalizePositiveInt(matchingSector.Expiration, 'Active sector expiration'),
      sealedCid: matchingSector.SealedCID
        ? normalizeLotusLink(matchingSector.SealedCID, 'Active sector SealedCID')
        : undefined,
      sectorKeyCid: matchingSector.SectorKeyCID
        ? normalizeLotusLink(matchingSector.SectorKeyCID, 'Active sector SectorKeyCID')
        : undefined,
    },
  });

  const { proof, proofCid } = await createArchiveOnChainSealWitnessArtifact(artifact);
  return {
    artifact,
    proof,
    proofCid,
  };
}
