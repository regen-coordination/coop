import { TopicBar } from '../../shared/TopicBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KnowledgeTopic {
  topic: string;
  depth: number; // 0-100
  sourceCount: number;
}

export interface RoostKnowledgeSectionProps {
  topics: KnowledgeTopic[];
  stats: { entities: number; relationships: number; sources: number };
}

// ---------------------------------------------------------------------------
// RoostKnowledgeSection
// ---------------------------------------------------------------------------

export function RoostKnowledgeSection({ topics, stats }: RoostKnowledgeSectionProps) {
  if (topics.length === 0) {
    return (
      <article className="panel-card">
        <h2>Knowledge</h2>
        <p className="helper-text">No knowledge yet — add sources in Nest to get started</p>
      </article>
    );
  }

  const sorted = [...topics].sort((a, b) => b.depth - a.depth);

  return (
    <article className="panel-card">
      <h2>Knowledge</h2>
      <div className="roost-activity-list">
        {sorted.map((t) => (
          <TopicBar key={t.topic} topic={t.topic} depth={t.depth} sourceCount={t.sourceCount} />
        ))}
      </div>
      <p className="helper-text">
        {stats.entities} entities &middot; {stats.relationships} relationships &middot;{' '}
        {stats.sources} sources
      </p>
    </article>
  );
}
