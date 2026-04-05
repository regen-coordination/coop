import {
  type GreenGoodsHypercertJsonUploader,
  type GreenGoodsHypercertMintRequest,
  type PolicyActionClass,
  applyArchiveDelegationToClient,
  createStorachaArchiveClient,
  issueArchiveDelegation,
  mintGreenGoodsHypercert,
  nowIso,
  resolveScopedActionPayload,
  updateGreenGoodsState,
} from '@coop/shared';
import {
  configuredOnchainMode,
  configuredPimlicoApiKey,
  resolveArchiveConfigForCoop,
  updateCoopGreenGoodsState,
} from '../../context';
import { logPrivilegedAction } from '../../operator';
import type { ActionExecutorContext, ExecutorResult } from '../action-executors';

async function createGreenGoodsHypercertUploader(input: {
  coop: ActionExecutorContext['trustedNodeContext']['coop'];
  authSession: NonNullable<ActionExecutorContext['trustedNodeContext']['authSession']>;
}): Promise<GreenGoodsHypercertJsonUploader> {
  const archiveConfig = await resolveArchiveConfigForCoop(input.coop.profile.id, input.coop);
  if (!archiveConfig) {
    throw new Error(
      'A live archive config is required before Green Goods Hypercert packaging can execute.',
    );
  }

  const client = await createStorachaArchiveClient();
  const delegation = await issueArchiveDelegation({
    config: archiveConfig,
    request: {
      audienceDid: client.did(),
      coopId: input.coop.profile.id,
      scope: 'artifact',
      operation: 'upload',
      artifactIds: [],
      actorAddress: input.authSession.primaryAddress,
      safeAddress: input.coop.onchainState.safeAddress,
      chainKey: input.coop.onchainState.chainKey,
    },
  });
  await applyArchiveDelegationToClient(client, delegation);

  return async ({ payload }) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const cid = (await client.uploadFile(blob)).toString();
    return {
      cid,
      uri: `ipfs://${cid}`,
    };
  };
}

export function buildGreenGoodsHypercertExecutors(
  ctx: ActionExecutorContext,
): Partial<Record<PolicyActionClass, (payload: Record<string, unknown>) => ExecutorResult>> {
  const { bundle, trustedNodeContext } = ctx;

  return {
    'green-goods-mint-hypercert': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-mint-hypercert',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }

      try {
        const coop = trustedNodeContext.coop;
        const { coopId: _ignoredCoopId, ...requestPayload } = scopedPayload.normalizedPayload;
        const uploader =
          configuredOnchainMode === 'live'
            ? await createGreenGoodsHypercertUploader({
                coop,
                authSession: trustedNodeContext.authSession,
              })
            : undefined;
        const result = await mintGreenGoodsHypercert({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          request: requestPayload as GreenGoodsHypercertMintRequest,
          uploader,
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) {
              throw new Error('Green Goods state is missing.');
            }
            return updateGreenGoodsState(current, {
              status: 'linked',
              lastHypercertMintAt: nowIso(),
              lastHypercertId: result.hypercertId,
              lastHypercertMetadataUri: result.metadataUri,
              lastHypercertAllowlistUri: result.allowlistUri,
              lastTxHash: result.txHash,
              statusNote: result.detail,
              lastError: undefined,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Minted Green Goods Hypercert for ${requestPayload.gardenAddress as string}${result.hypercertId ? ` (hypercert ${result.hypercertId})` : ''}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: updated.greenGoods };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods Hypercert minting failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) {
                throw new Error(message);
              }
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
          detail: `Green Goods Hypercert minting failed: ${message}`,
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
