import { describe, expect, it } from 'vitest';
import type { ActionBundleStatus } from '../../../contracts/schema';
import { createActionBundle } from '../action-bundle';
import {
  approveBundle,
  canTransition,
  completedBundles,
  expireBundle,
  expireStaleBundles,
  markBundleExecuted,
  markBundleFailed,
  pendingBundles,
  rejectBundle,
  transitionBundleStatus,
} from '../approval';
import { createPolicy } from '../policy';

const FIXED_NOW = '2026-03-12T00:00:00.000Z';
const FUTURE = '2026-03-14T00:00:00.000Z';
const PAST = '2026-03-10T00:00:00.000Z';
const TIMESTAMP = '2026-03-12T12:00:00.000Z';

function makeProposedBundle() {
  const policy = createPolicy({
    actionClass: 'archive-artifact',
    approvalRequired: true,
    createdAt: FIXED_NOW,
  });
  return createActionBundle({
    actionClass: 'archive-artifact',
    coopId: 'coop-1',
    memberId: 'member-1',
    payload: { coopId: 'coop-1', artifactId: 'art-1' },
    policy,
    expiresAt: FUTURE,
    createdAt: FIXED_NOW,
  });
}

function makeApprovedBundle() {
  const policy = createPolicy({
    actionClass: 'archive-artifact',
    approvalRequired: false,
    createdAt: FIXED_NOW,
  });
  return createActionBundle({
    actionClass: 'archive-artifact',
    coopId: 'coop-1',
    memberId: 'member-1',
    payload: { coopId: 'coop-1', artifactId: 'art-1' },
    policy,
    expiresAt: FUTURE,
    createdAt: FIXED_NOW,
  });
}

describe('approval', () => {
  describe('canTransition', () => {
    it('proposed -> approved', () => {
      expect(canTransition('proposed', 'approved')).toBe(true);
    });

    it('proposed -> rejected', () => {
      expect(canTransition('proposed', 'rejected')).toBe(true);
    });

    it('proposed -> expired', () => {
      expect(canTransition('proposed', 'expired')).toBe(true);
    });

    it('approved -> executed', () => {
      expect(canTransition('approved', 'executed')).toBe(true);
    });

    it('approved -> failed', () => {
      expect(canTransition('approved', 'failed')).toBe(true);
    });

    it('rejected -> anything is invalid', () => {
      const targets: ActionBundleStatus[] = [
        'proposed',
        'approved',
        'rejected',
        'executed',
        'failed',
        'expired',
      ];
      for (const target of targets) {
        expect(canTransition('rejected', target)).toBe(false);
      }
    });

    it('executed -> anything is invalid', () => {
      const targets: ActionBundleStatus[] = [
        'proposed',
        'approved',
        'rejected',
        'executed',
        'failed',
        'expired',
      ];
      for (const target of targets) {
        expect(canTransition('executed', target)).toBe(false);
      }
    });
  });

  describe('approveBundle', () => {
    it('transitions proposed -> approved with timestamp', () => {
      const bundle = makeProposedBundle();
      const result = approveBundle(bundle, TIMESTAMP);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.status).toBe('approved');
        expect(result.approvedAt).toBe(TIMESTAMP);
      }
    });

    it('errors on already-approved bundle', () => {
      const bundle = makeApprovedBundle();
      const result = approveBundle(bundle, TIMESTAMP);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Cannot transition');
      }
    });
  });

  describe('rejectBundle', () => {
    it('transitions proposed -> rejected', () => {
      const bundle = makeProposedBundle();
      const result = rejectBundle(bundle, TIMESTAMP);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.status).toBe('rejected');
        expect(result.rejectedAt).toBe(TIMESTAMP);
      }
    });
  });

  describe('markBundleExecuted', () => {
    it('transitions approved -> executed', () => {
      const bundle = makeApprovedBundle();
      const result = markBundleExecuted(bundle, TIMESTAMP);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.status).toBe('executed');
        expect(result.executedAt).toBe(TIMESTAMP);
      }
    });
  });

  describe('markBundleFailed', () => {
    it('transitions approved -> failed with reason', () => {
      const bundle = makeApprovedBundle();
      const result = markBundleFailed(bundle, 'Something broke', TIMESTAMP);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.status).toBe('failed');
        expect(result.failedAt).toBe(TIMESTAMP);
        expect(result.failureReason).toBe('Something broke');
      }
    });
  });

  describe('expireBundle', () => {
    it('transitions proposed -> expired', () => {
      const bundle = makeProposedBundle();
      const result = expireBundle(bundle, TIMESTAMP);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.status).toBe('expired');
      }
    });
  });

  describe('expireStaleBundles', () => {
    it('expires old proposed/approved bundles', () => {
      const proposed = makeProposedBundle();
      const approved = makeApprovedBundle();

      // Both bundles have expiresAt = FUTURE, so passing a time after FUTURE should expire them
      const afterFuture = '2026-03-15T00:00:00.000Z';
      const result = expireStaleBundles([proposed, approved], afterFuture);

      expect(result).toHaveLength(2);
      for (const bundle of result) {
        expect(bundle.status).toBe('expired');
      }
    });

    it('leaves future bundles alone', () => {
      const proposed = makeProposedBundle();
      const approved = makeApprovedBundle();

      // Both bundles have expiresAt = FUTURE, so passing a time before FUTURE should leave them
      const result = expireStaleBundles([proposed, approved], FIXED_NOW);

      expect(result).toHaveLength(2);
      expect(result[0]?.status).toBe('proposed');
      expect(result[1]?.status).toBe('approved');
    });
  });

  describe('pendingBundles', () => {
    it('returns only proposed/approved', () => {
      const proposed = makeProposedBundle();
      const approved = makeApprovedBundle();

      // Create a rejected bundle
      const rejectedResult = rejectBundle(makeProposedBundle(), TIMESTAMP);
      expect('error' in rejectedResult).toBe(false);
      const rejected = 'error' in rejectedResult ? makeProposedBundle() : rejectedResult;

      const result = pendingBundles([proposed, approved, rejected]);
      expect(result).toHaveLength(2);
      expect(result.map((b) => b.status)).toEqual(expect.arrayContaining(['proposed', 'approved']));
    });
  });

  describe('completedBundles', () => {
    it('returns only executed/failed/rejected/expired', () => {
      const proposed = makeProposedBundle();
      const approved = makeApprovedBundle();

      // Create terminal-state bundles
      const executedResult = markBundleExecuted(makeApprovedBundle(), TIMESTAMP);
      const executed = 'error' in executedResult ? makeApprovedBundle() : executedResult;

      const failedResult = markBundleFailed(makeApprovedBundle(), 'err', TIMESTAMP);
      const failed = 'error' in failedResult ? makeApprovedBundle() : failedResult;

      const rejectedResult = rejectBundle(makeProposedBundle(), TIMESTAMP);
      const rejected = 'error' in rejectedResult ? makeProposedBundle() : rejectedResult;

      const expiredResult = expireBundle(makeProposedBundle(), TIMESTAMP);
      const expired = 'error' in expiredResult ? makeProposedBundle() : expiredResult;

      const all = [proposed, approved, executed, failed, rejected, expired];
      const result = completedBundles(all);

      expect(result).toHaveLength(4);
      const statuses = result.map((b) => b.status);
      expect(statuses).toContain('executed');
      expect(statuses).toContain('failed');
      expect(statuses).toContain('rejected');
      expect(statuses).toContain('expired');
    });
  });
});
