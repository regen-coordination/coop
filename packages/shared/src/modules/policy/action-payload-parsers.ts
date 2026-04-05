import {
  type DelegatedActionClass,
  type PolicyActionClass,
  greenGoodsHypercertMintActionPayloadSchema,
} from '../../contracts/schema';

export type ScopedActionClass = PolicyActionClass | DelegatedActionClass;

export type ScopedActionPayloadResolution =
  | {
      ok: true;
      coopId?: string;
      normalizedPayload: Record<string, unknown>;
      targetIds: string[];
    }
  | {
      ok: false;
      reason: string;
    };

function readRequiredString(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value: string } | { ok: false; reason: string } {
  const value = payload[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, reason: `Action payload is missing "${key}".` };
  }
  return { ok: true, value };
}

function readOptionalString(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value?: string } | { ok: false; reason: string } {
  const value = payload[key];
  if (value === undefined) {
    return { ok: true };
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, reason: `Action payload has an invalid "${key}".` };
  }
  return { ok: true, value };
}

function readRequiredStringArray(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value: string[] } | { ok: false; reason: string } {
  const value = payload[key];
  if (!Array.isArray(value)) {
    return { ok: false, reason: `Action payload is missing "${key}".` };
  }
  const items = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (items.length === 0 || items.length !== value.length) {
    return { ok: false, reason: `Action payload has an invalid "${key}".` };
  }
  return {
    ok: true,
    value: Array.from(new Set(items)),
  };
}

function readOptionalStringArray(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value: string[] } | { ok: false; reason: string } {
  const value = payload[key];
  if (value === undefined) {
    return { ok: true, value: [] };
  }
  return readRequiredStringArray(payload, key);
}

function readOptionalBoolean(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value?: boolean } | { ok: false; reason: string } {
  const value = payload[key];
  if (value === undefined) {
    return { ok: true };
  }
  if (typeof value !== 'boolean') {
    return { ok: false, reason: `Action payload has an invalid "${key}".` };
  }
  return { ok: true, value };
}

function readRequiredBoolean(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value: boolean } | { ok: false; reason: string } {
  const value = payload[key];
  if (typeof value !== 'boolean') {
    return { ok: false, reason: `Action payload is missing "${key}".` };
  }
  return { ok: true, value };
}

function readOptionalNonNegativeInteger(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value?: number } | { ok: false; reason: string } {
  const value = payload[key];
  if (value === undefined) {
    return { ok: true };
  }
  if (!Number.isInteger(value) || typeof value !== 'number' || value < 0) {
    return { ok: false, reason: `Action payload has an invalid "${key}".` };
  }
  return { ok: true, value };
}

function readRequiredNonNegativeInteger(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value: number } | { ok: false; reason: string } {
  const value = payload[key];
  if (!Number.isInteger(value) || typeof value !== 'number' || value < 0) {
    return { ok: false, reason: `Action payload is missing "${key}".` };
  }
  return { ok: true, value };
}

function readRequiredByte(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value: number } | { ok: false; reason: string } {
  const result = readRequiredNonNegativeInteger(payload, key);
  if (!result.ok) {
    return result;
  }
  if (result.value > 255) {
    return { ok: false, reason: `Action payload has an invalid "${key}".` };
  }
  return result;
}

function readGreenGoodsDomains(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value: string[] } | { ok: false; reason: string } {
  const result = readRequiredStringArray(payload, key);
  if (!result.ok) {
    return result;
  }
  if (result.value.some((value) => !['solar', 'agro', 'edu', 'waste'].includes(value))) {
    return { ok: false, reason: `Action payload has an invalid "${key}".` };
  }
  return result;
}

function readOptionalAddressArray(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value: string[] } | { ok: false; reason: string } {
  const result = readOptionalStringArray(payload, key);
  if (!result.ok) {
    return result;
  }
  if (result.value.some((value) => !/^0x[a-fA-F0-9]{40}$/.test(value))) {
    return { ok: false, reason: `Action payload has an invalid "${key}".` };
  }
  return result;
}

function readRequiredAddress(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value: string } | { ok: false; reason: string } {
  const value = readRequiredString(payload, key);
  if (!value.ok) {
    return value;
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(value.value)) {
    return { ok: false, reason: `Action payload has an invalid "${key}".` };
  }
  return value;
}

