import type { CoopSharedState } from '@coop/shared';
import type { useDraftEditor } from '../hooks/useDraftEditor';
import { PushControls } from './ChickensPushControls';
import {
  type ReviewItem,
  faviconUrl,
  formatCategoryLabel,
  formatRelativeTime,
  resolvePreviewImage,
  resolveSourceDomain,
  resolveSourceUrl,
} from './chickens-helpers';

// ---------------------------------------------------------------------------
// CompactCard
// ---------------------------------------------------------------------------

export interface CompactCardProps {
  item: ReviewItem;
  coops: CoopSharedState[];
  draftEditor?: ReturnType<typeof useDraftEditor>;
  focused?: boolean;
}

export function CompactCard(props: CompactCardProps) {
  const { item, coops, draftEditor, focused } = props;
  const surfaceTags = item.tags.slice(0, 2);
  const allTags = item.tags.slice(0, 3);
  const previewImage = resolvePreviewImage(item);
  const sourceDomain = resolveSourceDomain(item);
  const sourceUrl = resolveSourceUrl(item);
  const favicon = faviconUrl(item);

  // Unified detail fields — prefer draft data when present, fall back to signal
  const summary = item.draft?.summary ?? item.signal?.targetCoops[0]?.rationale;
  const nextMove = item.draft?.suggestedNextStep ?? item.signal?.targetCoops[0]?.suggestedNextStep;

  return (
    <article className="compact-card" data-focused={focused || undefined}>
      <div className="compact-card__body">
        {/* Left preview rail */}
        {previewImage ? (
          <div className="compact-card__preview-rail">
            <img alt="" className="compact-card__preview-img" loading="lazy" src={previewImage} />
          </div>
        ) : null}

        <div className="compact-card__content">
          <div className="compact-card__header">
            <span className="badge badge--neutral compact-card__category">
              {formatCategoryLabel(item.category)}
            </span>
            <span className="meta-text">{formatRelativeTime(item.timestamp)}</span>
          </div>

          <strong className="compact-card__title">{item.title}</strong>

          {item.insight ? <p className="compact-card__insight">{item.insight}</p> : null}

          {/* Surface tags — subtle, max 2 */}
          {surfaceTags.length > 0 ? (
            <div className="compact-card__surface-tags">
              {surfaceTags.map((tag) => (
                <span className="compact-card__surface-tag" key={`${item.id}:s:${tag}`}>
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          {/* Source row with favicon and domain */}
          {sourceDomain ? (
            <div className="compact-card__source-row">
              {favicon ? (
                <img
                  alt=""
                  className="compact-card__favicon"
                  height={14}
                  loading="lazy"
                  src={favicon}
                  width={14}
                />
              ) : null}
              {sourceUrl ? (
                <a
                  className="compact-card__source-link"
                  href={sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {sourceDomain}
                </a>
              ) : (
                <span className="compact-card__source-domain">{sourceDomain}</span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Push controls — unified across all actionable items */}
      <PushControls item={item} coops={coops} draftEditor={draftEditor} />

      <details className="compact-card__more">
        <summary>Details</summary>
        <div className="compact-card__expanded">
          {allTags.length > 0 ? (
            <div className="compact-card__tags">
              {allTags.map((tag) => (
                <span className="badge badge--neutral compact-card__tag" key={`${item.id}:${tag}`}>
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          {summary ? <p className="compact-card__detail-summary">{summary}</p> : null}
          {nextMove ? (
            <div className="compact-card__detail-row">
              <span className="compact-card__detail-label">Next move</span>
              <p>{nextMove}</p>
            </div>
          ) : null}
          {item.signal?.support && item.signal.support.length > 0 ? (
            <ul className="list-reset compact-card__support-list">
              {item.signal.support.map((s) => (
                <li key={s.id}>
                  <strong>{s.title}</strong>
                  <span className="helper-text">{s.detail}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {item.staleObservation ? (
            <div className="compact-card__detail-row">
              <span className="compact-card__detail-label">Status</span>
              <p>Pending for over 24 hours — needs review</p>
            </div>
          ) : null}
        </div>
      </details>
    </article>
  );
}
