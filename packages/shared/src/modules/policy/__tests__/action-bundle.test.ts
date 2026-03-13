import { describe, expect, it } from 'vitest';
import {
  buildArchiveArtifactPayload,
  buildArchiveSnapshotPayload,
  buildGreenGoodsCreateAssessmentPayload,
  buildGreenGoodsCreateGardenPayload,
  buildGreenGoodsSetGardenDomainsPayload,
  buildGreenGoodsSubmitWorkApprovalPayload,
  buildGreenGoodsSyncGapAdminsPayload,
  buildPublishReadyDraftPayload,
  buildRefreshArchiveStatusPayload,
  buildSafeDeploymentPayload,
  buildTypedActionBundle,
  computeTypedDigest,
  createActionBundle,
  isBundleExpired,
  validateActionBundle,
} from '../action-bundle';
import { createPolicy } from '../policy';

const FIXED_NOW = '2026-03-12T00:00:00.000Z';
const FUTURE = '2026-03-14T00:00:00.000Z';
const PAST = '2026-03-10T00:00:00.000Z';

function makePolicy(
  overrides: {
    approvalRequired?: boolean;
    expiresAt?: string;
    coopId?: string;
    memberId?: string;
  } = {},
) {
  return createPolicy({
    actionClass: 'archive-artifact',
    approvalRequired: overrides.approvalRequired ?? true,
    expiresAt: overrides.expiresAt,
    coopId: overrides.coopId,
    memberId: overrides.memberId,
    createdAt: FIXED_NOW,
  });
}

function makeBundle(
  overrides: { approvalRequired?: boolean; expiresAt?: string; createdAt?: string } = {},
) {
  const policy = makePolicy({ approvalRequired: overrides.approvalRequired });
  return {
    bundle: createActionBundle({
      actionClass: 'archive-artifact',
      coopId: 'coop-1',
      memberId: 'member-1',
      payload: { coopId: 'coop-1', artifactId: 'art-1' },
      policy,
      expiresAt: overrides.expiresAt ?? FUTURE,
      createdAt: overrides.createdAt ?? FIXED_NOW,
    }),
    policy,
  };
}