function readRequiredBytes32(
  payload: Record<string, unknown>,
  key: string,
): { ok: true; value: string } | { ok: false; reason: string } {
  const value = readRequiredString(payload, key);
  if (!value.ok) {
    return value;
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(value.value)) {
    return { ok: false, reason: `Action payload has an invalid "${key}".` };
  }
  return value;
}

function validateExpectedCoopId(actualCoopId: string, expectedCoopId?: string) {
  if (!expectedCoopId || actualCoopId === expectedCoopId) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    reason: `Action payload coop "${actualCoopId}" does not match scoped coop "${expectedCoopId}".`,
  };
}

// ---------------------------------------------------------------------------
// Field spec types
// ---------------------------------------------------------------------------

type FieldType =
  | 'requiredString'
  | 'optionalString'
  | 'requiredStringArray'
  | 'optionalStringArray'
  | 'optionalBoolean'
  | 'requiredBoolean'
  | 'optionalNonNegativeInteger'
  | 'requiredNonNegativeInteger'
  | 'requiredByte'
  | 'greenGoodsDomains'
  | 'optionalAddressArray'
  | 'requiredAddress'
  | 'requiredBytes32';

type FieldSpec = {
  key: string;
  type: FieldType;
  default?: unknown;
  isTarget?: boolean;
};

type ActionSpec = {
  fields: FieldSpec[];
  hasCoopScope?: boolean;
  targetIds?: (normalized: Record<string, unknown>) => string[];
  validate?: (
    normalized: Record<string, unknown>,
    input: { expectedCoopId?: string },
  ) => { ok: true } | { ok: false; reason: string };
};

// ---------------------------------------------------------------------------
// Field reader dispatch
// ---------------------------------------------------------------------------

const FIELD_READERS: Record<
  FieldType,
  (
    payload: Record<string, unknown>,
    key: string,
  ) => { ok: true; value?: unknown } | { ok: false; reason: string }
> = {
  requiredString: readRequiredString,
  optionalString: readOptionalString,
  requiredStringArray: readRequiredStringArray,
  optionalStringArray: readOptionalStringArray,
  optionalBoolean: readOptionalBoolean,
  requiredBoolean: readRequiredBoolean,
  optionalNonNegativeInteger: readOptionalNonNegativeInteger,
  requiredNonNegativeInteger: readRequiredNonNegativeInteger,
  requiredByte: readRequiredByte,
  greenGoodsDomains: readGreenGoodsDomains,
  optionalAddressArray: readOptionalAddressArray,
  requiredAddress: readRequiredAddress,
  requiredBytes32: readRequiredBytes32,
};

// ---------------------------------------------------------------------------
// Generic spec resolver
// ---------------------------------------------------------------------------

function resolveFromSpec(
  spec: ActionSpec,
  input: { payload: Record<string, unknown>; expectedCoopId?: string },
): ScopedActionPayloadResolution {
  const normalized: Record<string, unknown> = {};
  let coopId: string | undefined;

  if (spec.hasCoopScope) {
    const coopResult = readRequiredString(input.payload, 'coopId');
    if (!coopResult.ok) return coopResult;
    const scopeValidation = validateExpectedCoopId(coopResult.value, input.expectedCoopId);
    if (!scopeValidation.ok) return scopeValidation;
    coopId = coopResult.value;
    normalized.coopId = coopId;
  }

  for (const field of spec.fields) {
    const reader = FIELD_READERS[field.type];
    const result = reader(input.payload, field.key);
    if (!result.ok) return result;
    normalized[field.key] = result.value ?? field.default;
  }

  if (spec.validate) {
    const validation = spec.validate(normalized, input);
    if (!validation.ok) return validation;
  }

  const targetIds = spec.targetIds
    ? spec.targetIds(normalized)
    : spec.fields.filter((f) => f.isTarget).map((f) => String(normalized[f.key]));

  return {
    ok: true,
    ...(coopId !== undefined && { coopId }),
    normalizedPayload: normalized,
    targetIds,
  };
}

// ---------------------------------------------------------------------------
// Action specs registry
// ---------------------------------------------------------------------------

