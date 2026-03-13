import { describe, expect, it } from 'vitest';
import type { ActionBundle } from '../../../contracts/schema';
import { createActionBundle } from '../action-bundle';
import type { ActionHandlerRegistry } from '../executor';
import { executeBundle, validateExecution } from '../executor';
import { createPolicy } from '../policy';
import { createReplayGuard, recordExecutedReplayId } from '../replay';

const FIXED_NOW = '2026-03-12T00:00:00.000Z';
const FUTURE = '2026-03-14T00:00:00.000Z';
const PAST = '2026-03-10T00:00:00.000Z';

function makeApprovedBundle(overrides: { expiresAt?: string } = {}) {
  const policy = createPolicy({
    actionClass: 'archive-artifact',
    approvalRequired: false,
    createdAt: FIXED_NOW,
  });
  return {
    bundle: createActionBundle({
      actionClass: 'archive-artifact',
      coopId: 'coop-1',
      memberId: 'member-1',
      payload: { coopId: 'coop-1', artifactId: 'art-1' },
      policy,
      expiresAt: overrides.expiresAt ?? FUTURE,
      createdAt: FIXED_NOW,
    }),
    policy,
  };
}

function makeProposedBundle() {
  const policy = createPolicy({
    actionClass: 'archive-artifact',
    approvalRequired: true,
    createdAt: FIXED_NOW,
  });
  return {
    bundle: createActionBundle({
      actionClass: 'archive-artifact',
      coopId: 'coop-1',
      memberId: 'member-1',
      payload: { coopId: 'coop-1', artifactId: 'art-1' },
      policy,
      expiresAt: FUTURE,
      createdAt: FIXED_NOW,
    }),
    policy,
  };
}

const successHandler: ActionHandlerRegistry = {
  'archive-artifact': async () => ({ ok: true, data: { uploaded: true } }),
};

const failureHandler: ActionHandlerRegistry = {
  'archive-artifact': async () => ({ ok: false, error: 'Upload failed' }),
};

const throwingHandler: ActionHandlerRegistry = {
  'archive-artifact': async () => {
    throw new Error('Network timeout');
  },
};

describe('executor', () => {
  describe('validateExecution', () => {
    it('passes for valid approved bundle', () => {
      const { bundle, policy } = makeApprovedBundle();
      const guard = createReplayGuard();
      const result = validateExecution(bundle, policy, guard, FIXED_NOW);
      expect(result.ok).toBe(true);
    });

    it('fails if bundle not approved', () => {
      const { bundle, policy } = makeProposedBundle();
      const guard = createReplayGuard();
      const result = validateExecution(bundle, policy, guard, FIXED_NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('not eligible for execution');
        expect(result.rejectType).toBe('execution-failed');
      }
    });

    it('fails if bundle expired (rejectType: expiry-rejected)', () => {
      const { bundle, policy } = makeApprovedBundle({ expiresAt: PAST });
      const guard = createReplayGuard();
      const result = validateExecution(bundle, policy, guard, FIXED_NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('expired');
        expect(result.rejectType).toBe('expiry-rejected');
      }
    });

    it('fails if replay ID consumed (rejectType: replay-rejected)', () => {
      const { bundle, policy } = makeApprovedBundle();
      const guard = recordExecutedReplayId(createReplayGuard(), bundle.replayId);
      const result = validateExecution(bundle, policy, guard, FIXED_NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('already been executed');
        expect(result.rejectType).toBe('replay-rejected');
      }
    });

    it('fails if digest verification fails', () => {
      const { bundle, policy } = makeApprovedBundle();
      const tampered: ActionBundle = { ...bundle, digest: `0x${'ff'.repeat(32)}` };
      const guard = createReplayGuard();
      const result = validateExecution(tampered, policy, guard, FIXED_NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('digest verification failed');
        expect(result.rejectType).toBe('execution-failed');
      }
    });
  });

  describe('executeBundle', () => {
    it('succeeds with valid handler', async () => {
      const { bundle, policy } = makeApprovedBundle();
      const guard = createReplayGuard();

      const result = await executeBundle({
        bundle,
        policy,
        replayGuard: guard,
        handlers: successHandler,
        now: FIXED_NOW,
      });

      expect(result.ok).toBe(true);
      expect(result.bundle.status).toBe('executed');
      expect(result.detail).toBe('Action executed successfully.');
    });

    it('fails when handler returns failure', async () => {
      const { bundle, policy } = makeApprovedBundle();
      const guard = createReplayGuard();

      const result = await executeBundle({
        bundle,
        policy,
        replayGuard: guard,
        handlers: failureHandler,
        now: FIXED_NOW,
      });

      expect(result.ok).toBe(false);
      expect(result.bundle.status).toBe('failed');
      expect(result.detail).toBe('Upload failed');
    });

    it('fails when handler throws', async () => {
      const { bundle, policy } = makeApprovedBundle();
      const guard = createReplayGuard();

      const result = await executeBundle({
        bundle,
        policy,
        replayGuard: guard,
        handlers: throwingHandler,
        now: FIXED_NOW,
      });

      expect(result.ok).toBe(false);
      expect(result.bundle.status).toBe('failed');
      expect(result.detail).toBe('Network timeout');
    });

    it('records replay ID on success', async () => {
      const { bundle, policy } = makeApprovedBundle();
      const guard = createReplayGuard();

      const result = await executeBundle({
        bundle,
        policy,
        replayGuard: guard,
        handlers: successHandler,
        now: FIXED_NOW,
      });

      expect(result.ok).toBe(true);
      expect(result.replayGuard.consumedIds.has(bundle.replayId)).toBe(true);
    });

    it('does not record replay ID on failure', async () => {
      const { bundle, policy } = makeApprovedBundle();
      const guard = createReplayGuard();

      const result = await executeBundle({
        bundle,
        policy,
        replayGuard: guard,
        handlers: failureHandler,
        now: FIXED_NOW,
      });

      expect(result.ok).toBe(false);
      expect(result.replayGuard.consumedIds.has(bundle.replayId)).toBe(false);
    });

    it('fails when no handler registered', async () => {
      const { bundle, policy } = makeApprovedBundle();
      const guard = createReplayGuard();

      const result = await executeBundle({
        bundle,
        policy,
        replayGuard: guard,
        handlers: {},
        now: FIXED_NOW,
      });

      expect(result.ok).toBe(false);
      expect(result.detail).toContain('No handler registered');
      expect(result.bundle.status).toBe('failed');
    });
  });
});
