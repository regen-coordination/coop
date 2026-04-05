import type {
  ArchiveBlobUpload,
  ArchiveBundle,
  ArchiveReceipt,
  Artifact,
  CoopSharedState,
} from '../../contracts/schema';
import { createId, nowIso } from '../../utils';

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

export function applyBlobUploadsToArtifact(
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