const ACTION_SPECS: Record<ScopedActionClass, ActionSpec | 'custom'> = {
  'archive-artifact': {
    hasCoopScope: true,
    fields: [{ key: 'artifactId', type: 'requiredString', isTarget: true }],
  },
  'archive-snapshot': {
    hasCoopScope: true,
    fields: [],
  },
  'refresh-archive-status': {
    hasCoopScope: true,
    fields: [{ key: 'receiptId', type: 'optionalString' }],
    targetIds: (n) => (n.receiptId ? [n.receiptId as string] : []),
  },
  'publish-ready-draft': 'custom',
  'safe-deployment': {
    hasCoopScope: false,
    fields: [{ key: 'coopSeed', type: 'requiredString', isTarget: true }],
  },
  'green-goods-create-garden': {
    hasCoopScope: true,
    fields: [
      { key: 'name', type: 'requiredString' },
      { key: 'description', type: 'requiredString' },
      { key: 'weightScheme', type: 'requiredString' },
      { key: 'domains', type: 'greenGoodsDomains' },
      { key: 'slug', type: 'optionalString' },
      { key: 'location', type: 'optionalString', default: '' },
      { key: 'bannerImage', type: 'optionalString', default: '' },
      { key: 'metadata', type: 'optionalString', default: '' },
      { key: 'openJoining', type: 'optionalBoolean', default: false },
      { key: 'maxGardeners', type: 'optionalNonNegativeInteger', default: 0 },
      { key: 'operatorAddresses', type: 'optionalAddressArray' },
      { key: 'gardenerAddresses', type: 'optionalAddressArray' },
    ],
    validate: (n) => {
      if (!['linear', 'exponential', 'power'].includes(n.weightScheme as string)) {
        return { ok: false, reason: 'Action payload has an invalid "weightScheme".' };
      }
      return { ok: true };
    },
    targetIds: (n) => [n.name as string, ...(n.domains as string[])],
  },
  'green-goods-sync-garden-profile': {
    hasCoopScope: true,
    fields: [
      { key: 'gardenAddress', type: 'requiredAddress', isTarget: true },
      { key: 'name', type: 'requiredString' },
      { key: 'description', type: 'requiredString' },
      { key: 'location', type: 'optionalString', default: '' },
      { key: 'bannerImage', type: 'optionalString', default: '' },
      { key: 'metadata', type: 'optionalString', default: '' },
      { key: 'openJoining', type: 'optionalBoolean', default: false },
      { key: 'maxGardeners', type: 'optionalNonNegativeInteger', default: 0 },
    ],
  },
  'green-goods-set-garden-domains': {
    hasCoopScope: true,
    fields: [
      { key: 'gardenAddress', type: 'requiredAddress' },
      { key: 'domains', type: 'greenGoodsDomains' },
    ],
    targetIds: (n) => [n.gardenAddress as string, ...(n.domains as string[])],
  },
  'green-goods-create-garden-pools': {
    hasCoopScope: true,
    fields: [{ key: 'gardenAddress', type: 'requiredAddress', isTarget: true }],
  },
  'green-goods-submit-work-approval': {
    hasCoopScope: true,
    fields: [
      { key: 'gardenAddress', type: 'requiredAddress' },
      { key: 'actionUid', type: 'requiredNonNegativeInteger' },
      { key: 'workUid', type: 'requiredBytes32' },
      { key: 'approved', type: 'requiredBoolean' },
      { key: 'feedback', type: 'optionalString', default: '' },
      { key: 'confidence', type: 'requiredByte' },
      { key: 'verificationMethod', type: 'requiredByte' },
      { key: 'reviewNotesCid', type: 'optionalString', default: '' },
    ],
    targetIds: (n) => [n.gardenAddress as string, n.workUid as string],
  },
  'green-goods-create-assessment': {
    hasCoopScope: true,
    fields: [
      { key: 'gardenAddress', type: 'requiredAddress' },
      { key: 'title', type: 'requiredString' },
      { key: 'description', type: 'requiredString' },
      { key: 'assessmentConfigCid', type: 'requiredString' },
      { key: 'domain', type: 'requiredString' },
      { key: 'startDate', type: 'requiredNonNegativeInteger' },
      { key: 'endDate', type: 'requiredNonNegativeInteger' },
      { key: 'location', type: 'optionalString', default: '' },
    ],
    validate: (n) => {
      if (!['solar', 'agro', 'edu', 'waste'].includes(n.domain as string)) {
        return { ok: false, reason: 'Action payload has an invalid "domain".' };
      }
      if ((n.endDate as number) < (n.startDate as number)) {
        return { ok: false, reason: 'Action payload has an invalid "endDate".' };
      }
      return { ok: true };
    },
    targetIds: (n) => [
      n.gardenAddress as string,
      n.title as string,
      n.assessmentConfigCid as string,
    ],
  },
  'green-goods-sync-gap-admins': {
    hasCoopScope: true,
    fields: [
      { key: 'gardenAddress', type: 'requiredAddress' },
      { key: 'addAdmins', type: 'optionalAddressArray' },
      { key: 'removeAdmins', type: 'optionalAddressArray' },
    ],
    targetIds: (n) => [
      n.gardenAddress as string,
      ...(n.addAdmins as string[]),
      ...(n.removeAdmins as string[]),
    ],
  },
  'green-goods-mint-hypercert': 'custom',
  'safe-add-owner': {
    hasCoopScope: true,
    fields: [
      { key: 'ownerAddress', type: 'requiredAddress', isTarget: true },
      { key: 'newThreshold', type: 'requiredNonNegativeInteger' },
    ],
  },
  'safe-remove-owner': {
    hasCoopScope: true,
    fields: [
      { key: 'ownerAddress', type: 'requiredAddress', isTarget: true },
      { key: 'newThreshold', type: 'requiredNonNegativeInteger' },
    ],
  },
  'safe-swap-owner': {
    hasCoopScope: true,
    fields: [
      { key: 'oldOwnerAddress', type: 'requiredAddress' },
      { key: 'newOwnerAddress', type: 'requiredAddress' },
    ],
    targetIds: (n) => [n.oldOwnerAddress as string, n.newOwnerAddress as string],
  },
  'safe-change-threshold': {
    hasCoopScope: true,
    fields: [{ key: 'newThreshold', type: 'requiredNonNegativeInteger' }],
    targetIds: () => [],
  },
  'green-goods-add-gardener': {
    hasCoopScope: true,
    fields: [
      { key: 'gardenAddress', type: 'requiredAddress' },
      { key: 'memberId', type: 'requiredString' },
      { key: 'gardenerAddress', type: 'requiredAddress' },
    ],
    targetIds: (n) => [
      n.memberId as string,
      n.gardenAddress as string,
      n.gardenerAddress as string,
    ],
  },
  'green-goods-remove-gardener': {
    hasCoopScope: true,
    fields: [
      { key: 'gardenAddress', type: 'requiredAddress' },
      { key: 'memberId', type: 'requiredString' },
      { key: 'gardenerAddress', type: 'requiredAddress' },
    ],
    targetIds: (n) => [
      n.memberId as string,
      n.gardenAddress as string,
      n.gardenerAddress as string,
    ],
  },
  'green-goods-submit-work-submission': {
    hasCoopScope: true,
    fields: [
      { key: 'gardenAddress', type: 'requiredAddress' },
      { key: 'actionUid', type: 'requiredNonNegativeInteger' },
      { key: 'title', type: 'requiredString' },
      { key: 'feedback', type: 'optionalString', default: '' },
      { key: 'metadataCid', type: 'requiredString' },
      { key: 'mediaCids', type: 'optionalStringArray', default: [] },
    ],
    targetIds: (n) => [n.gardenAddress as string, `${n.actionUid}`],
  },
  'green-goods-submit-impact-report': {
    hasCoopScope: true,
    fields: [
      { key: 'gardenAddress', type: 'requiredAddress' },
      { key: 'title', type: 'requiredString' },
      { key: 'description', type: 'requiredString' },
      { key: 'domain', type: 'requiredString' },
      { key: 'reportCid', type: 'requiredString' },
      { key: 'metricsSummary', type: 'requiredString' },
      { key: 'reportingPeriodStart', type: 'requiredNonNegativeInteger' },
      { key: 'reportingPeriodEnd', type: 'requiredNonNegativeInteger' },
      { key: 'submittedBy', type: 'requiredAddress' },
    ],
    validate: (n) => {
      if (!['solar', 'agro', 'edu', 'waste'].includes(n.domain as string)) {
        return { ok: false, reason: 'Action payload has an invalid "domain".' };
      }
      if ((n.reportingPeriodEnd as number) < (n.reportingPeriodStart as number)) {
        return { ok: false, reason: 'Action payload has an invalid "reportingPeriodEnd".' };
      }
      return { ok: true };
    },
    targetIds: (n) => [n.gardenAddress as string, n.title as string, n.reportCid as string],
  },
  'erc8004-register-agent': 'custom',
  'erc8004-give-feedback': 'custom',
};

