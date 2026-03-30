import type { InviteType } from '@coop/shared';
import { PopupInviteTypeCard, popupInviteRoleLabel } from './PopupInviteCards';
import type { PopupInviteCoopItem } from './popup-types';

export function PopupInviteHubScreen(props: {
  coops: PopupInviteCoopItem[];
  onShareInvite: (coopId: string, inviteType: InviteType) => void;
  onCopyInvite: (coopId: string, inviteType: InviteType) => void | Promise<void>;
  onRegenerateInvite: (coopId: string, inviteType: InviteType) => void | Promise<void>;
  onRevokeInvite: (coopId: string, inviteType: InviteType) => void | Promise<void>;
}) {
  const { coops, onShareInvite, onCopyInvite, onRegenerateInvite, onRevokeInvite } = props;

  return (
    <section className="popup-screen popup-screen--fill">
      <div className="popup-copy-block popup-copy-block--compact">
        <span className="popup-eyebrow">Invites</span>
        <h1>Manage the canonical doors into each coop.</h1>
        <p className="popup-footnote">
          Member codes welcome people in. Trusted codes grant deeper stewardship controls.
        </p>
      </div>

      <div className="popup-list-grow">
        <ul className="popup-activity-list popup-activity-list--stretch popup-list-reset">
          {coops.map((coop) => (
            <li className="popup-invite-coop" key={coop.coopId}>
              <div className="popup-section-heading">
                <div className="popup-copy-block popup-copy-block--compact">
                  <strong>{coop.coopName}</strong>
                  <p className="popup-footnote">
                    {coop.canManageInvites
                      ? 'This session can manage both canonical invite lanes.'
                      : 'Invite management is limited to creators and trusted members in this coop.'}
                  </p>
                </div>
                <span className="popup-mini-pill popup-mini-pill--muted">
                  {popupInviteRoleLabel(coop.memberRoleLabel)}
                </span>
              </div>

              {coop.canManageInvites ? (
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
              ) : (
                <p className="popup-empty-state">
                  Open this coop as a creator or trusted member to copy, rotate, or revoke its
                  canonical invite codes.
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
