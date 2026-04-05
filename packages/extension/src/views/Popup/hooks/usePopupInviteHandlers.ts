import {
  type AuthSession,
  type CoopSharedState,
  type InviteType,
  canManageInvites,
  getComputedInviteStatus,
  getCurrentInviteForType,
} from '@coop/shared';
import { useMemo, useState } from 'react';
import { type SidepanelIntent, sendRuntimeMessage } from '../../../runtime/messages';
import { resolveReceiverPairingMember } from '../../../runtime/receiver';
import type { InviteShareInput } from '../../shared/invite-share';
import type { PopupFooterTab, PopupInviteCoopItem, PopupScreen } from '../popup-types';

export interface PopupInviteHandlersDeps {
  coops: CoopSharedState[];
  authSession: AuthSession | null;
  dashboard: { activeCoopId?: string } | null;
  loadDashboard: () => Promise<void>;
  setMessage: (message: string) => void;
  navigation: { navigate: (screen: PopupScreen) => void };
  activeFooterTab: PopupFooterTab;
  setSubscreenReturnTab: (tab: PopupFooterTab) => void;
  openWorkspace: (input?: {
    windowIdOverride?: number;
    targetCoopId?: string;
    intent?: SidepanelIntent;
  }) => Promise<void>;
}

export function usePopupInviteHandlers(deps: PopupInviteHandlersDeps) {
  const {
    coops,
    authSession,
    dashboard,
    loadDashboard,
    setMessage,
    navigation,
    activeFooterTab,
    setSubscreenReturnTab,
    openWorkspace,
  } = deps;

  const [inviteSuccessCoopId, setInviteSuccessCoopId] = useState<string | null>(null);
  const [joinSuccessCoopId, setJoinSuccessCoopId] = useState<string | null>(null);
  const [shareDialogInvite, setShareDialogInvite] = useState<InviteShareInput | null>(null);

  const inviteHubCoops = useMemo<PopupInviteCoopItem[]>(() => {
    return coops.map((coop) => {
      const inviteHistory = coop.invites ?? [];
      const member = resolveReceiverPairingMember(coop, authSession);
      const canManage = member ? canManageInvites(coop, member.id) : false;
      const currentMemberInvite = getCurrentInviteForType({ invites: inviteHistory }, 'member');
      const currentTrustedInvite = getCurrentInviteForType({ invites: inviteHistory }, 'trusted');
      const hasMemberHistory = inviteHistory.some((invite) => invite.type === 'member');
      const hasTrustedHistory = inviteHistory.some((invite) => invite.type === 'trusted');

      return {
        coopId: coop.profile.id,
        coopName: coop.profile.name,
        memberId: member?.id,
        memberRoleLabel: member?.role,
        canManageInvites: canManage,
        memberInvite: {
          inviteType: 'member' as InviteType,
          status: currentMemberInvite
            ? getComputedInviteStatus(currentMemberInvite)
            : hasMemberHistory
              ? 'revoked'
              : 'missing',
          code: currentMemberInvite?.code,
          expiresAt: currentMemberInvite?.expiresAt,
          usedCount: currentMemberInvite?.usedByMemberIds.length ?? 0,
        },
        trustedInvite: {
          inviteType: 'trusted' as InviteType,
          status: currentTrustedInvite
            ? getComputedInviteStatus(currentTrustedInvite)
            : hasTrustedHistory
              ? 'revoked'
              : 'missing',
          code: currentTrustedInvite?.code,
          expiresAt: currentTrustedInvite?.expiresAt,
          usedCount: currentTrustedInvite?.usedByMemberIds.length ?? 0,
        },
      };
    });
  }, [coops, authSession]);

  const manageableInviteCoops = useMemo(
    () => inviteHubCoops.filter((coop) => coop.canManageInvites),
    [inviteHubCoops],
  );

  const createdInviteCoop = useMemo(
    () => inviteHubCoops.find((coop) => coop.coopId === inviteSuccessCoopId) ?? null,
    [inviteHubCoops, inviteSuccessCoopId],
  );

  const joinedCoop = useMemo(
    () => coops.find((coop) => coop.profile.id === joinSuccessCoopId) ?? null,
    [coops, joinSuccessCoopId],
  );

  async function ensureInviteHubCodes() {
    const invitableCoops = manageableInviteCoops.filter(
      (coop): coop is (typeof manageableInviteCoops)[number] & { memberId: string } =>
        typeof coop.memberId === 'string' && coop.memberId.length > 0,
    );
    if (!invitableCoops.length) {
      return;
    }

    const responses = await Promise.all(
      invitableCoops.map((coop) =>
        sendRuntimeMessage({
          type: 'ensure-invite-codes',
          payload: {
            coopId: coop.coopId,
            createdBy: coop.memberId,
          },
        }),
      ),
    );

    const firstError = responses.find((response) => !response.ok);
    if (firstError?.error) {
      setMessage(firstError.error);
    }
    await loadDashboard();
  }

  async function openInviteHub() {
    setSubscreenReturnTab(activeFooterTab);
    navigation.navigate('invites');
    await ensureInviteHubCodes();
  }

  async function copyInviteCode(coopId: string, inviteType: InviteType) {
    const coop = inviteHubCoops.find((item) => item.coopId === coopId);
    const invite = inviteType === 'trusted' ? coop?.trustedInvite : coop?.memberInvite;
    if (!invite?.code) {
      setMessage('No invite code is available for that group yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(invite.code);
      setMessage(`${inviteType === 'trusted' ? 'Trusted' : 'Member'} invite copied.`);
    } catch {
      setMessage('Could not copy the invite code.');
    }
  }

  async function regenerateInviteCode(coopId: string, inviteType: InviteType) {
    const coop = inviteHubCoops.find((item) => item.coopId === coopId);
    if (!coop?.memberId) {
      setMessage('Only creators and trusted members can manage invites for that coop.');
      return;
    }
    const response = await sendRuntimeMessage({
      type: 'regenerate-invite-code',
      payload: {
        coopId,
        inviteType,
        createdBy: coop.memberId,
      },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not regenerate the invite code.');
      return;
    }
    await loadDashboard();
    setMessage(`${inviteType === 'trusted' ? 'Trusted' : 'Member'} invite regenerated.`);
  }

  async function revokeInviteType(coopId: string, inviteType: InviteType) {
    const coop = inviteHubCoops.find((item) => item.coopId === coopId);
    if (!coop?.memberId) {
      setMessage('Only creators and trusted members can manage invites for that coop.');
      return;
    }
    const response = await sendRuntimeMessage({
      type: 'revoke-invite-type',
      payload: {
        coopId,
        inviteType,
        revokedBy: coop.memberId,
      },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not revoke that invite type.');
      return;
    }
    await loadDashboard();
    setMessage(`${inviteType === 'trusted' ? 'Trusted' : 'Member'} invite revoked.`);
  }

  function openShareDialog(coopId: string, inviteType: InviteType) {
    const coop = inviteHubCoops.find((item) => item.coopId === coopId);
    const invite = inviteType === 'trusted' ? coop?.trustedInvite : coop?.memberInvite;
    if (!coop || !invite?.code || !invite.expiresAt) {
      setMessage('No shareable invite code is available.');
      return;
    }
    setShareDialogInvite({
      coopName: coop.coopName,
      inviteType,
      code: invite.code,
      expiresAt: invite.expiresAt,
    });
  }

  function closeShareDialog() {
    setShareDialogInvite(null);
  }

  async function enterCreatedCoop() {
    if (!inviteSuccessCoopId) {
      navigation.navigate('home');
      return;
    }

    const response = await sendRuntimeMessage({
      type: 'set-active-coop',
      payload: { coopId: inviteSuccessCoopId },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not enter the new coop.');
      return;
    }

    await loadDashboard();
    const targetCoopId = inviteSuccessCoopId;
    setInviteSuccessCoopId(null);
    await openWorkspace({
      targetCoopId,
      intent: {
        tab: 'chickens',
        segment: 'roundup-access',
        roundupAccessMode: 'prompt',
        coopId: targetCoopId,
      },
    });
  }

  async function enterJoinedCoop() {
    if (!joinSuccessCoopId) {
      navigation.navigate('home');
      return;
    }

    const response = await sendRuntimeMessage({
      type: 'set-active-coop',
      payload: { coopId: joinSuccessCoopId },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not enter the coop.');
      return;
    }

    await loadDashboard();
    const targetCoopId = joinSuccessCoopId;
    setJoinSuccessCoopId(null);
    await openWorkspace({
      targetCoopId,
      intent: {
        tab: 'chickens',
        segment: 'roundup-access',
        roundupAccessMode: 'prompt',
        coopId: targetCoopId,
      },
    });
  }

  return {
    inviteHubCoops,
    manageableInviteCoops,
    createdInviteCoop,
    joinedCoop,
    inviteSuccessCoopId,
    setInviteSuccessCoopId,
    joinSuccessCoopId,
    setJoinSuccessCoopId,
    shareDialogInvite,
    openInviteHub,
    copyInviteCode,
    regenerateInviteCode,
    revokeInviteType,
    openShareDialog,
    closeShareDialog,
    enterCreatedCoop,
    enterJoinedCoop,
  };
}
