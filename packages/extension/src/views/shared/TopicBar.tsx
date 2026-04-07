interface TopicBarProps {
  topic: string;
  depth: number;
  sourceCount: number;
}

export function TopicBar({ topic, depth, sourceCount }: TopicBarProps) {
  return (
    <div className="topic-bar" data-testid="topic-bar">
      <span className="topic-bar__label" data-testid="topic-bar-label">
        {topic}
      </span>
      <div className="topic-bar__track">
        <div className="topic-bar__fill" style={{ width: `${depth}%` }} />
      </div>
      <span className="topic-bar__meta">
        ({sourceCount} {sourceCount === 1 ? 'source' : 'sources'})
      </span>
    </div>
  );
}
