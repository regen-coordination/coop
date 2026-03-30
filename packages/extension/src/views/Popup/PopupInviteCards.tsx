import type { InviteType } from '@coop/shared';
import type { PopupInviteCardItem } from './popup-types';

function inviteTypeLabel(inviteType: InviteType) {
  return inviteType === 'trusted' ? 'Trusted' : 'Member';
}

function inviteStatusTone(status: PopupInviteCardItem['status']) {
  switch (status) {
    case 'active':
    case 'used':
      return 'success';
    case 'expired':
      return 'warning';
    case 'revoked':
      return 'danger';
    case 'missing':
    default:
      return 'muted';
  }
}

function inviteStatusLabel(status: PopupInviteCardItem['status']) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'used':
      return 'Reusable';
    case 'expired':
      return 'Expired';
    case 'revoked':
      return 'Revoked';
    case 'missing':
    default:
      return 'Missing';
  }
}

function inviteStatusDescription(invite: PopupInviteCardItem) {
  if (invite.status === 'missing') {
    return 'No invite history yet for this lane.';
  }
  if (invite.status === 'revoked') {
    return 'This lane is currently closed until you regenerate a code.';
  }
  if (invite.status === 'expired') {
    return 'This code expired. Regenerate it before sharing.';
  }
  if (invite.status === 'used') {
    return invite.usedCount === 1
      ? 'This code has already admitted 1 member and is still valid for new joins.'
      : `This code has already admitted ${invite.usedCount} members and is still valid for new joins.`;
  }

  return 'This code is current and ready to share.';
}

export function PopupInviteTypeCard(props: {
  coopName: string;
  invite: PopupInviteCardItem;
  onShare: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
  onRevoke: () => void;
}) {
  const { coopName, invite, onShare, onCopy, onRegenerate, onRevoke } = props;
  const label = inviteTypeLabel(invite.inviteType);
  const disableShare =
    !invite.code ||
    invite.status === 'missing' ||
    invite.status === 'revoked' ||
    invite.status === 'expired';
  const disableCopy = !invite.code;
  const disableRevoke = invite.status === 'missing' || invite.status === 'revoked';

  return (
    <article className="popup-invite-card">
      <div className="popup-section-heading">
        <strong>{label}</strong>
        <span className={`popup-mini-pill popup-mini-pill--${inviteStatusTone(invite.status)}`}>
          {inviteStatusLabel(invite.status)}
        </span>
      </div>
      <code className={`popup-invite-card__code${invite.code ? '' : ' is-empty'}`}>
        {invite.code ?? 'No current code'}
      </code>
      <p className="popup-footnote">{inviteStatusDescription(invite)}</p>
      <div className="popup-row-actions">
        <button
          aria-label={`Share ${label.toLowerCase()} invite for ${coopName}`}
          className="popup-text-button popup-text-button--primary"
          disabled={disableShare}
          onClick={onShare}
          type="button"
        >
          Share
        </button>
        <button
          aria-label={`Copy ${label.toLowerCase()} invite code for ${coopName}`}
          className="popup-text-button"
          disabled={disableCopy}
          onClick={onCopy}
          type="button"
        >
          Copy Code
        </button>
        <button
          aria-label={`Regenerate ${label.toLowerCase()} invite for ${coopName}`}
          className="popup-text-button"
          onClick={onRegenerate}
          type="button"
        >
          Regenerate
        </button>
        <button
          aria-label={`Revoke ${label.toLowerCase()} invite for ${coopName}`}
          className="popup-text-button"
          disabled={disableRevoke}
          onClick={onRevoke}
          type="button"
        >
          Revoke
        </button>
      </div>
    </article>
  );
}

export function popupInviteRoleLabel(role?: string) {
  switch (role) {
    case 'creator':
      return 'Creator seat';
    case 'trusted':
      return 'Trusted seat';
    case 'member':
      return 'Member seat';
    default:
      return 'Locked';
  }
}