// ---------------------------------------------------------------------------
// Custom handlers for cases that don't fit the spec pattern
// ---------------------------------------------------------------------------

function resolvePublishReadyDraft(input: {
  payload: Record<string, unknown>;
  expectedCoopId?: string;
}): ScopedActionPayloadResolution {
  const draftId = readRequiredString(input.payload, 'draftId');
  if (!draftId.ok) return draftId;
  const targetCoopIds = readRequiredStringArray(input.payload, 'targetCoopIds');
  if (!targetCoopIds.ok) return targetCoopIds;
  if (input.expectedCoopId && !targetCoopIds.value.includes(input.expectedCoopId)) {
    return {
      ok: false,
      reason: `Publish targets must include the scoped coop "${input.expectedCoopId}".`,
    };
  }
  return {
    ok: true,
    coopId: input.expectedCoopId,
    normalizedPayload: {
      draftId: draftId.value,
      targetCoopIds: targetCoopIds.value,
    },
    targetIds: [draftId.value, ...targetCoopIds.value],
  };
}

function resolveGreenGoodsMintHypercert(input: {
  payload: Record<string, unknown>;
  expectedCoopId?: string;
}): ScopedActionPayloadResolution {
  const parsed = greenGoodsHypercertMintActionPayloadSchema.safeParse(input.payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const key = issue?.path?.[0];
    return {
      ok: false,
      reason:
        typeof key === 'string'
          ? `Action payload has an invalid "${key}".`
          : 'Action payload has an invalid Green Goods Hypercert package.',
    };
  }
  const scopeValidation = validateExpectedCoopId(parsed.data.coopId, input.expectedCoopId);
  if (!scopeValidation.ok) return scopeValidation;
  return {
    ok: true,
    coopId: parsed.data.coopId,
    normalizedPayload: parsed.data,
    targetIds: [
      parsed.data.gardenAddress,
      parsed.data.title,
      ...parsed.data.attestations.map((attestation) => attestation.uid),
      ...parsed.data.allowlist.map((entry) => entry.address),
    ],
  };
}

