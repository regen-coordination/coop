import { UnixFS } from '@storacha/upload-client';
import * as DataSegment from '@web3-storage/data-segment';
import { base64ToBytes, bytesToBase64 } from '../../utils';

function archiveProofJsonReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Uint8Array) {
    return Array.from(value);
  }

  return value;
}

function normalizeUint8Array(value: unknown, label: string) {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (
    Array.isArray(value) &&
    value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 255)
  ) {
    return Uint8Array.from(value);
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value);
    if (
      entries.every(
        ([key, entry]) =>
          /^\d+$/.test(key) && Number.isInteger(entry) && entry >= 0 && entry <= 255,
      )
    ) {
      return Uint8Array.from(
        entries
          .sort((left, right) => Number(left[0]) - Number(right[0]))
          .map(([, entry]) => Number(entry)),
      );
    }
  }

  throw new Error(`${label} must be a 32-byte node encoded as byte values.`);
}

function normalizeProofOffset(value: unknown, label: string) {
  if (typeof value === 'bigint' && value >= 0n) {
    return value;
  }

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return BigInt(value);
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return BigInt(value);
  }

  throw new Error(`${label} offset must be a non-negative integer.`);
}

function normalizeDealId(value: bigint | number | string, label: string) {
  if (typeof value === 'bigint' && value >= 0n) {
    return value;
  }

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return BigInt(value);
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return BigInt(value);
  }

  throw new Error(`${label} deal ID must be a non-negative integer.`);
}

function normalizeProofData(value: unknown, label: string): [bigint, Uint8Array[]] {
  let offsetValue: unknown;
  let pathValue: unknown;

  if (Array.isArray(value) && value.length === 2) {
    [offsetValue, pathValue] = value;
  } else if (value && typeof value === 'object' && !Array.isArray(value)) {
    offsetValue = (value as { offset?: unknown }).offset;
    pathValue = (value as { path?: unknown }).path;
  } else {
    throw new Error(`${label} proof must be encoded as [offset, path] or { offset, path }.`);
  }

  const offset = normalizeProofOffset(offsetValue, label);
  if (!Array.isArray(pathValue)) {
    throw new Error(`${label} proof path must be an array.`);
  }

  const path = pathValue.map((entry, index) => {
    const node = normalizeUint8Array(entry, `${label} proof path[${index}]`);
    if (node.length !== 32) {
      throw new Error(`${label} proof path[${index}] must be 32 bytes.`);
    }
    return node;
  });

  return [offset, path];
}

function normalizeInclusionProof(
  value: unknown,
): [subtree: [bigint, Uint8Array[]], index: [bigint, Uint8Array[]]] {
  let subtreeValue: unknown;
  let indexValue: unknown;

  if (Array.isArray(value) && value.length === 2) {
    [subtreeValue, indexValue] = value;
  } else if (value && typeof value === 'object' && !Array.isArray(value)) {
    subtreeValue =
      (value as { subtree?: unknown; tree?: unknown }).subtree ??
      (value as { subtree?: unknown; tree?: unknown }).tree;
    indexValue = (value as { index?: unknown }).index;
  } else {
    throw new Error('Inclusion proof must be an object with subtree/index data.');
  }

  return [normalizeProofData(subtreeValue, 'subtree'), normalizeProofData(indexValue, 'index')];
}

function toBlob(input: Blob | Uint8Array | string) {
  if (input instanceof Blob) {
    return input;
  }

  return typeof input === 'string' ? new Blob([input]) : new Blob([Uint8Array.from(input)]);
}

export async function computeStorachaFileRootCid(input: Blob | Uint8Array | string) {
  const stream = UnixFS.createFileEncoderStream(toBlob(input));
  const reader = stream.getReader();
  let rootCid: { toString(): string } | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    rootCid = value.cid;
  }

  if (!rootCid) {
    throw new Error('Could not compute the Storacha UnixFS root CID for the fetched content.');
  }

  return rootCid.toString();
}

export function serializeArchiveInclusionProof(proof: unknown) {
  return JSON.stringify(proof, archiveProofJsonReplacer);
}

export function parseArchiveInclusionProof(serialized: string) {
  const parsed = JSON.parse(serialized) as unknown;
  const [subtree, index] = normalizeInclusionProof(parsed);
  return DataSegment.Inclusion.from([subtree, index]);
}

export function verifyArchiveInclusionProofArtifact(input: {
  aggregateCid: string;
  pieceCid: string;
  serializedProof: string;
}) {
  const proof = parseArchiveInclusionProof(input.serializedProof);
  const piece = DataSegment.Piece.fromString(input.pieceCid);
  const resolvedAggregate = DataSegment.Inclusion.resolveAggregate(proof, piece.link);

  if (resolvedAggregate.error) {
    return {
      ok: false as const,
      error: resolvedAggregate.error,
    };
  }

  if (resolvedAggregate.ok.toString() !== input.aggregateCid) {
    return {
      ok: false as const,
      error: new Error(
        `Inclusion proof resolves to aggregate ${resolvedAggregate.ok.toString()} instead of ${input.aggregateCid}.`,
      ),
    };
  }

  return {
    ok: true as const,
  };
}

export function createArchiveDataAggregationProofArtifact(input: {
  serializedInclusionProof: string;
  dealId: bigint | number | string;
}) {
  const inclusion = parseArchiveInclusionProof(input.serializedInclusionProof);
  const dealID = normalizeDealId(input.dealId, 'Data aggregation proof');
  const proof = DataSegment.DataAggregationProof.create({ inclusion, dealID });

  return {
    proof: bytesToBase64(DataSegment.DataAggregationProof.encode(proof)),
    proofCid: DataSegment.DataAggregationProof.link(proof).toString(),
  };
}

export function parseArchiveDataAggregationProof(serialized: string) {
  return DataSegment.DataAggregationProof.decode(base64ToBytes(serialized));
}

export function verifyArchiveDataAggregationProofArtifact(input: {
  aggregateCid: string;
  pieceCid: string;
  dealId: bigint | number | string;
  serializedProof: string;
  proofCid?: string;
}) {
  const proof = parseArchiveDataAggregationProof(input.serializedProof);
  const piece = DataSegment.Piece.fromString(input.pieceCid);
  const aggregate = DataSegment.Piece.fromString(input.aggregateCid);
  const dealID = normalizeDealId(input.dealId, 'Data aggregation proof');

  if (input.proofCid) {
    const computedProofCid = DataSegment.DataAggregationProof.link(proof).toString();
    if (computedProofCid !== input.proofCid) {
      return {
        ok: false as const,
        error: new Error(
          `Data aggregation proof resolves to CID ${computedProofCid} instead of ${input.proofCid}.`,
        ),
      };
    }
  }

  const verification = DataSegment.DataAggregationProof.verify(proof, {
    aggregate: aggregate.link,
    piece: piece.link,
    dealID,
  });

  if (verification.error) {
    return {
      ok: false as const,
      error: verification.error,
    };
  }

  return {
    ok: true as const,
  };
}
