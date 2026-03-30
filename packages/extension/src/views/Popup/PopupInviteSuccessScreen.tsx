import type { InviteType } from '@coop/shared';
import { PopupInviteTypeCard, popupInviteRoleLabel } from './PopupInviteCards';
import type { PopupInviteCoopItem } from './popup-types';

export function PopupInviteSuccessScreen(props: {
  coop: PopupInviteCoopItem | null;
  onShareInvite: (coopId: string, inviteType: InviteType) => void;
  onCopyInvite: (coopId: string, inviteType: InviteType) => void | Promise<void>;
  onRegenerateInvite: (coopId: string, inviteType: InviteType) => void | Promise<void>;
  onRevokeInvite: (coopId: string, inviteType: InviteType) => void | Promise<void>;
  onEnterCoop: () => void | Promise<void>;
}) {
  const { coop, onShareInvite, onCopyInvite, onRegenerateInvite, onRevokeInvite, onEnterCoop } =
    props;

  return (
    <section className="popup-screen popup-screen--fill">
      <div className="popup-copy-block">
        <span className="popup-eyebrow">New Coop</span>
        <h1>{coop ? `${coop.coopName} is ready to welcome people in.` : 'Your coop is ready.'}</h1>
        <p className="popup-footnote">
          Share the seeded member and trusted codes now, or adjust them before anyone joins.
        </p>
      </div>

      {coop ? (
        <div className="popup-invite-coop popup-invite-coop--success">
          <div className="popup-section-heading">
            <strong>{coop.coopName}</strong>
            <span className="popup-mini-pill popup-mini-pill--muted">
              {popupInviteRoleLabel(coop.memberRoleLabel)}
            </span>
          </div>

          <div className="popup-invite-grid">
            <PopupInviteTypeCard
              coopName={coop.coopName}
              invite={coop.memberInvite}
              onShare={() => onShareInvite(coop.coopId, 'member')}
              onCopy={() => void onCopyInvite(coop.coopId, 'member')}
              onRegenerate={() => void onRegenerateInvite(coop.coopId, 'member')}
              onRevoke={() => void onRevokeInvite(coop.coopId, 'member')}
            />
            <PopupInviteTypeCard
              coopName={coop.coopName}
              invite={coop.trustedInvite}
              onShare={() => onShareInvite(coop.coopId, 'trusted')}
              onCopy={() => void onCopyInvite(coop.coopId, 'trusted')}
              onRegenerate={() => void onRegenerateInvite(coop.coopId, 'trusted')}
              onRevoke={() => void onRevokeInvite(coop.coopId, 'trusted')}
            />
          </div>

          <div className="popup-invite-success__share-actions">
            <button
              className="popup-primary-action"
              disabled={!coop.memberInvite.code}
              onClick={() => onShareInvite(coop.coopId, 'member')}
              type="button"
            >
              Share Member Invite
            </button>
            <button
              className="popup-secondary-action"
              disabled={!coop.trustedInvite.code}
              onClick={() => onShareInvite(coop.coopId, 'trusted')}
              type="button"
            >
              Share Trusted Invite
            </button>
          </div>
        </div>
      ) : (
        <p className="popup-empty-state">Loading the new coop's invite lanes.</p>
      )}

      <div className="popup-stack">
        <button className="popup-primary-action" onClick={() => void onEnterCoop()} type="button">
          Enter Coop
        </button>
      </div>
    </section>
  );
}
