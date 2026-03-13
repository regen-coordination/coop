import { describe, expect, it } from 'vitest';
import type { ExecutionGrant, GrantLogEventType } from '../../../contracts/schema';
import { createReplayGuard, recordExecutedReplayId } from '../../policy/replay';
import { validateGrantForExecution } from '../enforcement';
import {
  computeGrantStatus,
  createExecutionGrant,
  formatDelegatedActionLabel,
  formatGrantStatusLabel,
  incrementGrantUsage,
  isGrantUsable,
  refreshGrantStatus,
  revokeGrant,
} from '../grant';
import { appendGrantLog, createGrantLogEntry, formatGrantLogEventLabel } from '../log';

const FIXED_NOW = '2026-03-12T00:00:00.000Z';
const FUTURE = '2026-03-14T00:00:00.000Z';
const PAST = '2026-03-10T00:00:00.000Z';

function makeGrant(overrides: Partial<ExecutionGrant> = {}): ExecutionGrant {
  return createExecutionGrant({
    coopId: overrides.coopId ?? 'coop-1',
    issuedBy: overrides.issuedBy ?? {
      memberId: 'member-1',
      displayName: 'Alice',
    },
    executor: overrides.executor ?? { label: 'inference-bridge' },
    expiresAt: overrides.expiresAt ?? FUTURE,
    maxUses: overrides.maxUses ?? 10,
    allowedActions: overrides.allowedActions ?? ['archive-artifact'],
    targetAllowlist: overrides.targetAllowlist,
    policyRef: overrides.policyRef,
    createdAt: overrides.createdAt ?? FIXED_NOW,
  });
}

describe('grant lifecycle', () => {
  it('createExecutionGrant creates a valid grant with correct defaults', () => {
    const grant = makeGrant();

    expect(grant.id).toMatch(/^grant-/);
    expect(grant.coopId).toBe('coop-1');
    expect(grant.issuedBy).toEqual({ memberId: 'member-1', displayName: 'Alice' });
    expect(grant.executor).toEqual({ label: 'inference-bridge' });
    expect(grant.createdAt).toBe(FIXED_NOW);
    expect(grant.expiresAt).toBe(FUTURE);
    expect(grant.maxUses).toBe(10);
    expect(grant.usedCount).toBe(0);
    expect(grant.allowedActions).toEqual(['archive-artifact']);
    expect(grant.status).toBe('active');
    expect(grant.revokedAt).toBeUndefined();
    expect(grant.targetAllowlist).toBeUndefined();
    expect(grant.policyRef).toBeUndefined();
  });

  it('revokeGrant sets revokedAt and status to revoked', () => {
    const grant = makeGrant();
    const revoked = revokeGrant(grant, FIXED_NOW);

    expect(revoked.revokedAt).toBe(FIXED_NOW);
    expect(revoked.status).toBe('revoked');
    expect(revoked.id).toBe(grant.id);
  });

  it('computeGrantStatus returns active for valid grant', () => {
    const grant = makeGrant();
    expect(computeGrantStatus(grant, FIXED_NOW)).toBe('active');
  });

  it('computeGrantStatus returns expired when past expiresAt', () => {
    const grant = makeGrant({ expiresAt: PAST });
    expect(computeGrantStatus(grant, FIXED_NOW)).toBe('expired');
  });

  it('computeGrantStatus returns revoked when revokedAt is set', () => {
    const grant = makeGrant();
    const revoked = revokeGrant(grant, FIXED_NOW);
    expect(computeGrantStatus(revoked, FIXED_NOW)).toBe('revoked');
  });

  it('computeGrantStatus returns exhausted when usedCount >= maxUses', () => {
    const grant = makeGrant({ maxUses: 1 });
    const used = incrementGrantUsage(grant);
    expect(computeGrantStatus(used, FIXED_NOW)).toBe('exhausted');
  });

  it('refreshGrantStatus updates the status field', () => {
    const grant = makeGrant({ expiresAt: PAST });
    // The grant was created with status 'active' but its expiresAt is in the past
    expect(grant.status).toBe('active');
    const refreshed = refreshGrantStatus(grant, FIXED_NOW);
    expect(refreshed.status).toBe('expired');
  });

  it('incrementGrantUsage increments usedCount', () => {
    const grant = makeGrant({ maxUses: 5 });
    const used = incrementGrantUsage(grant);
    expect(used.usedCount).toBe(1);
    expect(used.status).toBe('active');
  });

  it('incrementGrantUsage sets status to exhausted when limit reached', () => {
    const grant = makeGrant({ maxUses: 1 });
    const used = incrementGrantUsage(grant);
    expect(used.usedCount).toBe(1);
    expect(used.status).toBe('exhausted');
  });

  it('isGrantUsable returns true for active grant', () => {
    const grant = makeGrant();
    expect(isGrantUsable(grant, FIXED_NOW)).toBe(true);
  });

  it('isGrantUsable returns false for expired grant', () => {
    const grant = makeGrant({ expiresAt: PAST });
    expect(isGrantUsable(grant, FIXED_NOW)).toBe(false);
  });

  it('isGrantUsable returns false for revoked grant', () => {
    const grant = revokeGrant(makeGrant(), FIXED_NOW);
    expect(isGrantUsable(grant, FIXED_NOW)).toBe(false);
  });

  it('isGrantUsable returns false for exhausted grant', () => {
    const grant = incrementGrantUsage(makeGrant({ maxUses: 1 }));
    expect(isGrantUsable(grant, FIXED_NOW)).toBe(false);
  });

  it('formatGrantStatusLabel returns correct labels', () => {
    expect(formatGrantStatusLabel('active')).toBe('Active');
    expect(formatGrantStatusLabel('expired')).toBe('Expired');
    expect(formatGrantStatusLabel('revoked')).toBe('Revoked');
    expect(formatGrantStatusLabel('exhausted')).toBe('Exhausted');
  });

  it('formatDelegatedActionLabel returns correct labels', () => {
    expect(formatDelegatedActionLabel('archive-artifact')).toBe('Archive artifact');
    expect(formatDelegatedActionLabel('archive-snapshot')).toBe('Archive snapshot');
    expect(formatDelegatedActionLabel('refresh-archive-status')).toBe('Refresh archive status');
    expect(formatDelegatedActionLabel('publish-ready-draft')).toBe('Publish ready draft');
  });
});

