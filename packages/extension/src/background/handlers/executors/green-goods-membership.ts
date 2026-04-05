import {
  type PolicyActionClass,
  addGreenGoodsGardener,
  applyGreenGoodsGardenerActionSuccess,
  applyGreenGoodsMemberBindingError,
  removeGreenGoodsGardener,
  resolveScopedActionPayload,
} from '@coop/shared';
import {
  configuredOnchainMode,
  configuredPimlicoApiKey,
  updateCoopGreenGoodsState,
} from '../../context';
import { logPrivilegedAction } from '../../operator';
import type { ActionExecutorContext, ExecutorResult } from '../action-executors';

export function buildGreenGoodsMembershipExecutors(
  ctx: ActionExecutorContext,
): Partial<Record<PolicyActionClass, (payload: Record<string, unknown>) => ExecutorResult>> {
  const { bundle, trustedNodeContext } = ctx;

  return {
    'green-goods-add-gardener': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-add-gardener',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }

      try {
        const coop = trustedNodeContext.coop;
        const result = await addGreenGoodsGardener({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          gardenerAddress: scopedPayload.normalizedPayload.gardenerAddress as `0x${string}`,
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) {
              throw new Error('Green Goods state is missing.');
            }
            return applyGreenGoodsGardenerActionSuccess({
              garden: current,
              memberId: scopedPayload.normalizedPayload.memberId as string,
              actionClass: 'green-goods-add-gardener',
              gardenerAddress: scopedPayload.normalizedPayload.gardenerAddress as `0x${string}`,
              txHash: result.txHash,
              detail: result.detail,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Added gardener ${scopedPayload.normalizedPayload.gardenerAddress as string} to ${scopedPayload.normalizedPayload.gardenAddress as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: { ...updated.greenGoods, txHash: result.txHash } };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Green Goods gardener add failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) {
                throw new Error(message);
              }
              return applyGreenGoodsMemberBindingError({
                garden: current,
                memberId: scopedPayload.normalizedPayload.memberId as string,
                error: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods gardener add failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'green-goods-remove-gardener': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-remove-gardener',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }

      try {
        const coop = trustedNodeContext.coop;
        const result = await removeGreenGoodsGardener({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          gardenerAddress: scopedPayload.normalizedPayload.gardenerAddress as `0x${string}`,
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) {
              throw new Error('Green Goods state is missing.');
            }
            return applyGreenGoodsGardenerActionSuccess({
              garden: current,
              memberId: scopedPayload.normalizedPayload.memberId as string,
              actionClass: 'green-goods-remove-gardener',
              gardenerAddress: scopedPayload.normalizedPayload.gardenerAddress as `0x${string}`,
              txHash: result.txHash,
              detail: result.detail,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Removed gardener ${scopedPayload.normalizedPayload.gardenerAddress as string} from ${scopedPayload.normalizedPayload.gardenAddress as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: { ...updated.greenGoods, txHash: result.txHash } };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods gardener removal failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) {
                throw new Error(message);
              }
              return applyGreenGoodsMemberBindingError({
                garden: current,
                memberId: scopedPayload.normalizedPayload.memberId as string,
                error: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods gardener removal failed: ${message}`,
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
