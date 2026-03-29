import {
  type PolicyActionClass,
  computeThresholdForOwnerCount,
  encodeAddOwnerCalldata,
  markOwnerChangeExecuted,
  proposeAddOwner,
  resolveScopedActionPayload,
  validateOwnerChange,
} from '@coop/shared';
import { configuredOnchainMode, saveState } from '../../context';
import { logPrivilegedAction } from '../../operator';
import type { ActionExecutorContext, ExecutorResult } from '../action-executors';
import { createOwnerSafeExecutionContext } from '../session';

export function buildOnchainExecutors(
  ctx: ActionExecutorContext,
): Partial<Record<PolicyActionClass, (payload: Record<string, unknown>) => ExecutorResult>> {
  const { bundle, trustedNodeContext } = ctx;

  return {
    'safe-add-owner': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'safe-add-owner',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }

      try {
        const coop = trustedNodeContext.coop;
        const ownerAddress = scopedPayload.normalizedPayload.ownerAddress as `0x${string}`;
        const currentOwners = (coop.onchainState.safeOwners ?? []) as `0x${string}`[];

        // C1: Authorization — verify ownerAddress belongs to a trusted member's account
        const matchingAccount = coop.memberAccounts.find(
          (a) => a.accountAddress?.toLowerCase() === ownerAddress.toLowerCase(),
        );
        if (!matchingAccount) {
          return {
            ok: false,
            error: `Address ${ownerAddress} does not match any member account in this coop.`,
          };
        }
        const matchingMember = coop.members.find((m) => m.id === matchingAccount.memberId);
        if (!matchingMember || matchingMember.role !== 'trusted') {
          return {
            ok: false,
            error: `Only trusted members can be added as Safe co-signers. Member role: ${matchingMember?.role ?? 'unknown'}.`,
          };
        }

        const newThreshold =
          (scopedPayload.normalizedPayload.newThreshold as number | undefined) ??
          computeThresholdForOwnerCount(currentOwners.length + 1);

        // M5: Pre-flight validation
        const change = proposeAddOwner({
          safeAddress: coop.onchainState.safeAddress as `0x${string}`,
          chainKey: coop.onchainState.chainKey,
          ownerToAdd: ownerAddress,
          newThreshold,
          currentOwners,
        });
        const validation = validateOwnerChange(change, currentOwners);
        if (!validation.ok) {
          return { ok: false, error: validation.reason };
        }

        // H4: Both mock and live modes update state
        const updatedOwners = [...currentOwners, ownerAddress];
        const updateCoopState = async (txHash: `0x${string}`) => {
          await saveState({
            ...coop,
            onchainState: {
              ...coop.onchainState,
              safeOwners: updatedOwners,
              safeThreshold: newThreshold,
            },
          });
          return markOwnerChangeExecuted(change, txHash);
        };

        if (configuredOnchainMode !== 'live') {
          const mockTxHash =
            '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
          const executed = await updateCoopState(mockTxHash);
          await logPrivilegedAction({
            actionType: 'safe-add-owner',
            status: 'succeeded',
            detail: `Mock: Added ${ownerAddress} as Safe owner (threshold ${newThreshold}).`,
            coop,
            memberId: trustedNodeContext.member.id,
            memberDisplayName: trustedNodeContext.member.displayName,
            authSession: trustedNodeContext.authSession,
          });
          return { ok: true, data: executed };
        }

        // Live mode — send the addOwner transaction via the coop Safe
        const safeContext = await createOwnerSafeExecutionContext({
          authSession: trustedNodeContext.authSession,
          onchainState: coop.onchainState,
        });

        const calldata = encodeAddOwnerCalldata(ownerAddress, newThreshold);
        const txHash = await safeContext.smartClient.sendTransaction({
          to: coop.onchainState.safeAddress as `0x${string}`,
          data: calldata,
          value: 0n,
        });
        await safeContext.publicClient.waitForTransactionReceipt({ hash: txHash });

        const executed = await updateCoopState(txHash);
        await logPrivilegedAction({
          actionType: 'safe-add-owner',
          status: 'succeeded',
          detail: `Added ${ownerAddress} as Safe owner (threshold ${newThreshold}).`,
          coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: { ...executed, txHash } };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Safe add-owner failed.';
        await logPrivilegedAction({
          actionType: 'safe-add-owner',
          status: 'failed',
          detail: `Safe add-owner failed: ${message}`,
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
