export function TopicBar({
  topic,
  depth,
  sourceCount,
}: {
  topic: string;
  depth: number;
  sourceCount: number;
}) {
  const pct = `${Math.round(depth * 100)}%`;
  const label = sourceCount === 1 ? '1 source' : `${sourceCount} sources`;

  return (
    <div className="topic-bar">
      <span className="topic-bar__label">{topic}</span>
      <div className="topic-bar__track" aria-hidden="true">
        <div className="topic-bar__fill" style={{ width: pct }} />
      </div>
      <span className="topic-bar__count">{label}</span>
    </div>
  );
}