function resolveErc8004Passthrough(input: {
  payload: Record<string, unknown>;
  expectedCoopId?: string;
}): ScopedActionPayloadResolution {
  const coopId = readRequiredString(input.payload, 'coopId');
  if (!coopId.ok) return coopId;
  const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
  if (!scopeValidation.ok) return scopeValidation;
  return {
    ok: true,
    coopId: coopId.value,
    normalizedPayload: { ...input.payload, coopId: coopId.value },
    targetIds: [],
  };
}

const CUSTOM_HANDLERS: Partial<
  Record<
    ScopedActionClass,
    (input: {
      payload: Record<string, unknown>;
      expectedCoopId?: string;
    }) => ScopedActionPayloadResolution
  >
> = {
  'publish-ready-draft': resolvePublishReadyDraft,
  'green-goods-mint-hypercert': resolveGreenGoodsMintHypercert,
  'erc8004-register-agent': resolveErc8004Passthrough,
  'erc8004-give-feedback': resolveErc8004Passthrough,
};

// ---------------------------------------------------------------------------
// Public API (unchanged signature)
// ---------------------------------------------------------------------------

export function resolveScopedActionPayload(input: {
  actionClass: ScopedActionClass;
  payload: Record<string, unknown>;
  expectedCoopId?: string;
}): ScopedActionPayloadResolution {
  const spec = ACTION_SPECS[input.actionClass];

  if (spec === 'custom') {
    const handler = CUSTOM_HANDLERS[input.actionClass];
    if (!handler) {
      throw new Error(`Missing custom handler for action class "${input.actionClass}".`);
    }
    return handler(input);
  }

  return resolveFromSpec(spec, input);
}
