import {
  type GreenGoodsGardenState,
  type PolicyActionClass,
  createGreenGoodsAssessment,
  nowIso,
  resolveScopedActionPayload,
  submitGreenGoodsWorkApproval,
  syncGreenGoodsGapAdmins,
  updateGreenGoodsState,
} from '@coop/shared';
import {
  configuredOnchainMode,
  configuredPimlicoApiKey,
  updateCoopGreenGoodsState,
} from '../../context';
import { logPrivilegedAction } from '../../operator';
import type { ActionExecutorContext, ExecutorResult } from '../action-executors';

export function buildGreenGoodsGovernanceExecutors(
  ctx: ActionExecutorContext,
): Partial<Record<PolicyActionClass, (payload: Record<string, unknown>) => ExecutorResult>> {
  const { bundle, trustedNodeContext } = ctx;

  return {
    'green-goods-submit-work-approval': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-submit-work-approval',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) return { ok: false, error: scopedPayload.reason };
      try {
        const coop = trustedNodeContext.coop;
        const result = await submitGreenGoodsWorkApproval({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          output: {
            actionUid: scopedPayload.normalizedPayload.actionUid as number,
            workUid: scopedPayload.normalizedPayload.workUid as `0x${string}`,
            approved: scopedPayload.normalizedPayload.approved as boolean,
            feedback: scopedPayload.normalizedPayload.feedback as string,
            confidence: scopedPayload.normalizedPayload.confidence as number,
            verificationMethod: scopedPayload.normalizedPayload.verificationMethod as number,
            reviewNotesCid: scopedPayload.normalizedPayload.reviewNotesCid as string,
            rationale: 'Submit Green Goods work approval.',
          },
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) throw new Error('Green Goods state is missing.');
            return updateGreenGoodsState(current, {
              status: 'linked',
              lastWorkApprovalAt: nowIso(),
              lastTxHash: result.txHash,
              statusNote: result.detail,
              lastError: undefined,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Submitted Green Goods work approval for ${scopedPayload.normalizedPayload.workUid as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: updated.greenGoods };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods work approval submission failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) throw new Error(message);
              return updateGreenGoodsState(current, {
                status: 'error',
                lastError: message,
                statusNote: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods work approval submission failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'green-goods-create-assessment': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-create-assessment',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) return { ok: false, error: scopedPayload.reason };
      try {
        const coop = trustedNodeContext.coop;
        const result = await createGreenGoodsAssessment({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          output: {
            title: scopedPayload.normalizedPayload.title as string,
            description: scopedPayload.normalizedPayload.description as string,
            assessmentConfigCid: scopedPayload.normalizedPayload.assessmentConfigCid as string,
            domain: scopedPayload.normalizedPayload
              .domain as GreenGoodsGardenState['domains'][number],
            startDate: scopedPayload.normalizedPayload.startDate as number,
            endDate: scopedPayload.normalizedPayload.endDate as number,
            location: scopedPayload.normalizedPayload.location as string,
            rationale: 'Create Green Goods assessment.',
          },
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) throw new Error('Green Goods state is missing.');
            return updateGreenGoodsState(current, {
              status: 'linked',
              lastAssessmentAt: nowIso(),
              lastTxHash: result.txHash,
              statusNote: result.detail,
              lastError: undefined,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Created Green Goods assessment ${scopedPayload.normalizedPayload.title as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: updated.greenGoods };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods assessment creation failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) throw new Error(message);
              return updateGreenGoodsState(current, {
                status: 'error',
                lastError: message,
                statusNote: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods assessment creation failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'green-goods-sync-gap-admins': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-sync-gap-admins',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) return { ok: false, error: scopedPayload.reason };
      try {
        const coop = trustedNodeContext.coop;
        const addAdmins = scopedPayload.normalizedPayload.addAdmins as `0x${string}`[];
        const removeAdmins = scopedPayload.normalizedPayload.removeAdmins as `0x${string}`[];
        const result = await syncGreenGoodsGapAdmins({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          addAdmins,
          removeAdmins,
        });
        const nextAdminAddresses = coop.members
          .filter((m) => m.role === 'creator' || m.role === 'trusted')
          .map((m) => m.address);
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) throw new Error('Green Goods state is missing.');
            return updateGreenGoodsState(current, {
              status: 'linked',
              gapAdminAddresses: nextAdminAddresses,
              lastGapAdminSyncAt: nowIso(),
              lastTxHash: result.txHash,
              statusNote: result.detail,
              lastError: undefined,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Synced Green Goods GAP admins for ${scopedPayload.normalizedPayload.gardenAddress as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: updated.greenGoods };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods GAP admin sync failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) throw new Error(message);
              return updateGreenGoodsState(current, {
                status: 'error',
                lastError: message,
                statusNote: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods GAP admin sync failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
  };
}
