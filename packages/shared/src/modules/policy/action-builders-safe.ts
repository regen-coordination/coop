export function buildSafeDeploymentPayload(input: {
  coopSeed: string;
}): Record<string, unknown> {
  return { coopSeed: input.coopSeed };
}

// ─── Safe Owner Management Payloads ──────────────────────────────────

export function buildSafeAddOwnerPayload(input: {
  coopId: string;
  ownerAddress: string;
  newThreshold: number;
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    ownerAddress: input.ownerAddress,
    newThreshold: input.newThreshold,
  };
}

export function buildSafeRemoveOwnerPayload(input: {
  coopId: string;
  ownerAddress: string;
  newThreshold: number;
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    ownerAddress: input.ownerAddress,
    newThreshold: input.newThreshold,
  };
}

export function buildSafeSwapOwnerPayload(input: {
  coopId: string;
  oldOwnerAddress: string;
  newOwnerAddress: string;
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    oldOwnerAddress: input.oldOwnerAddress,
    newOwnerAddress: input.newOwnerAddress,
  };
}

export function buildSafeChangeThresholdPayload(input: {
  coopId: string;
  newThreshold: number;
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    newThreshold: input.newThreshold,
  };
}
