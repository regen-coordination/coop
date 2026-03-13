import type { DelegatedActionClass, ExecutionGrant, GrantStatus } from '../../contracts/schema';
import { executionGrantSchema } from '../../contracts/schema';
import { createId, nowIso } from '../../utils';

export function createExecutionGrant(input: {
  coopId: string;
  issuedBy: { memberId: string; displayName: string; address?: string };
  executor: { label: string; localIdentityId?: string };
  expiresAt: string;
  maxUses: number;
  allowedActions: DelegatedActionClass[];
  targetAllowlist?: Record<string, string[]>;
  policyRef?: string;
  createdAt?: string;
}): ExecutionGrant {
  return executionGrantSchema.parse({
    id: createId('grant'),
    coopId: input.coopId,
    issuedBy: input.issuedBy,
    executor: input.executor,
    createdAt: input.createdAt ?? nowIso(),
    expiresAt: input.expiresAt,
    maxUses: input.maxUses,
    usedCount: 0,
    allowedActions: input.allowedActions,
    targetAllowlist: input.targetAllowlist,
    policyRef: input.policyRef,
    status: 'active',
  });
}

export function revokeGrant(grant: ExecutionGrant, now?: string): ExecutionGrant {
  const timestamp = now ?? nowIso();
  return executionGrantSchema.parse({
    ...grant,
    revokedAt: timestamp,
    status: 'revoked' as GrantStatus,
  });
}

export function computeGrantStatus(grant: ExecutionGrant, now?: string): GrantStatus {
  if (grant.revokedAt) {
    return 'revoked';
  }
  const reference = now ?? nowIso();
  if (grant.expiresAt <= reference) {
    return 'expired';
  }
  if (grant.usedCount >= grant.maxUses) {
    return 'exhausted';
  }
  return 'active';
}

export function refreshGrantStatus(grant: ExecutionGrant, now?: string): ExecutionGrant {
  const status = computeGrantStatus(grant, now);
  if (status === grant.status) {
    return grant;
  }
  return executionGrantSchema.parse({ ...grant, status });
}

export function incrementGrantUsage(grant: ExecutionGrant): ExecutionGrant {
  return executionGrantSchema.parse({
    ...grant,
    usedCount: grant.usedCount + 1,
    status: grant.usedCount + 1 >= grant.maxUses ? 'exhausted' : grant.status,
  });
}

export function isGrantUsable(grant: ExecutionGrant, now?: string): boolean {
  return computeGrantStatus(grant, now) === 'active';
}

export function formatGrantStatusLabel(status: GrantStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'expired':
      return 'Expired';
    case 'revoked':
      return 'Revoked';
    case 'exhausted':
      return 'Exhausted';
  }
}

export function formatDelegatedActionLabel(actionClass: DelegatedActionClass): string {
  switch (actionClass) {
    case 'archive-artifact':
      return 'Archive artifact';
    case 'archive-snapshot':
      return 'Archive snapshot';
    case 'refresh-archive-status':
      return 'Refresh archive status';
    case 'publish-ready-draft':
      return 'Publish ready draft';
  }
}
