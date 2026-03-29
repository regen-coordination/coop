import { describe, expect, it } from 'vitest';
import { policyActionClassSchema } from '../../../contracts/schema';
import {
  createDefaultPolicies,
  createPolicy,
  findMatchingPolicy,
  isDeprecatedPolicyActionClass,
  isPolicyExpired,
  updatePolicy,
  upsertPolicyForActionClass,
} from '../policy';

const FIXED_NOW = '2026-03-12T00:00:00.000Z';
const ACTION_CLASS_COUNT = policyActionClassSchema.options.length - 1;

describe('policy', () => {
  describe('createDefaultPolicies', () => {
    it('creates one policy per action class', () => {
      const policies = createDefaultPolicies({ createdAt: FIXED_NOW });
      expect(policies).toHaveLength(ACTION_CLASS_COUNT);

      const classes = policies.map((p) => p.actionClass);
      expect(classes).toContain('archive-artifact');
      expect(classes).toContain('archive-snapshot');
      expect(classes).toContain('refresh-archive-status');
      expect(classes).toContain('publish-ready-draft');
      expect(classes).toContain('safe-deployment');
      expect(classes).toContain('green-goods-mint-hypercert');
      expect(classes).not.toContain('green-goods-submit-impact-report');
    });

    it('all default policies have approvalRequired=true', () => {
      const policies = createDefaultPolicies({ createdAt: FIXED_NOW });
      for (const policy of policies) {
        expect(policy.approvalRequired).toBe(true);
      }
    });
  });

  describe('createPolicy', () => {
    it('creates a valid policy with defaults', () => {
      const policy = createPolicy({
        actionClass: 'archive-artifact',
        createdAt: FIXED_NOW,
      });

      expect(policy.id).toMatch(/^policy-/);
      expect(policy.actionClass).toBe('archive-artifact');
      expect(policy.approvalRequired).toBe(true);
      expect(policy.replayProtection).toBe(true);
      expect(policy.createdAt).toBe(FIXED_NOW);
      expect(policy.updatedAt).toBe(FIXED_NOW);
      expect(policy.expiresAt).toBeUndefined();
      expect(policy.coopId).toBeUndefined();
      expect(policy.memberId).toBeUndefined();
    });
  });

  describe('isDeprecatedPolicyActionClass', () => {
    it('marks the legacy direct impact-report action as deprecated', () => {
      expect(isDeprecatedPolicyActionClass('green-goods-submit-impact-report')).toBe(true);
      expect(isDeprecatedPolicyActionClass('green-goods-submit-work-submission')).toBe(false);
    });
  });

  describe('isPolicyExpired', () => {
    it('returns false when no expiresAt', () => {
      const policy = createPolicy({
        actionClass: 'archive-artifact',
        createdAt: FIXED_NOW,
      });
      expect(isPolicyExpired(policy, FIXED_NOW)).toBe(false);
    });

    it('returns true when expired', () => {
      const policy = createPolicy({
        actionClass: 'archive-artifact',
        expiresAt: '2026-03-11T00:00:00.000Z',
        createdAt: FIXED_NOW,
      });
      expect(isPolicyExpired(policy, FIXED_NOW)).toBe(true);
    });

    it('returns false when not yet expired', () => {
      const policy = createPolicy({
        actionClass: 'archive-artifact',
        expiresAt: '2026-03-13T00:00:00.000Z',
        createdAt: FIXED_NOW,
      });
      expect(isPolicyExpired(policy, FIXED_NOW)).toBe(false);
    });
  });

  describe('findMatchingPolicy', () => {
    const policies = [
      createPolicy({
        actionClass: 'archive-artifact',
        createdAt: FIXED_NOW,
      }),
      createPolicy({
        actionClass: 'safe-deployment',
        coopId: 'coop-1',
        createdAt: FIXED_NOW,
      }),
      createPolicy({
        actionClass: 'publish-ready-draft',
        memberId: 'member-1',
        createdAt: FIXED_NOW,
      }),
    ];

    it('finds by action class', () => {
      const match = findMatchingPolicy(policies, {
        actionClass: 'archive-artifact',
      });
      expect(match).toBeDefined();
      expect(match?.actionClass).toBe('archive-artifact');
    });

    it('respects coopId constraint', () => {
      const match = findMatchingPolicy(policies, {
        actionClass: 'safe-deployment',
        coopId: 'coop-1',
      });
      expect(match).toBeDefined();
      expect(match?.actionClass).toBe('safe-deployment');

      const noMatch = findMatchingPolicy(policies, {
        actionClass: 'safe-deployment',
        coopId: 'coop-other',
      });
      expect(noMatch).toBeUndefined();
    });

    it('respects memberId constraint', () => {
      const match = findMatchingPolicy(policies, {
        actionClass: 'publish-ready-draft',
        memberId: 'member-1',
      });
      expect(match).toBeDefined();
      expect(match?.actionClass).toBe('publish-ready-draft');

      const noMatch = findMatchingPolicy(policies, {
        actionClass: 'publish-ready-draft',
        memberId: 'member-other',
      });
      expect(noMatch).toBeUndefined();
    });
  });

  describe('updatePolicy', () => {
    it('updates approvalRequired', () => {
      const policy = createPolicy({
        actionClass: 'archive-artifact',
        approvalRequired: true,
        createdAt: FIXED_NOW,
      });
      const updated = updatePolicy([policy], policy.id, {
        approvalRequired: false,
      });

      expect(updated).toHaveLength(1);
      expect(updated[0]?.approvalRequired).toBe(false);
    });
  });

  describe('upsertPolicyForActionClass', () => {
    it('creates new if missing', () => {
      const policies = createDefaultPolicies({ createdAt: FIXED_NOW }).filter(
        (p) => p.actionClass !== 'safe-deployment',
      );
      expect(policies).toHaveLength(ACTION_CLASS_COUNT - 1);

      const result = upsertPolicyForActionClass(policies, 'safe-deployment', {
        approvalRequired: false,
      });

      expect(result).toHaveLength(ACTION_CLASS_COUNT);
      const added = result.find((p) => p.actionClass === 'safe-deployment');
      expect(added).toBeDefined();
      expect(added?.approvalRequired).toBe(false);
    });

    it('updates existing', () => {
      const policies = createDefaultPolicies({ createdAt: FIXED_NOW });
      const result = upsertPolicyForActionClass(policies, 'archive-artifact', {
        approvalRequired: false,
      });

      expect(result).toHaveLength(ACTION_CLASS_COUNT);
      const updated = result.find((p) => p.actionClass === 'archive-artifact');
      expect(updated).toBeDefined();
      expect(updated?.approvalRequired).toBe(false);
    });
  });
});