describe('action-bundle', () => {
  describe('computeTypedDigest', () => {
    const baseInput = {
      actionClass: 'archive-artifact' as const,
      coopId: 'coop-1',
      memberId: 'member-1',
      replayId: 'replay-1',
      payload: { coopId: 'coop-1', artifactId: 'art-1' },
      createdAt: FIXED_NOW,
      expiresAt: FUTURE,
    };

    it('produces a hex hash', () => {
      const digest = computeTypedDigest(baseInput);
      expect(digest).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('is deterministic (same input = same output)', () => {
      const a = computeTypedDigest(baseInput);
      const b = computeTypedDigest(baseInput);
      expect(a).toBe(b);
    });

    it('changes with different payload', () => {
      const a = computeTypedDigest(baseInput);
      const b = computeTypedDigest({
        ...baseInput,
        payload: { coopId: 'coop-1', artifactId: 'art-2' },
      });
      expect(a).not.toBe(b);
    });
  });

  describe('createActionBundle', () => {
    it('produces valid bundle with proposed status when approval required', () => {
      const { bundle } = makeBundle({ approvalRequired: true });

      expect(bundle.id).toMatch(/^bundle-/);
      expect(bundle.status).toBe('proposed');
      expect(bundle.actionClass).toBe('archive-artifact');
      expect(bundle.coopId).toBe('coop-1');
      expect(bundle.memberId).toBe('member-1');
      expect(bundle.approvedAt).toBeUndefined();
    });

    it('produces valid bundle with approved status when approval not required', () => {
      const { bundle } = makeBundle({ approvalRequired: false });

      expect(bundle.status).toBe('approved');
      expect(bundle.approvedAt).toBe(FIXED_NOW);
    });

    it('generates unique replayId', () => {
      const { bundle: a } = makeBundle();
      const { bundle: b } = makeBundle();
      expect(a.replayId).not.toBe(b.replayId);
    });

    it('sets 24h default expiry', () => {
      const policy = makePolicy();
      const bundle = createActionBundle({
        actionClass: 'archive-artifact',
        coopId: 'coop-1',
        memberId: 'member-1',
        payload: { coopId: 'coop-1', artifactId: 'art-1' },
        policy,
        createdAt: FIXED_NOW,
      });

      const expectedExpiry = new Date(
        new Date(FIXED_NOW).getTime() + 24 * 60 * 60 * 1000,
      ).toISOString();
      expect(bundle.expiresAt).toBe(expectedExpiry);
    });
  });

  describe('isBundleExpired', () => {
    it('returns false when not expired', () => {
      const { bundle } = makeBundle({ expiresAt: FUTURE });
      expect(isBundleExpired(bundle, FIXED_NOW)).toBe(false);
    });

    it('returns true when expired', () => {
      const { bundle } = makeBundle({ expiresAt: PAST });
      expect(isBundleExpired(bundle, FIXED_NOW)).toBe(true);
    });
  });

  describe('validateActionBundle', () => {
    it('passes for valid bundle + policy', () => {
      const { bundle, policy } = makeBundle({ expiresAt: FUTURE });
      const result = validateActionBundle(bundle, policy, FIXED_NOW);
      expect(result.ok).toBe(true);
    });

    it('fails when bundle expired', () => {
      const { bundle, policy } = makeBundle({ expiresAt: PAST });
      const result = validateActionBundle(bundle, policy, FIXED_NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('expired');
      }
    });

    it('fails when policy expired', () => {
      const policy = makePolicy({ expiresAt: PAST });
      const bundle = createActionBundle({
        actionClass: 'archive-artifact',
        coopId: 'coop-1',
        memberId: 'member-1',
        payload: { coopId: 'coop-1', artifactId: 'art-1' },
        policy,
        expiresAt: FUTURE,
        createdAt: FIXED_NOW,
      });
      const result = validateActionBundle(bundle, policy, FIXED_NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('Policy has expired');
      }
    });

    it('fails when action class mismatch', () => {
      const { bundle } = makeBundle({ expiresAt: FUTURE });
      const differentPolicy = createPolicy({
        actionClass: 'safe-deployment',
        createdAt: FIXED_NOW,
      });
      const result = validateActionBundle(bundle, differentPolicy, FIXED_NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('Action class does not match');
      }
    });

    it('fails when digest is tampered', () => {
      const { bundle, policy } = makeBundle({ expiresAt: FUTURE });
      const tampered = { ...bundle, digest: `0x${'ab'.repeat(32)}` };
      const result = validateActionBundle(tampered, policy, FIXED_NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('digest verification failed');
      }
    });

    it('fails when archive payload coop drifts from the bundle scope', () => {
      const { bundle, policy } = makeBundle({ expiresAt: FUTURE });
      const tamperedPayload = { coopId: 'coop-2', artifactId: 'art-1' };
      const tampered = {
        ...bundle,
        payload: tamperedPayload,
        digest: computeTypedDigest({
          actionClass: bundle.actionClass,
          coopId: bundle.coopId,
          memberId: bundle.memberId,
          replayId: bundle.replayId,
          payload: tamperedPayload,
          createdAt: bundle.createdAt,
          expiresAt: bundle.expiresAt,
        }),
        typedAuthorization: buildTypedActionBundle({
          actionClass: bundle.actionClass,
          coopId: bundle.coopId,
          memberId: bundle.memberId,
          replayId: bundle.replayId,
          payload: tamperedPayload,
          createdAt: bundle.createdAt,
          expiresAt: bundle.expiresAt,
        }),
      };
      const result = validateActionBundle(tampered, policy, FIXED_NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('does not match scoped coop');
      }
    });

    it('fails when delegated publish omits the scoped coop from targets', () => {
      const policy = createPolicy({
        actionClass: 'publish-ready-draft',
        approvalRequired: true,
        createdAt: FIXED_NOW,
      });
      const bundle = createActionBundle({
        actionClass: 'publish-ready-draft',
        coopId: 'coop-1',
        memberId: 'member-1',
        payload: {
          draftId: 'draft-1',
          targetCoopIds: ['coop-2'],
        },
        policy,
        expiresAt: FUTURE,
        createdAt: FIXED_NOW,
      });

      const result = validateActionBundle(bundle, policy, FIXED_NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('scoped coop');
      }
    });

    it('passes for a valid Green Goods create-garden bundle', () => {
      const policy = createPolicy({
        actionClass: 'green-goods-create-garden',
        approvalRequired: true,
        createdAt: FIXED_NOW,
      });
      const bundle = createActionBundle({
        actionClass: 'green-goods-create-garden',
        coopId: 'coop-1',
        memberId: 'member-1',
        payload: buildGreenGoodsCreateGardenPayload({
          coopId: 'coop-1',
          name: 'Watershed Commons',
          description: 'Bioregional coordination garden.',
          weightScheme: 'linear',
          domains: ['agro', 'edu'],
          operatorAddresses: ['0x1111111111111111111111111111111111111111'],
          gardenerAddresses: ['0x1111111111111111111111111111111111111111'],
        }),
        policy,
        expiresAt: FUTURE,
        createdAt: FIXED_NOW,
      });

      expect(validateActionBundle(bundle, policy, FIXED_NOW)).toEqual({ ok: true });
    });

    it('fails when Green Goods garden domains are invalid', () => {
      const policy = createPolicy({
        actionClass: 'green-goods-set-garden-domains',
        approvalRequired: true,
        createdAt: FIXED_NOW,
      });
      const bundle = createActionBundle({
        actionClass: 'green-goods-set-garden-domains',
        coopId: 'coop-1',
        memberId: 'member-1',
        payload: buildGreenGoodsSetGardenDomainsPayload({
          coopId: 'coop-1',
          gardenAddress: '0x1111111111111111111111111111111111111111',
          domains: ['agro', 'invalid-domain'],
        }),
        policy,
        expiresAt: FUTURE,
        createdAt: FIXED_NOW,
      });

      const result = validateActionBundle(bundle, policy, FIXED_NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('invalid "domains"');
      }
    });

    it('passes for a valid Green Goods work approval bundle', () => {
      const policy = createPolicy({
        actionClass: 'green-goods-submit-work-approval',
        approvalRequired: true,
        createdAt: FIXED_NOW,
      });
      const bundle = createActionBundle({
        actionClass: 'green-goods-submit-work-approval',
        coopId: 'coop-1',
        memberId: 'member-1',
        payload: buildGreenGoodsSubmitWorkApprovalPayload({
          coopId: 'coop-1',
          gardenAddress: '0x1111111111111111111111111111111111111111',
          actionUid: 42,
          workUid: `0x${'ab'.repeat(32)}`,
          approved: true,
          feedback: 'Verified from field notes.',
          confidence: 100,
          verificationMethod: 1,
          reviewNotesCid: 'bafy-notes',
        }),
        policy,
        expiresAt: FUTURE,
        createdAt: FIXED_NOW,
      });

      expect(validateActionBundle(bundle, policy, FIXED_NOW)).toEqual({ ok: true });
    });

    it('passes for a valid Green Goods assessment bundle', () => {
      const policy = createPolicy({
        actionClass: 'green-goods-create-assessment',
        approvalRequired: true,
        createdAt: FIXED_NOW,
      });
      const bundle = createActionBundle({
        actionClass: 'green-goods-create-assessment',
        coopId: 'coop-1',
        memberId: 'member-1',
        payload: buildGreenGoodsCreateAssessmentPayload({
          coopId: 'coop-1',
          gardenAddress: '0x1111111111111111111111111111111111111111',
          title: 'Quarterly agro assessment',
          description: 'Watershed and soil regeneration review.',
          assessmentConfigCid: 'bafy-assessment-config',
          domain: 'agro',
          startDate: 1_710_000_000,
          endDate: 1_710_086_400,
          location: 'Watershed Commons',
        }),
        policy,
        expiresAt: FUTURE,
        createdAt: FIXED_NOW,
      });

      expect(validateActionBundle(bundle, policy, FIXED_NOW)).toEqual({ ok: true });
    });

    it('passes for a valid Green Goods GAP admin sync bundle', () => {
      const policy = createPolicy({
        actionClass: 'green-goods-sync-gap-admins',
        approvalRequired: true,
        createdAt: FIXED_NOW,
      });
      const bundle = createActionBundle({
        actionClass: 'green-goods-sync-gap-admins',
        coopId: 'coop-1',
        memberId: 'member-1',
        payload: buildGreenGoodsSyncGapAdminsPayload({
          coopId: 'coop-1',
          gardenAddress: '0x1111111111111111111111111111111111111111',
          addAdmins: ['0x2222222222222222222222222222222222222222'],
          removeAdmins: ['0x3333333333333333333333333333333333333333'],
        }),
        policy,
        expiresAt: FUTURE,
        createdAt: FIXED_NOW,
      });

      expect(validateActionBundle(bundle, policy, FIXED_NOW)).toEqual({ ok: true });
    });
  });

  describe('payload builders', () => {
    it('buildArchiveArtifactPayload produces correct shape', () => {
      const payload = buildArchiveArtifactPayload({
        coopId: 'coop-1',
        artifactId: 'art-1',
      });
      expect(payload).toEqual({ coopId: 'coop-1', artifactId: 'art-1' });
    });

    it('buildArchiveSnapshotPayload produces correct shape', () => {
      const payload = buildArchiveSnapshotPayload({ coopId: 'coop-1' });
      expect(payload).toEqual({ coopId: 'coop-1' });
    });

    it('buildRefreshArchiveStatusPayload produces correct shape', () => {
      const payload = buildRefreshArchiveStatusPayload({
        coopId: 'coop-1',
        receiptId: 'receipt-1',
      });
      expect(payload).toEqual({ coopId: 'coop-1', receiptId: 'receipt-1' });
    });

    it('buildPublishReadyDraftPayload produces correct shape', () => {
      const payload = buildPublishReadyDraftPayload({
        draftId: 'draft-1',
        targetCoopIds: ['coop-1', 'coop-2'],
      });
      expect(payload).toEqual({
        draftId: 'draft-1',
        targetCoopIds: ['coop-1', 'coop-2'],
      });
    });

    it('buildSafeDeploymentPayload produces correct shape', () => {
      const payload = buildSafeDeploymentPayload({ coopSeed: 'seed-abc' });
      expect(payload).toEqual({ coopSeed: 'seed-abc' });
    });

    it('buildGreenGoodsCreateGardenPayload produces correct shape', () => {
      const payload = buildGreenGoodsCreateGardenPayload({
        coopId: 'coop-1',
        name: 'Watershed Commons',
        description: 'Bioregional coordination garden.',
        weightScheme: 'linear',
        domains: ['agro'],
      });
      expect(payload).toEqual({
        coopId: 'coop-1',
        name: 'Watershed Commons',
        slug: undefined,
        description: 'Bioregional coordination garden.',
        location: undefined,
        bannerImage: undefined,
        metadata: undefined,
        openJoining: false,
        maxGardeners: 0,
        weightScheme: 'linear',
        domains: ['agro'],
        operatorAddresses: [],
        gardenerAddresses: [],
      });
    });

    it('buildGreenGoodsSubmitWorkApprovalPayload produces correct shape', () => {
      const payload = buildGreenGoodsSubmitWorkApprovalPayload({
        coopId: 'coop-1',
        gardenAddress: '0x1111111111111111111111111111111111111111',
        actionUid: 42,
        workUid: `0x${'ab'.repeat(32)}`,
        approved: true,
        confidence: 100,
        verificationMethod: 1,
      });
      expect(payload).toEqual({
        coopId: 'coop-1',
        gardenAddress: '0x1111111111111111111111111111111111111111',
        actionUid: 42,
        workUid: `0x${'ab'.repeat(32)}`,
        approved: true,
        feedback: '',
        confidence: 100,
        verificationMethod: 1,
        reviewNotesCid: '',
      });
    });

    it('buildGreenGoodsCreateAssessmentPayload produces correct shape', () => {
      const payload = buildGreenGoodsCreateAssessmentPayload({
        coopId: 'coop-1',
        gardenAddress: '0x1111111111111111111111111111111111111111',
        title: 'Quarterly agro assessment',
        description: 'Watershed and soil regeneration review.',
        assessmentConfigCid: 'bafy-assessment-config',
        domain: 'agro',
        startDate: 1_710_000_000,
        endDate: 1_710_086_400,
      });
      expect(payload).toEqual({
        coopId: 'coop-1',
        gardenAddress: '0x1111111111111111111111111111111111111111',
        title: 'Quarterly agro assessment',
        description: 'Watershed and soil regeneration review.',
        assessmentConfigCid: 'bafy-assessment-config',
        domain: 'agro',
        startDate: 1_710_000_000,
        endDate: 1_710_086_400,
        location: '',
      });
    });

    it('buildGreenGoodsSyncGapAdminsPayload produces correct shape', () => {
      const payload = buildGreenGoodsSyncGapAdminsPayload({
        coopId: 'coop-1',
        gardenAddress: '0x1111111111111111111111111111111111111111',
        addAdmins: ['0x2222222222222222222222222222222222222222'],
      });
      expect(payload).toEqual({
        coopId: 'coop-1',
        gardenAddress: '0x1111111111111111111111111111111111111111',
        addAdmins: ['0x2222222222222222222222222222222222222222'],
        removeAdmins: [],
      });
    });
  });
});
