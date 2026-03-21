import type { PopupFeedArtifactItem } from './popup-types';

export function PopupFeedScreen(props: {
  artifacts: PopupFeedArtifactItem[];
  onOpenArtifact: (artifactId: string) => void;
}) {
  const { artifacts, onOpenArtifact } = props;

  return (
    <section className="popup-screen popup-screen--fill">
      <div className="popup-copy-block popup-copy-block--compact">
        <h1>Feed</h1>
        <p>Shared notes from your coop.</p>
      </div>

      <div className="popup-list-grow">
        {artifacts.length > 0 ? (
          <ul className="popup-list-reset popup-activity-list popup-activity-list--stretch">
            {artifacts.map((artifact) => (
              <li key={artifact.id}>
                <button
                  className="popup-activity-row popup-activity-row--button"
                  onClick={() => onOpenArtifact(artifact.id)}
                  type="button"
                >
                  <div className="popup-activity-row__copy">
                    <strong>{artifact.title}</strong>
                    <span>{artifact.summary}</span>
                    <span className="popup-review-queue__pills">
                      <span className="popup-mini-pill popup-mini-pill--muted">
                        {artifact.coopLabel}
                      </span>
                      <span className="popup-mini-pill">Shared</span>
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="popup-empty-state">
            Nothing shared yet. Publish a draft to start the feed.
          </p>
        )}
      </div>
    </section>
  );
}
