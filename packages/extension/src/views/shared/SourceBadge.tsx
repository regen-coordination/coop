export type KnowledgeSourceType = 'youtube' | 'github' | 'rss' | 'reddit' | 'npm' | 'wikipedia';

const SOURCE_LABELS: Record<KnowledgeSourceType, string> = {
  youtube: 'YT',
  github: 'GH',
  rss: 'RSS',
  reddit: 'r/',
  npm: 'npm',
  wikipedia: 'W',
};

export function SourceBadge({ type, name }: { type: KnowledgeSourceType; name: string }) {
  return (
    <span className={`badge badge--source-${type}`}>
      <span className={`source-icon source-icon--${type}`} aria-hidden="true">
        {SOURCE_LABELS[type]}
      </span>
      {name}
    </span>
  );
}