describe('grant enforcement', () => {
  function validInput(grant: ExecutionGrant) {
    return {
      grant,
      actionClass: grant.allowedActions[0],
      coopId: grant.coopId,
      replayId: 'replay-unique-1',
      replayGuard: createReplayGuard(),
      executor: grant.executor,
      now: FIXED_NOW,
    } as const;
  }

  it('passes for valid grant', () => {
    const grant = makeGrant();
    const result = validateGrantForExecution(validInput(grant));
    expect(result.ok).toBe(true);
  });

  it('rejects revoked grant', () => {
    const grant = revokeGrant(makeGrant(), FIXED_NOW);
    const result = validateGrantForExecution(validInput(grant));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectType).toBe('revoked');
      expect(result.reason).toContain('revoked');
    }
  });

  it('rejects expired grant', () => {
    const grant = makeGrant({ expiresAt: PAST });
    const result = validateGrantForExecution(validInput(grant));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectType).toBe('expired');
      expect(result.reason).toContain('expired');
    }
  });

  it('rejects exhausted grant', () => {
    const grant = incrementGrantUsage(makeGrant({ maxUses: 1 }));
    const result = validateGrantForExecution(validInput(grant));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectType).toBe('exhausted');
      expect(result.reason).toContain('usage limit');
    }
  });

  it('rejects wrong coop', () => {
    const grant = makeGrant();
    const result = validateGrantForExecution({
      ...validInput(grant),
      coopId: 'coop-wrong',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectType).toBe('coop-denied');
      expect(result.reason).toContain('not scoped');
    }
  });

  it('rejects disallowed action', () => {
    const grant = makeGrant({ allowedActions: ['archive-artifact'] });
    const result = validateGrantForExecution({
      ...validInput(grant),
      actionClass: 'archive-snapshot',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectType).toBe('action-denied');
      expect(result.reason).toContain('archive-snapshot');
    }
  });

  it('rejects target not in allowlist', () => {
    const grant = makeGrant({
      allowedActions: ['archive-artifact'],
      targetAllowlist: { 'archive-artifact': ['target-a', 'target-b'] },
    });
    const result = validateGrantForExecution({
      ...validInput(grant),
      targetIds: ['target-unknown'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectType).toBe('target-denied');
      expect(result.reason).toContain('target-unknown');
    }
  });

  it('allows target when no allowlist set', () => {
    const grant = makeGrant();
    const result = validateGrantForExecution({
      ...validInput(grant),
      targetIds: ['any-target'],
    });

    expect(result.ok).toBe(true);
  });

  it('allows target when target is in allowlist', () => {
    const grant = makeGrant({
      allowedActions: ['archive-artifact'],
      targetAllowlist: { 'archive-artifact': ['target-a', 'target-b'] },
    });
    const result = validateGrantForExecution({
      ...validInput(grant),
      targetIds: ['target-a'],
    });

    expect(result.ok).toBe(true);
  });

  it('rejects targets when the grant has no allowlist entry for the action', () => {
    const grant = makeGrant({
      allowedActions: ['publish-ready-draft'],
      targetAllowlist: { 'archive-artifact': ['target-a'] },
    });
    const result = validateGrantForExecution({
      ...validInput(grant),
      actionClass: 'publish-ready-draft',
      targetIds: ['draft-1', 'coop-1'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectType).toBe('target-denied');
      expect(result.reason).toContain('draft-1');
    }
  });

  it('rejects executor mismatch when a different runtime tries to use the grant', () => {
    const grant = makeGrant({
      executor: { label: 'operator-console', localIdentityId: 'identity-passkey-1' },
    });
    const result = validateGrantForExecution({
      ...validInput(grant),
      executor: { label: 'operator-console', localIdentityId: 'identity-passkey-2' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectType).toBe('executor-denied');
      expect(result.reason).toContain('different local passkey identity');
    }
  });

  it('rejects delegated publish when any target falls outside the allowlist', () => {
    const grant = makeGrant({
      allowedActions: ['publish-ready-draft'],
      targetAllowlist: { 'publish-ready-draft': ['draft-1', 'coop-1'] },
    });
    const result = validateGrantForExecution({
      ...validInput(grant),
      actionClass: 'publish-ready-draft',
      targetIds: ['draft-1', 'coop-1', 'coop-2'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectType).toBe('target-denied');
      expect(result.reason).toContain('coop-2');
    }
  });

  it('rejects replay ID', () => {
    const grant = makeGrant();
    const guard = recordExecutedReplayId(createReplayGuard(), 'replay-used');
    const result = validateGrantForExecution({
      ...validInput(grant),
      replayId: 'replay-used',
      replayGuard: guard,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectType).toBe('replay-rejected');
      expect(result.reason).toContain('replay-used');
    }
  });

  it('rejects blank replay IDs', () => {
    const grant = makeGrant();
    const result = validateGrantForExecution({
      ...validInput(grant),
      replayId: '   ',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectType).toBe('replay-rejected');
      expect(result.reason).toContain('Replay ID is required');
    }
  });
});

describe('grant audit logging', () => {
  it('createGrantLogEntry creates valid entry', () => {
    const entry = createGrantLogEntry({
      grantId: 'grant-1',
      eventType: 'delegated-execution-succeeded',
      detail: 'Archived artifact successfully',
      actionClass: 'archive-artifact',
      coopId: 'coop-1',
      replayId: 'replay-1',
      createdAt: FIXED_NOW,
    });

    expect(entry.id).toMatch(/^glog-/);
    expect(entry.grantId).toBe('grant-1');
    expect(entry.eventType).toBe('delegated-execution-succeeded');
    expect(entry.detail).toBe('Archived artifact successfully');
    expect(entry.actionClass).toBe('archive-artifact');
    expect(entry.coopId).toBe('coop-1');
    expect(entry.replayId).toBe('replay-1');
    expect(entry.createdAt).toBe(FIXED_NOW);
  });

  it('appendGrantLog prepends and limits', () => {
    const existing = Array.from({ length: 5 }, (_, i) =>
      createGrantLogEntry({
        grantId: 'grant-1',
        eventType: 'delegated-execution-succeeded',
        detail: `Entry ${i}`,
        createdAt: `2026-03-0${i + 1}T00:00:00.000Z`,
      }),
    );

    const newEntry = createGrantLogEntry({
      grantId: 'grant-1',
      eventType: 'grant-revoked',
      detail: 'Revoked by admin',
      createdAt: FIXED_NOW,
    });

    const result = appendGrantLog(existing, newEntry, 4);

    expect(result).toHaveLength(4);
    // Most recent first (FIXED_NOW = 2026-03-12, then 2026-03-05, 2026-03-04, 2026-03-03)
    expect(result[0].createdAt).toBe(FIXED_NOW);
    expect(result[0].eventType).toBe('grant-revoked');
  });

  it('formatGrantLogEventLabel returns correct labels for all event types', () => {
    const expected: Record<GrantLogEventType, string> = {
      'grant-issued': 'Issued',
      'grant-revoked': 'Revoked',
      'grant-expired': 'Expired',
      'delegated-execution-attempted': 'Attempted',
      'delegated-execution-succeeded': 'Succeeded',
      'delegated-execution-failed': 'Failed',
      'delegated-replay-rejected': 'Replay rejected',
      'delegated-exhausted-rejected': 'Exhausted',
    };

    for (const [eventType, label] of Object.entries(expected)) {
      expect(formatGrantLogEventLabel(eventType as GrantLogEventType)).toBe(label);
    }
  });
});

describe('delegated publish respects ready-stage', () => {
  it('publish-ready-draft action class is present in the allowed set', () => {
    const grant = makeGrant({
      allowedActions: ['publish-ready-draft', 'archive-artifact'],
    });

    expect(grant.allowedActions).toContain('publish-ready-draft');

    const result = validateGrantForExecution({
      grant,
      actionClass: 'publish-ready-draft',
      coopId: grant.coopId,
      replayId: 'replay-publish-1',
      replayGuard: createReplayGuard(),
      executor: grant.executor,
      now: FIXED_NOW,
    });

    expect(result.ok).toBe(true);
  });
});
