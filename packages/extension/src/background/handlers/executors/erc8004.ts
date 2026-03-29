import {
  type CoopSharedState,
  type Erc8004LiveExecutor,
  type PolicyActionClass,
  giveAgentFeedback,
  nowIso,
  registerAgentIdentity,
  resolveScopedActionPayload,
} from '@coop/shared';
import { configuredOnchainMode, configuredPimlicoApiKey, saveState } from '../../context';
import { logPrivilegedAction } from '../../operator';
import type { ActionExecutorContext, ExecutorResult } from '../action-executors';
import { createOwnerSafeExecutionContext } from '../session';

export function buildErc8004Executors(
  ctx: ActionExecutorContext,
): Partial<Record<PolicyActionClass, (payload: Record<string, unknown>) => ExecutorResult>> {
  const { bundle, trustedNodeContext } = ctx;

  return {
    'erc8004-register-agent': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'erc8004-register-agent',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) return { ok: false, error: scopedPayload.reason };
      try {
        const coop = trustedNodeContext.coop;
        const agentURI = scopedPayload.normalizedPayload.agentURI as string;
        const metadata =
          (scopedPayload.normalizedPayload.metadata as Array<{ key: string; value: string }>) ?? [];
        let liveExecutor: Erc8004LiveExecutor | undefined;
        if (configuredOnchainMode === 'live') {
          const context = await createOwnerSafeExecutionContext({
            authSession: trustedNodeContext.authSession,
            onchainState: coop.onchainState,
          });
          liveExecutor = async (tx) =>
            context.smartClient.sendTransaction({ ...tx, value: tx.value ?? 0n });
        }
        const result = await registerAgentIdentity({
          mode: configuredOnchainMode,
          onchainState: coop.onchainState,
          agentURI,
          metadata,
          coopId: bundle.coopId,
          pimlicoApiKey: configuredPimlicoApiKey,
          liveExecutor,
        });
        const nextState: CoopSharedState = {
          ...coop,
          agentIdentity: {
            enabled: true,
            agentId: result.agentId,
            agentURI,
            registrationTxHash: result.txHash,
            registeredAt: nowIso(),
            feedbackCount: 0,
            status: 'registered',
            statusNote: result.detail,
          },
        };
        await saveState(nextState);
        await logPrivilegedAction({
          actionType: 'erc8004-registration',
          status: 'succeeded',
          detail: `ERC-8004 agent registered (agentId=${result.agentId}) via tx ${result.txHash}.`,
          coop: nextState,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: nextState.agentIdentity };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'ERC-8004 agent registration failed.';
        await logPrivilegedAction({
          actionType: 'erc8004-registration',
          status: 'failed',
          detail: message,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'erc8004-give-feedback': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'erc8004-give-feedback',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) return { ok: false, error: scopedPayload.reason };
      try {
        const coop = trustedNodeContext.coop;
        const targetAgentId = scopedPayload.normalizedPayload.targetAgentId as number;
        const value = scopedPayload.normalizedPayload.value as number;
        const tag1 = scopedPayload.normalizedPayload.tag1 as string;
        const tag2 = scopedPayload.normalizedPayload.tag2 as string;
        const rationale = (scopedPayload.normalizedPayload.rationale as string) ?? '';
        let feedbackExecutor: Erc8004LiveExecutor | undefined;
        if (configuredOnchainMode === 'live') {
          const ctx = await createOwnerSafeExecutionContext({
            authSession: trustedNodeContext.authSession,
            onchainState: coop.onchainState,
          });
          feedbackExecutor = async (tx) =>
            ctx.smartClient.sendTransaction({ ...tx, value: tx.value ?? 0n });
        }
        const result = await giveAgentFeedback({
          mode: configuredOnchainMode,
          onchainState: coop.onchainState,
          targetAgentId,
          value,
          tag1,
          tag2,
          comment: rationale,
          pimlicoApiKey: configuredPimlicoApiKey,
          liveExecutor: feedbackExecutor,
        });
        const currentIdentity = coop.agentIdentity;
        if (currentIdentity) {
          const nextState: CoopSharedState = {
            ...coop,
            agentIdentity: {
              ...currentIdentity,
              feedbackCount: (currentIdentity.feedbackCount ?? 0) + 1,
              lastFeedbackAt: nowIso(),
            },
          };
          await saveState(nextState);
        }
        await logPrivilegedAction({
          actionType: 'erc8004-feedback',
          status: 'succeeded',
          detail: `ERC-8004 feedback submitted for agentId=${targetAgentId} via tx ${result.txHash}.`,
          coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: { txHash: result.txHash } };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'ERC-8004 feedback submission failed.';
        await logPrivilegedAction({
          actionType: 'erc8004-feedback',
          status: 'failed',
          detail: message,
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
