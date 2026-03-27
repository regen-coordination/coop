import {
  greenGoodsHypercertMintActionPayloadSchema,
  type DelegatedActionClass,
  type PolicyActionClass,
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

export function resolveScopedActionPayload(input: {
  actionClass: ScopedActionClass;
  payload: Record<string, unknown>;
  expectedCoopId?: string;
}): ScopedActionPayloadResolution {
  switch (input.actionClass) {
    case 'archive-artifact': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const artifactId = readRequiredString(input.payload, 'artifactId');
      if (!artifactId.ok) {
        return artifactId;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          artifactId: artifactId.value,
        },
        targetIds: [artifactId.value],
      };
    }
    case 'archive-snapshot': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
        },
        targetIds: [],
      };
    }
    case 'refresh-archive-status': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const receiptId = readOptionalString(input.payload, 'receiptId');
      if (!receiptId.ok) {
        return receiptId;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          receiptId: receiptId.value,
        },
        targetIds: receiptId.value ? [receiptId.value] : [],
      };
    }
    case 'publish-ready-draft': {
      const draftId = readRequiredString(input.payload, 'draftId');
      if (!draftId.ok) {
        return draftId;
      }
      const targetCoopIds = readRequiredStringArray(input.payload, 'targetCoopIds');
      if (!targetCoopIds.ok) {
        return targetCoopIds;
      }
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
    case 'safe-deployment': {
      const coopSeed = readRequiredString(input.payload, 'coopSeed');
      if (!coopSeed.ok) {
        return coopSeed;
      }
      return {
        ok: true,
        normalizedPayload: {
          coopSeed: coopSeed.value,
        },
        targetIds: [coopSeed.value],
      };
    }
    case 'green-goods-create-garden': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const name = readRequiredString(input.payload, 'name');
      if (!name.ok) {
        return name;
      }
      const description = readRequiredString(input.payload, 'description');
      if (!description.ok) {
        return description;
      }
      const weightScheme = readRequiredString(input.payload, 'weightScheme');
      if (!weightScheme.ok) {
        return weightScheme;
      }
      if (!['linear', 'exponential', 'power'].includes(weightScheme.value)) {
        return {
          ok: false,
          reason: 'Action payload has an invalid "weightScheme".',
        };
      }
      const domains = readGreenGoodsDomains(input.payload, 'domains');
      if (!domains.ok) {
        return domains;
      }
      const slug = readOptionalString(input.payload, 'slug');
      if (!slug.ok) {
        return slug;
      }
      const location = readOptionalString(input.payload, 'location');
      if (!location.ok) {
        return location;
      }
      const bannerImage = readOptionalString(input.payload, 'bannerImage');
      if (!bannerImage.ok) {
        return bannerImage;
      }
      const metadata = readOptionalString(input.payload, 'metadata');
      if (!metadata.ok) {
        return metadata;
      }
      const openJoining = readOptionalBoolean(input.payload, 'openJoining');
      if (!openJoining.ok) {
        return openJoining;
      }
      const maxGardeners = readOptionalNonNegativeInteger(input.payload, 'maxGardeners');
      if (!maxGardeners.ok) {
        return maxGardeners;
      }
      const operatorAddresses = readOptionalAddressArray(input.payload, 'operatorAddresses');
      if (!operatorAddresses.ok) {
        return operatorAddresses;
      }
      const gardenerAddresses = readOptionalAddressArray(input.payload, 'gardenerAddresses');
      if (!gardenerAddresses.ok) {
        return gardenerAddresses;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          name: name.value,
          slug: slug.value,
          description: description.value,
          location: location.value ?? '',
          bannerImage: bannerImage.value ?? '',
          metadata: metadata.value ?? '',
          openJoining: openJoining.value ?? false,
          maxGardeners: maxGardeners.value ?? 0,
          weightScheme: weightScheme.value,
          domains: domains.value,
          operatorAddresses: operatorAddresses.value,
          gardenerAddresses: gardenerAddresses.value,
        },
        targetIds: [name.value, ...domains.value],
      };
    }
    case 'green-goods-sync-garden-profile': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const gardenAddress = readRequiredAddress(input.payload, 'gardenAddress');
      if (!gardenAddress.ok) {
        return gardenAddress;
      }
      const name = readRequiredString(input.payload, 'name');
      if (!name.ok) {
        return name;
      }
      const description = readRequiredString(input.payload, 'description');
      if (!description.ok) {
        return description;
      }
      const location = readOptionalString(input.payload, 'location');
      if (!location.ok) {
        return location;
      }
      const bannerImage = readOptionalString(input.payload, 'bannerImage');
      if (!bannerImage.ok) {
        return bannerImage;
      }
      const metadata = readOptionalString(input.payload, 'metadata');
      if (!metadata.ok) {
        return metadata;
      }
      const openJoining = readOptionalBoolean(input.payload, 'openJoining');
      if (!openJoining.ok) {
        return openJoining;
      }
      const maxGardeners = readOptionalNonNegativeInteger(input.payload, 'maxGardeners');
      if (!maxGardeners.ok) {
        return maxGardeners;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          gardenAddress: gardenAddress.value,
          name: name.value,
          description: description.value,
          location: location.value ?? '',
          bannerImage: bannerImage.value ?? '',
          metadata: metadata.value ?? '',
          openJoining: openJoining.value ?? false,
          maxGardeners: maxGardeners.value ?? 0,
        },
        targetIds: [gardenAddress.value],
      };
    }
    case 'green-goods-set-garden-domains': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const gardenAddress = readRequiredAddress(input.payload, 'gardenAddress');
      if (!gardenAddress.ok) {
        return gardenAddress;
      }
      const domains = readGreenGoodsDomains(input.payload, 'domains');
      if (!domains.ok) {
        return domains;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          gardenAddress: gardenAddress.value,
          domains: domains.value,
        },
        targetIds: [gardenAddress.value, ...domains.value],
      };
    }
    case 'green-goods-create-garden-pools': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const gardenAddress = readRequiredAddress(input.payload, 'gardenAddress');
      if (!gardenAddress.ok) {
        return gardenAddress;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          gardenAddress: gardenAddress.value,
        },
        targetIds: [gardenAddress.value],
      };
    }
    case 'green-goods-submit-work-approval': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const gardenAddress = readRequiredAddress(input.payload, 'gardenAddress');
      if (!gardenAddress.ok) {
        return gardenAddress;
      }
      const actionUid = readRequiredNonNegativeInteger(input.payload, 'actionUid');
      if (!actionUid.ok) {
        return actionUid;
      }
      const workUid = readRequiredBytes32(input.payload, 'workUid');
      if (!workUid.ok) {
        return workUid;
      }
      const approved = readRequiredBoolean(input.payload, 'approved');
      if (!approved.ok) {
        return approved;
      }
      const feedback = readOptionalString(input.payload, 'feedback');
      if (!feedback.ok) {
        return feedback;
      }
      const confidence = readRequiredByte(input.payload, 'confidence');
      if (!confidence.ok) {
        return confidence;
      }
      const verificationMethod = readRequiredByte(input.payload, 'verificationMethod');
      if (!verificationMethod.ok) {
        return verificationMethod;
      }
      const reviewNotesCid = readOptionalString(input.payload, 'reviewNotesCid');
      if (!reviewNotesCid.ok) {
        return reviewNotesCid;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          gardenAddress: gardenAddress.value,
          actionUid: actionUid.value,
          workUid: workUid.value,
          approved: approved.value,
          feedback: feedback.value ?? '',
          confidence: confidence.value,
          verificationMethod: verificationMethod.value,
          reviewNotesCid: reviewNotesCid.value ?? '',
        },
        targetIds: [gardenAddress.value, workUid.value],
      };
    }
    case 'green-goods-create-assessment': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const gardenAddress = readRequiredAddress(input.payload, 'gardenAddress');
      if (!gardenAddress.ok) {
        return gardenAddress;
      }
      const title = readRequiredString(input.payload, 'title');
      if (!title.ok) {
        return title;
      }
      const description = readRequiredString(input.payload, 'description');
      if (!description.ok) {
        return description;
      }
      const assessmentConfigCid = readRequiredString(input.payload, 'assessmentConfigCid');
      if (!assessmentConfigCid.ok) {
        return assessmentConfigCid;
      }
      const domain = readRequiredString(input.payload, 'domain');
      if (!domain.ok) {
        return domain;
      }
      if (!['solar', 'agro', 'edu', 'waste'].includes(domain.value)) {
        return { ok: false, reason: 'Action payload has an invalid "domain".' };
      }
      const startDate = readRequiredNonNegativeInteger(input.payload, 'startDate');
      if (!startDate.ok) {
        return startDate;
      }
      const endDate = readRequiredNonNegativeInteger(input.payload, 'endDate');
      if (!endDate.ok) {
        return endDate;
      }
      if (endDate.value < startDate.value) {
        return { ok: false, reason: 'Action payload has an invalid "endDate".' };
      }
      const location = readOptionalString(input.payload, 'location');
      if (!location.ok) {
        return location;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          gardenAddress: gardenAddress.value,
          title: title.value,
          description: description.value,
          assessmentConfigCid: assessmentConfigCid.value,
          domain: domain.value,
          startDate: startDate.value,
          endDate: endDate.value,
          location: location.value ?? '',
        },
        targetIds: [gardenAddress.value, title.value, assessmentConfigCid.value],
      };
    }
    case 'green-goods-sync-gap-admins': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const gardenAddress = readRequiredAddress(input.payload, 'gardenAddress');
      if (!gardenAddress.ok) {
        return gardenAddress;
      }
      const addAdmins = readOptionalAddressArray(input.payload, 'addAdmins');
      if (!addAdmins.ok) {
        return addAdmins;
      }
      const removeAdmins = readOptionalAddressArray(input.payload, 'removeAdmins');
      if (!removeAdmins.ok) {
        return removeAdmins;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          gardenAddress: gardenAddress.value,
          addAdmins: addAdmins.value,
          removeAdmins: removeAdmins.value,
        },
        targetIds: [gardenAddress.value, ...addAdmins.value, ...removeAdmins.value],
      };
    }
    case 'green-goods-mint-hypercert': {
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
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
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
    case 'safe-add-owner': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) return coopId;
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) return scopeValidation;
      const ownerAddress = readRequiredAddress(input.payload, 'ownerAddress');
      if (!ownerAddress.ok) return ownerAddress;
      const newThreshold = readRequiredNonNegativeInteger(input.payload, 'newThreshold');
      if (!newThreshold.ok) return newThreshold;
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          ownerAddress: ownerAddress.value,
          newThreshold: newThreshold.value,
        },
        targetIds: [ownerAddress.value],
      };
    }
    case 'safe-remove-owner': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) return coopId;
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) return scopeValidation;
      const ownerAddress = readRequiredAddress(input.payload, 'ownerAddress');
      if (!ownerAddress.ok) return ownerAddress;
      const newThreshold = readRequiredNonNegativeInteger(input.payload, 'newThreshold');
      if (!newThreshold.ok) return newThreshold;
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          ownerAddress: ownerAddress.value,
          newThreshold: newThreshold.value,
        },
        targetIds: [ownerAddress.value],
      };
    }
    case 'safe-swap-owner': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) return coopId;
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) return scopeValidation;
      const oldOwnerAddress = readRequiredAddress(input.payload, 'oldOwnerAddress');
      if (!oldOwnerAddress.ok) return oldOwnerAddress;
      const newOwnerAddress = readRequiredAddress(input.payload, 'newOwnerAddress');
      if (!newOwnerAddress.ok) return newOwnerAddress;
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          oldOwnerAddress: oldOwnerAddress.value,
          newOwnerAddress: newOwnerAddress.value,
        },
        targetIds: [oldOwnerAddress.value, newOwnerAddress.value],
      };
    }
    case 'safe-change-threshold': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) return coopId;
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) return scopeValidation;
      const newThreshold = readRequiredNonNegativeInteger(input.payload, 'newThreshold');
      if (!newThreshold.ok) return newThreshold;
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          newThreshold: newThreshold.value,
        },
        targetIds: [],
      };
    }
    case 'green-goods-add-gardener': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const gardenAddress = readRequiredAddress(input.payload, 'gardenAddress');
      if (!gardenAddress.ok) {
        return gardenAddress;
      }
      const memberId = readRequiredString(input.payload, 'memberId');
      if (!memberId.ok) {
        return memberId;
      }
      const gardenerAddress = readRequiredAddress(input.payload, 'gardenerAddress');
      if (!gardenerAddress.ok) {
        return gardenerAddress;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          gardenAddress: gardenAddress.value,
          memberId: memberId.value,
          gardenerAddress: gardenerAddress.value,
        },
        targetIds: [memberId.value, gardenAddress.value, gardenerAddress.value],
      };
    }
    case 'green-goods-remove-gardener': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const gardenAddress = readRequiredAddress(input.payload, 'gardenAddress');
      if (!gardenAddress.ok) {
        return gardenAddress;
      }
      const memberId = readRequiredString(input.payload, 'memberId');
      if (!memberId.ok) {
        return memberId;
      }
      const gardenerAddress = readRequiredAddress(input.payload, 'gardenerAddress');
      if (!gardenerAddress.ok) {
        return gardenerAddress;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          gardenAddress: gardenAddress.value,
          memberId: memberId.value,
          gardenerAddress: gardenerAddress.value,
        },
        targetIds: [memberId.value, gardenAddress.value, gardenerAddress.value],
      };
    }
    case 'green-goods-submit-work-submission': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const gardenAddress = readRequiredAddress(input.payload, 'gardenAddress');
      if (!gardenAddress.ok) {
        return gardenAddress;
      }
      const actionUid = readRequiredNonNegativeInteger(input.payload, 'actionUid');
      if (!actionUid.ok) {
        return actionUid;
      }
      const title = readRequiredString(input.payload, 'title');
      if (!title.ok) {
        return title;
      }
      const feedback = readOptionalString(input.payload, 'feedback');
      if (!feedback.ok) {
        return feedback;
      }
      const metadataCid = readRequiredString(input.payload, 'metadataCid');
      if (!metadataCid.ok) {
        return metadataCid;
      }
      const mediaCids = readOptionalStringArray(input.payload, 'mediaCids');
      if (!mediaCids.ok) {
        return mediaCids;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          gardenAddress: gardenAddress.value,
          actionUid: actionUid.value,
          title: title.value,
          feedback: feedback.value ?? '',
          metadataCid: metadataCid.value,
          mediaCids: mediaCids.value ?? [],
        },
        targetIds: [gardenAddress.value, `${actionUid.value}`],
      };
    }
    case 'green-goods-submit-impact-report': {
      const coopId = readRequiredString(input.payload, 'coopId');
      if (!coopId.ok) {
        return coopId;
      }
      const scopeValidation = validateExpectedCoopId(coopId.value, input.expectedCoopId);
      if (!scopeValidation.ok) {
        return scopeValidation;
      }
      const gardenAddress = readRequiredAddress(input.payload, 'gardenAddress');
      if (!gardenAddress.ok) {
        return gardenAddress;
      }
      const title = readRequiredString(input.payload, 'title');
      if (!title.ok) {
        return title;
      }
      const description = readRequiredString(input.payload, 'description');
      if (!description.ok) {
        return description;
      }
      const domain = readRequiredString(input.payload, 'domain');
      if (!domain.ok) {
        return domain;
      }
      if (!['solar', 'agro', 'edu', 'waste'].includes(domain.value)) {
        return { ok: false, reason: 'Action payload has an invalid "domain".' };
      }
      const reportCid = readRequiredString(input.payload, 'reportCid');
      if (!reportCid.ok) {
        return reportCid;
      }
      const metricsSummary = readRequiredString(input.payload, 'metricsSummary');
      if (!metricsSummary.ok) {
        return metricsSummary;
      }
      const reportingPeriodStart = readRequiredNonNegativeInteger(
        input.payload,
        'reportingPeriodStart',
      );
      if (!reportingPeriodStart.ok) {
        return reportingPeriodStart;
      }
      const reportingPeriodEnd = readRequiredNonNegativeInteger(
        input.payload,
        'reportingPeriodEnd',
      );
      if (!reportingPeriodEnd.ok) {
        return reportingPeriodEnd;
      }
      if (reportingPeriodEnd.value < reportingPeriodStart.value) {
        return { ok: false, reason: 'Action payload has an invalid "reportingPeriodEnd".' };
      }
      const submittedBy = readRequiredAddress(input.payload, 'submittedBy');
      if (!submittedBy.ok) {
        return submittedBy;
      }
      return {
        ok: true,
        coopId: coopId.value,
        normalizedPayload: {
          coopId: coopId.value,
          gardenAddress: gardenAddress.value,
          title: title.value,
          description: description.value,
          domain: domain.value,
          reportCid: reportCid.value,
          metricsSummary: metricsSummary.value,
          reportingPeriodStart: reportingPeriodStart.value,
          reportingPeriodEnd: reportingPeriodEnd.value,
          submittedBy: submittedBy.value,
        },
        targetIds: [gardenAddress.value, title.value, reportCid.value],
      };
    }
    case 'erc8004-register-agent': {
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
    case 'erc8004-give-feedback': {
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
  }
}
