import type { ActionPolicy, PolicyActionClass } from '../../contracts/schema';
import { actionPolicySchema, policyActionClassSchema } from '../../contracts/schema';
import { createId, nowIso } from '../../utils';

const allActionClasses = policyActionClassSchema.options;

export function createDefaultPolicies(input?: {
  coopId?: string;
  memberId?: string;
  createdAt?: string;
}): ActionPolicy[] {
  const createdAt = input?.createdAt ?? nowIso();
  return allActionClasses.map((actionClass) =>
    actionPolicySchema.parse({
      id: createId('policy'),
      actionClass,
      approvalRequired: true,
      replayProtection: true,
      coopId: input?.coopId,
      memberId: input?.memberId,
      createdAt,
      updatedAt: createdAt,
    }),
  );
}

export function createPolicy(input: {
  actionClass: PolicyActionClass;
  approvalRequired?: boolean;
  expiresAt?: string;
  replayProtection?: boolean;
  coopId?: string;
  memberId?: string;
  targetConstraints?: Record<string, string>;
  createdAt?: string;
}): ActionPolicy {
  const createdAt = input.createdAt ?? nowIso();
  return actionPolicySchema.parse({
    id: createId('policy'),
    actionClass: input.actionClass,
    approvalRequired: input.approvalRequired ?? true,
    expiresAt: input.expiresAt,
    replayProtection: input.replayProtection ?? true,
    coopId: input.coopId,
    memberId: input.memberId,
    targetConstraints: input.targetConstraints,
    createdAt,
    updatedAt: createdAt,
  });
}

export function isPolicyExpired(policy: ActionPolicy, now?: string): boolean {
  if (!policy.expiresAt) {
    return false;
  }
  const reference = now ?? nowIso();
  return policy.expiresAt <= reference;
}

export function findMatchingPolicy(
  policies: ActionPolicy[],
  input: {
    actionClass: PolicyActionClass;
    coopId?: string;
    memberId?: string;
  },
): ActionPolicy | undefined {
  return policies.find((policy) => {
    if (policy.actionClass !== input.actionClass) {
      return false;
    }
    if (policy.coopId && policy.coopId !== input.coopId) {
      return false;
    }
    if (policy.memberId && policy.memberId !== input.memberId) {
      return false;
    }
    return true;
  });
}

export function updatePolicy(
  policies: ActionPolicy[],
  policyId: string,
  patch: Partial<Pick<ActionPolicy, 'approvalRequired' | 'expiresAt' | 'targetConstraints'>>,
): ActionPolicy[] {
  return policies.map((policy) => {
    if (policy.id !== policyId) {
      return policy;
    }
    return actionPolicySchema.parse({
      ...policy,
      ...patch,
      updatedAt: nowIso(),
    });
  });
}

export function upsertPolicyForActionClass(
  policies: ActionPolicy[],
  actionClass: PolicyActionClass,
  patch: Partial<Pick<ActionPolicy, 'approvalRequired' | 'expiresAt' | 'targetConstraints'>>,
  defaults?: { coopId?: string; memberId?: string },
): ActionPolicy[] {
  const existing = policies.find((p) => p.actionClass === actionClass);
  if (existing) {
    return updatePolicy(policies, existing.id, patch);
  }
  return [
    ...policies,
    createPolicy({
      actionClass,
      ...patch,
      coopId: defaults?.coopId,
      memberId: defaults?.memberId,
    }),
  ];
}
