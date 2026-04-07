export interface Precedent {
  decision: string;
  outcome: 'positive' | 'negative';
  timeAgo: string;
}

interface PrecedentIndicatorProps {
  precedent: Precedent | null;
}

export function PrecedentIndicator({ precedent }: PrecedentIndicatorProps) {
  if (!precedent) return null;

  const isPositive = precedent.outcome === 'positive';
  const modifier = isPositive ? 'positive' : 'negative';

  return (
    <div className={`draft-card__track-record draft-card__track-record--${modifier}`}>
      {precedent.decision} {precedent.timeAgo}
      {isPositive ? ' \u2192 acted on' : ''}
    </div>
  );
}
