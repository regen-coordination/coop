import type { DelegatedActionClass, ExecutionGrant } from '../../contracts/schema';
import { nowIso } from '../../utils';
import type { ReplayGuard } from '../policy/replay';
import { checkReplayId } from '../policy/replay';

export type GrantValidationResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      rejectType:
        | 'expired'
        | 'revoked'
        | 'exhausted'
        | 'action-denied'
        | 'coop-denied'
        | 'target-denied'
        | 'executor-denied'
        | 'replay-rejected';
    };

export function validateGrantForExecution(input: {
  grant: ExecutionGrant;
  actionClass: DelegatedActionClass;
  coopId: string;
  replayId: string;
  replayGuard: ReplayGuard;
  targetIds?: string[];
  executor: Pick<ExecutionGrant['executor'], 'label' | 'localIdentityId'>;
  now?: string;
}): GrantValidationResult {
  const now = input.now ?? nowIso();

  // Check revocation first
  if (input.grant.revokedAt) {
    return { ok: false, reason: 'Grant has been revoked.', rejectType: 'revoked' };
  }

  // Check expiry
  if (input.grant.expiresAt <= now) {
    return { ok: false, reason: 'Grant has expired.', rejectType: 'expired' };
  }

  // Check usage limit
  if (input.grant.usedCount >= input.grant.maxUses) {
    return { ok: false, reason: 'Grant usage limit has been reached.', rejectType: 'exhausted' };
  }

  if (input.replayId.trim().length === 0) {
    return { ok: false, reason: 'Replay ID is required.', rejectType: 'replay-rejected' };
  }

  // Check coop scope
  if (input.grant.coopId !== input.coopId) {
    return { ok: false, reason: 'Grant is not scoped to this coop.', rejectType: 'coop-denied' };
  }

  // Check action allowlist
  if (!input.grant.allowedActions.includes(input.actionClass)) {
    return {
      ok: false,
      reason: `Action "${input.actionClass}" is not allowed by this grant.`,
      rejectType: 'action-denied',
    };
  }

  if (input.grant.executor.label !== input.executor.label) {
    return {
      ok: false,
      reason: `Grant is bound to executor "${input.grant.executor.label}".`,
      rejectType: 'executor-denied',
    };
  }

  if (
    input.grant.executor.localIdentityId &&
    input.grant.executor.localIdentityId !== input.executor.localIdentityId
  ) {
    return {
      ok: false,
      reason: 'Grant is bound to a different local passkey identity.',
      rejectType: 'executor-denied',
    };
  }

  // Check target allowlist if present
  const targetIds = Array.from(new Set((input.targetIds ?? []).filter(Boolean)));
  if (targetIds.length > 0 && input.grant.targetAllowlist) {
    const allowedTargets = input.grant.targetAllowlist[input.actionClass];
    const deniedTargets =
      allowedTargets && allowedTargets.length > 0
        ? targetIds.filter((targetId) => !allowedTargets.includes(targetId))
        : targetIds;
    if (deniedTargets.length > 0) {
      return {
        ok: false,
        reason: `Target "${deniedTargets[0]}" is not in the grant allowlist for "${input.actionClass}".`,
        rejectType: 'target-denied',
      };
    }
  }

  // Check replay protection
  const replayCheck = checkReplayId(input.replayGuard, input.replayId);
  if (!replayCheck.ok) {
    return { ok: false, reason: replayCheck.reason, rejectType: 'replay-rejected' };
  }

  return { ok: true };
}
