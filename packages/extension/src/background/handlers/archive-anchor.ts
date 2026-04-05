import {
  applyArchiveAnchor,
  describeFvmLocalSignerFundingHint,
  describeFvmRegistryRegistrationGate,
  encodeArchiveAnchorCalldata,
  encodeFvmRegisterArchiveCalldata,
  getAnchorCapability,
  getAuthSession,
  getFvmChainConfig,
  inspectFvmRegistryDeployment,
  isFvmInsufficientFundsError,
  updateArchiveReceipt,
} from '@coop/shared';
import { http, type Address, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { RuntimeActionResponse, RuntimeRequest } from '../../runtime/messages';
import { requireAnchorModeForFeature } from '../../runtime/operator';
import { resolveReceiverPairingMember } from '../../runtime/receiver';
import {
  configuredChain,
  configuredFvmChain,
  configuredFvmRegistryAddress,
  configuredOnchainMode,
  configuredPimlicoApiKey,
  db,
  notifyExtensionEvent,
  saveState,
} from '../context';
import { refreshBadge } from '../dashboard';
import { logPrivilegedAction } from '../operator';
import { emitAgentObservationIfMissing } from './agent';
import { ensureLocalMemberFvmSigner, loadArchiveReadyCoop } from './archive-context';
import { createOwnerSafeExecutionContext } from './session';

export async function handleAnchorArchiveCid(
  input: Extract<RuntimeRequest, { type: 'anchor-archive-cid' }>['payload'],
) {
  // In mock onchain mode, skip anchoring entirely.
  if (configuredOnchainMode === 'mock') {
    return {
      ok: true,
      data: { status: 'skipped' },
    } satisfies RuntimeActionResponse;
  }

  if (!configuredPimlicoApiKey) {
    return {
      ok: false,
      error: 'Pimlico API key is required for on-chain CID anchoring.',
    } satisfies RuntimeActionResponse;
  }

  let archiveReady: Awaited<ReturnType<typeof loadArchiveReadyCoop>>;
  try {
    archiveReady = await loadArchiveReadyCoop(input.coopId);
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

  const receipt = coop.archiveReceipts.find((r) => r.id === input.receiptId);
  if (!receipt) {
    return { ok: false, error: 'Archive receipt not found.' } satisfies RuntimeActionResponse;
  }

  if (!receipt.rootCid) {
    return {
      ok: false,
      error: 'Archive receipt has no root CID to anchor.',
    } satisfies RuntimeActionResponse;
  }

  const authSession = await getAuthSession(db);
  const member = resolveReceiverPairingMember(coop, authSession);

  try {
    requireAnchorModeForFeature({
      capability: await getAnchorCapability(db),
      authSession,
      feature: 'archive CID anchoring',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Anchor mode is required.';
    await logPrivilegedAction({
      actionType: 'archive-anchor',
      status: 'failed',
      detail,
      coop,
      memberId: member?.id,
      memberDisplayName: member?.displayName,
      authSession,
      receiptId: input.receiptId,
      archiveScope: receipt.scope,
    });
    return { ok: false, error: detail } satisfies RuntimeActionResponse;
  }

  await logPrivilegedAction({
    actionType: 'archive-anchor',
    status: 'attempted',
    detail: `Anchoring CID ${receipt.rootCid} on-chain for coop ${coop.profile.name}.`,
    coop,
    memberId: member?.id,
    memberDisplayName: member?.displayName,
    authSession,
    receiptId: input.receiptId,
    archiveScope: receipt.scope,
  });

  try {
    const calldata = encodeArchiveAnchorCalldata({
      rootCid: receipt.rootCid,
      pieceCid: receipt.pieceCids[0],
      scope: receipt.scope,
      coopId: input.coopId,
      timestamp: receipt.uploadedAt,
    });

    const context = await createOwnerSafeExecutionContext({
      authSession: (() => {
        if (!authSession) throw new Error('Auth session required for anchor.');
        return authSession;
      })(),
      onchainState: coop.onchainState,
    });

    const txHash = await context.smartClient.sendTransaction({
      to: coop.onchainState.safeAddress as Address,
      value: 0n,
      data: calldata,
    });

    await context.publicClient.waitForTransactionReceipt({ hash: txHash });

    const anchoredReceipt = applyArchiveAnchor(receipt, {
      txHash,
      chainKey: configuredChain,
    });

    const nextState = updateArchiveReceipt(coop, receipt.id, anchoredReceipt);
    await saveState(nextState);

    await logPrivilegedAction({
      actionType: 'archive-anchor',
      status: 'succeeded',
      detail: `CID ${receipt.rootCid} anchored on-chain via tx ${txHash}.`,
      coop,
      memberId: member?.id,
      memberDisplayName: member?.displayName,
      authSession,
      receiptId: input.receiptId,
      archiveScope: receipt.scope,
    });

    await notifyExtensionEvent({
      eventKind: 'archive-anchor',
      entityId: input.receiptId,
      state: txHash,
      title: 'Archive CID anchored',
      message: `${receipt.rootCid} anchored on-chain for ${coop.profile.name}.`,
    });

    await refreshBadge();

    // ERC-8004: fire feedback observation after successful archive anchor (self-attestation)
    if (coop.agentIdentity?.agentId) {
      await emitAgentObservationIfMissing({
        trigger: 'erc8004-feedback-due',
        title: 'ERC-8004 self-attestation due after archive anchor',
        summary: `Archive CID ${receipt.rootCid} was anchored on-chain. Submit positive self-attestation feedback.`,
        coopId: input.coopId,
        payload: {
          reason: 'archive-anchor',
          rootCid: receipt.rootCid,
          txHash,
          targetAgentId: coop.agentIdentity.agentId,
        },
      });
    }

    return {
      ok: true,
      data: { txHash, status: 'anchored' },
    } satisfies RuntimeActionResponse;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'On-chain CID anchoring failed.';
    await logPrivilegedAction({
      actionType: 'archive-anchor',
      status: 'failed',
      detail,
      coop,
      memberId: member?.id,
      memberDisplayName: member?.displayName,
      authSession,
      receiptId: input.receiptId,
      archiveScope: receipt.scope,
    });
    await notifyExtensionEvent({
      eventKind: 'archive-anchor',
      entityId: input.receiptId,
      state: 'failed',
      title: 'Archive CID anchoring failed',
      message: detail,
    });
    return { ok: false, error: detail } satisfies RuntimeActionResponse;
  }
}

export async function handleFvmRegistration(
  input: Extract<RuntimeRequest, { type: 'fvm-register-archive' }>['payload'],
): Promise<RuntimeActionResponse> {
  let archiveReady: Awaited<ReturnType<typeof loadArchiveReadyCoop>>;
  try {
    archiveReady = await loadArchiveReadyCoop(input.coopId);
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

  const receipt = coop.archiveReceipts.find((r) => r.id === input.receiptId);
  if (!receipt) {
    return { ok: false, error: 'Archive receipt not found.' } satisfies RuntimeActionResponse;
  }

  if (!receipt.rootCid) {
    return {
      ok: false,
      error: 'Archive receipt has no root CID to register.',
    } satisfies RuntimeActionResponse;
  }

  if (receipt.delegation?.mode !== 'live') {
    return {
      ok: false,
      error:
        'Only live archive receipts can be registered on Filecoin. Re-run the archive step with live archiving enabled first.',
    } satisfies RuntimeActionResponse;
  }

  const authSession = await getAuthSession(db);
  if (!authSession?.passkey) {
    return {
      ok: false,
      error:
        'A stored passkey session is required before a member can register proofs on Filecoin.',
    } satisfies RuntimeActionResponse;
  }

  const member = resolveReceiverPairingMember(coop, authSession);
  if (!member) {
    return {
      ok: false,
      error: 'Only the authenticated coop member can register this proof on Filecoin.',
    } satisfies RuntimeActionResponse;
  }

  const registryGate = describeFvmRegistryRegistrationGate({
    chainKey: configuredFvmChain,
    configuredRegistryAddress: configuredFvmRegistryAddress,
  });

  if (!registryGate.available || !registryGate.registryAddress) {
    const detail = registryGate.detail;
    await logPrivilegedAction({
      actionType: 'fvm-register-archive',
      status: 'failed',
      detail,
      coop,
      memberId: member?.id,
      memberDisplayName: member?.displayName,
      authSession,
      receiptId: input.receiptId,
      archiveScope: receipt.scope,
    });
    return {
      ok: false,
      error: detail,
    } satisfies RuntimeActionResponse;
  }

  const registryInspection = await inspectFvmRegistryDeployment({
    chainKey: configuredFvmChain,
    registryAddress: registryGate.registryAddress,
  });
  if (!registryInspection.ok) {
    await logPrivilegedAction({
      actionType: 'fvm-register-archive',
      status: 'failed',
      detail: registryInspection.detail,
      coop,
      memberId: member?.id,
      memberDisplayName: member?.displayName,
      authSession,
      receiptId: input.receiptId,
      archiveScope: receipt.scope,
    });
    return {
      ok: false,
      error: registryInspection.detail,
    } satisfies RuntimeActionResponse;
  }

  await logPrivilegedAction({
    actionType: 'fvm-register-archive',
    status: 'attempted',
    detail: `Registering CID ${receipt.rootCid} on FVM CoopRegistry as member ${member.displayName}.`,
    coop,
    memberId: member?.id,
    memberDisplayName: member?.displayName,
    authSession,
    receiptId: input.receiptId,
    archiveScope: receipt.scope,
  });

  let localSigner: Awaited<ReturnType<typeof ensureLocalMemberFvmSigner>> | undefined;
  try {
    localSigner = await ensureLocalMemberFvmSigner(authSession.passkey.id);
    const fvmConfig = getFvmChainConfig(configuredFvmChain);
    const account = privateKeyToAccount(localSigner.privateKey);
    const walletClient = createWalletClient({
      account,
      chain: fvmConfig.chain,
      transport: http(),
    });

    const scope = receipt.scope === 'artifact' ? 0 : 1;
    const calldata = encodeFvmRegisterArchiveCalldata({
      rootCid: receipt.rootCid,
      pieceCid: receipt.pieceCids[0] ?? '',
      scope: scope as 0 | 1,
      coopId: input.coopId,
    });

    const txHash = await walletClient.sendTransaction({
      to: registryGate.registryAddress,
      data: calldata,
    });

    const nextReceipt = { ...receipt, fvmRegistryTxHash: txHash, fvmChainKey: configuredFvmChain };
    const nextState = updateArchiveReceipt(coop, receipt.id, nextReceipt);
    await saveState(nextState);

    await logPrivilegedAction({
      actionType: 'fvm-register-archive',
      status: 'succeeded',
      detail: `CID ${receipt.rootCid} registered on FVM via tx ${txHash} from ${localSigner.accountAddress}.`,
      coop,
      memberId: member?.id,
      memberDisplayName: member?.displayName,
      authSession,
      receiptId: input.receiptId,
      archiveScope: receipt.scope,
    });

    await notifyExtensionEvent({
      eventKind: 'fvm-register-archive',
      entityId: input.receiptId,
      state: txHash,
      title: 'Saved proof registered on Filecoin',
      message: `Your saved proof for ${coop.profile.name} is now on the Filecoin registry.`,
    });

    await refreshBadge();

    return { ok: true, data: { txHash, status: 'registered' } } satisfies RuntimeActionResponse;
  } catch (error) {
    const rawDetail = error instanceof Error ? error.message : 'Filecoin registration failed.';
    const detail =
      localSigner && isFvmInsufficientFundsError(error)
        ? describeFvmLocalSignerFundingHint({
            chainKey: configuredFvmChain,
            signerAddress: localSigner.accountAddress as Address,
            detail: rawDetail,
          })
        : rawDetail;
    await logPrivilegedAction({
      actionType: 'fvm-register-archive',
      status: 'failed',
      detail,
      coop,
      memberId: member?.id,
      memberDisplayName: member?.displayName,
      authSession,
      receiptId: input.receiptId,
      archiveScope: receipt.scope,
    });
    await notifyExtensionEvent({
      eventKind: 'fvm-register-archive',
      entityId: input.receiptId,
      state: 'failed',
      title: 'Filecoin registration had trouble',
      message: detail,
    });
    return { ok: false, error: detail } satisfies RuntimeActionResponse;
  }
}
