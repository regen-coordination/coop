export function buildArchiveArtifactPayload(input: {
  coopId: string;
  artifactId: string;
}): Record<string, unknown> {
  return { coopId: input.coopId, artifactId: input.artifactId };
}

export function buildArchiveSnapshotPayload(input: {
  coopId: string;
}): Record<string, unknown> {
  return { coopId: input.coopId };
}

export function buildRefreshArchiveStatusPayload(input: {
  coopId: string;
  receiptId?: string;
}): Record<string, unknown> {
  return { coopId: input.coopId, receiptId: input.receiptId };
}

export function buildPublishReadyDraftPayload(input: {
  draftId: string;
  targetCoopIds: string[];
}): Record<string, unknown> {
  return { draftId: input.draftId, targetCoopIds: input.targetCoopIds };
}
