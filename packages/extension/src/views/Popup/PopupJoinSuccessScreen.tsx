import type { CoopSharedState } from '@coop/shared';

export function PopupJoinSuccessScreen(props: {
  coop: CoopSharedState | null;
  onEnterCoop: () => void | Promise<void>;
}) {
  const { coop, onEnterCoop } = props;

  return (
    <section className="popup-screen popup-screen--fill">
      <div className="popup-copy-block">
        <span className="popup-eyebrow">Joined</span>
        <h1>{coop ? `You\u2019re in ${coop.profile.name}.` : 'You\u2019re in.'}</h1>
      </div>

      {coop ? (
        <div className="popup-join-success__details">
          <div className="popup-join-success__stat">
            <span className="popup-join-success__stat-value">{coop.members.length}</span>
            <span className="popup-join-success__stat-label">
              {coop.members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          {coop.profile.purpose ? (
            <p className="popup-join-success__purpose">{coop.profile.purpose}</p>
          ) : null}
        </div>
      ) : null}

      <div className="popup-stack">
        <button className="popup-primary-action" onClick={() => void onEnterCoop()} type="button">
          Enter Coop
        </button>
      </div>
    </section>
  );
}
