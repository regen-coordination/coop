import {
  applyArchiveOnChainSealWitnesses,
  applyArchiveReceiptFollowUp,
  createStorachaArchiveClient,
  doesArchiveReceiptNeedOnChainSealWitness,
  getAnchorCapability,
  getAuthSession,
  isArchiveReceiptRefreshable,
  issueArchiveDelegation,
  requestArchiveOnChainSealWitness,
  requestArchiveReceiptFilecoinInfo,
  retrieveArchiveBundle,
  updateArchiveReceipt,
} from '@coop/shared';
import type { RuntimeActionResponse, RuntimeRequest } from '../../runtime/messages';
import { requireAnchorModeForFeature } from '../../runtime/operator';
import { resolveReceiverPairingMember } from '../../runtime/receiver';
import {
  configuredArchiveMode,
  db,
  getCoops,
  notifyExtensionEvent,
  resolveArchiveConfigForCoop,
  saveState,
  setRuntimeHealth,
} from '../context';
import { refreshBadge } from '../dashboard';
import { logPrivilegedAction } from '../operator';
import { loadArchiveReadyCoop } from './archive-context';

export async function handleRefreshArchiveStatus(
  message: Extract<RuntimeRequest, { type: 'refresh-archive-status' }>,
) {
  let archiveReady: Awaited<ReturnType<typeof loadArchiveReadyCoop>>;
  try {
    archiveReady = await loadArchiveReadyCoop(message.payload.coopId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Archive recovery reconciliation failed.',
    } satisfies RuntimeActionResponse;
  }
  if (!archiveReady) {
    return { ok: false, error: 'Coop not found.' } satisfies RuntimeActionResponse;
  }
  const { coop } = archiveReady;

  if (configuredArchiveMode !== 'live') {
    return {
      ok: false,
      error: 'Archive follow-up refresh is only available in live archive mode.',
    } satisfies RuntimeActionResponse;
  }

  const authSession = await getAuthSession(db);
  const member = resolveReceiverPairingMember(coop, authSession);
  const archiveConfig = await resolveArchiveConfigForCoop(coop.profile.id, coop);
  const requireOnChainSealWitness = Boolean(archiveConfig?.filecoinWitnessRpcUrl);
  const candidates = coop.archiveReceipts.filter((receipt) =>
    message.payload.receiptId
      ? receipt.id === message.payload.receiptId &&
        (isArchiveReceiptRefreshable(receipt) ||
          (requireOnChainSealWitness && doesArchiveReceiptNeedOnChainSealWitness(receipt)))
      : isArchiveReceiptRefreshable(receipt) ||
        (requireOnChainSealWitness && doesArchiveReceiptNeedOnChainSealWitness(receipt)),
  );

  if (candidates.length === 0) {
    return {
      ok: true,
      data: {
        checked: 0,
        updated: 0,
        failed: 0,
        message: 'No live archive receipts need follow-up right now.',
      },
    } satisfies RuntimeActionResponse;
  }

  await logPrivilegedAction({
    actionType: 'archive-follow-up-refresh',
    status: 'attempted',
    detail: `Refreshing Filecoin status for ${candidates.length} archive receipt(s).`,
    coop,
    memberId: member?.id,
    memberDisplayName: member?.displayName,
    authSession,
    receiptId: message.payload.receiptId,
  });

  try {
    requireAnchorModeForFeature({
      capability: await getAnchorCapability(db),
      authSession,
      feature: 'archive follow-up jobs',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Anchor mode is required.';
    await logPrivilegedAction({
      actionType: 'archive-follow-up-refresh',
      status: 'failed',
      detail,
      coop,
      memberId: member?.id,
      memberDisplayName: member?.displayName,
      authSession,
      receiptId: message.payload.receiptId,
    });
    return {
      ok: false,
      error: detail,
    } satisfies RuntimeActionResponse;
  }

  let client: Awaited<ReturnType<typeof createStorachaArchiveClient>>;
  try {
    client = await createStorachaArchiveClient();
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : 'Could not start the Storacha archive client.';
    await logPrivilegedAction({
      actionType: 'archive-follow-up-refresh',
      status: 'failed',
      detail,
      coop,
      memberId: member?.id,
      memberDisplayName: member?.displayName,
      authSession,
      receiptId: message.payload.receiptId,
    });
    return {
      ok: false,
      error: detail,
    } satisfies RuntimeActionResponse;
  }
  let nextState = coop;
  let updatedCount = 0;
  let failedCount = 0;

  for (const receipt of candidates) {
    try {
      if (!archiveConfig) {
        throw new Error(
          'No archive config available for this coop. Connect a Storacha space in Nest Tools.',
        );
      }
      const delegation = await issueArchiveDelegation({
        config: archiveConfig,
        request: {
          audienceDid: client.did(),
          coopId: coop.profile.id,
          scope: receipt.scope,
          operation: 'follow-up',
          artifactIds: receipt.artifactIds,
          actorAddress: authSession?.primaryAddress,
          safeAddress: coop.profile.safeAddress,
          chainKey: coop.onchainState.chainKey,
          receiptId: receipt.id,
          rootCid: receipt.rootCid,
          pieceCids: receipt.pieceCids,
        },
      });
      const filecoinInfo = await requestArchiveReceiptFilecoinInfo({
        receipt,
        delegation,
        client,
      });
      let nextReceipt = applyArchiveReceiptFollowUp({
        receipt,
        filecoinInfo,
      });
      if (
        archiveConfig.filecoinWitnessRpcUrl &&
        nextReceipt.filecoinStatus === 'sealed' &&
        nextReceipt.filecoinInfo
      ) {
        const witnessRpcUrl = archiveConfig.filecoinWitnessRpcUrl;
        const pieceCid = nextReceipt.filecoinInfo.pieceCid ?? nextReceipt.pieceCids[0];
        if (!pieceCid) {
          throw new Error(
            'Sealed archive receipt has no piece CID for on-chain witness verification.',
          );
        }

        const witnesses = await Promise.all(
          nextReceipt.filecoinInfo.deals.flatMap((deal) =>
            deal.dealId
              ? [
                  requestArchiveOnChainSealWitness({
                    pieceCid,
                    dealId: deal.dealId,
                    provider: deal.provider,
                    rpcUrl: witnessRpcUrl,
                    rpcToken: archiveConfig.filecoinWitnessRpcToken,
                  }).then((witness) => ({
                    aggregate: deal.aggregate,
                    dealId: deal.dealId as string,
                    proof: witness.proof,
                    proofCid: witness.proofCid,
                  })),
                ]
              : [],
          ),
        );

        nextReceipt = applyArchiveOnChainSealWitnesses(nextReceipt, witnesses);
      }
      if (JSON.stringify(nextReceipt) !== JSON.stringify(receipt)) {
        updatedCount += 1;
      }
      nextState = updateArchiveReceipt(nextState, receipt.id, nextReceipt);
    } catch (error) {
      failedCount += 1;
      const nextReceipt = applyArchiveReceiptFollowUp({
        receipt,
        error: error instanceof Error ? error.message : 'Archive follow-up failed.',
      });
      nextState = updateArchiveReceipt(nextState, receipt.id, nextReceipt);
    }
  }

  await saveState(nextState);
  await setRuntimeHealth({
    syncError: failedCount > 0,
    lastSyncError: failedCount > 0 ? 'One or more archive follow-up refreshes failed.' : undefined,
  });
  await logPrivilegedAction({
    actionType: 'archive-follow-up-refresh',
    status: failedCount === candidates.length ? 'failed' : 'succeeded',
    detail:
      failedCount > 0
        ? `Archive follow-up refreshed ${candidates.length - failedCount} receipt(s); ${failedCount} failed.`
        : `Archive follow-up refreshed ${candidates.length} receipt(s).`,
    coop,
    memberId: member?.id,
    memberDisplayName: member?.displayName,
    authSession,
    receiptId: message.payload.receiptId,
  });
  if (failedCount > 0) {
    await notifyExtensionEvent({
      eventKind: 'archive-follow-up',
      entityId: message.payload.receiptId ?? `${coop.profile.id}:${candidates.length}`,
      state: `${failedCount}-failed`,
      title: 'Archive follow-up needs attention',
      message: `Filecoin follow-up failed for ${failedCount} archive receipt(s).`,
    });
  }
  await refreshBadge();

  return {
    ok: true,
    data: {
      checked: candidates.length,
      updated: updatedCount,
      failed: failedCount,
      message:
        failedCount > 0
          ? `Refreshed ${candidates.length - failedCount} receipt(s); ${failedCount} failed.`
          : `Refreshed ${updatedCount} receipt(s) with newer Filecoin status.`,
    },
  } satisfies RuntimeActionResponse;
}

export async function handleRetrieveArchiveBundle(
  message: Extract<RuntimeRequest, { type: 'retrieve-archive-bundle' }>,
): Promise<RuntimeActionResponse> {
  let archiveReady: Awaited<ReturnType<typeof loadArchiveReadyCoop>>;
  try {
    archiveReady = await loadArchiveReadyCoop(message.payload.coopId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Archive recovery reconciliation failed.',
    } satisfies RuntimeActionResponse;
  }
  if (!archiveReady) {
    return { ok: false, error: 'Coop not found.' } satisfies RuntimeActionResponse;
  }
  const { coop } = archiveReady;

  const receipt = coop.archiveReceipts.find((r) => r.id === message.payload.receiptId);
  if (!receipt) {
    return { ok: false, error: 'Archive receipt not found.' } satisfies RuntimeActionResponse;
  }

  try {
    const archiveConfig = await resolveArchiveConfigForCoop(coop.profile.id, coop);
    const result = await retrieveArchiveBundle(receipt, archiveConfig ?? undefined);
    return { ok: true, data: result } satisfies RuntimeActionResponse;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Retrieval failed.',
    } satisfies RuntimeActionResponse;
  }
}

export async function pollUnsealedArchiveReceipts() {
  if (configuredArchiveMode !== 'live') return;

  const coops = await getCoops();
  let polled = 0;
  const maxPerCycle = 5;

  for (const coop of coops) {
    if (polled >= maxPerCycle) break;
    const archiveConfig = await resolveArchiveConfigForCoop(coop.profile.id, coop);
    const requireOnChainSealWitness = Boolean(archiveConfig?.filecoinWitnessRpcUrl);
    const refreshable = coop.archiveReceipts.filter(
      (receipt) =>
        isArchiveReceiptRefreshable(receipt) ||
        (requireOnChainSealWitness && doesArchiveReceiptNeedOnChainSealWitness(receipt)),
    );
    if (refreshable.length === 0) continue;

    const batch = refreshable.slice(0, maxPerCycle - polled);
    for (const receipt of batch) {
      try {
        await handleRefreshArchiveStatus({
          type: 'refresh-archive-status',
          payload: { coopId: coop.profile.id, receiptId: receipt.id },
        });
      } catch (error) {
        console.warn(
          `[archive-poll] Failed to refresh receipt ${receipt.id} for coop ${coop.profile.id}:`,
          error instanceof Error ? error.message : error,
        );
      }
      polled += 1;
    }
  }
}
