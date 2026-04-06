type Precedent = {
  decision: string;
  outcome: string;
  timeAgo: string;
};

export function PrecedentIndicator({ precedent }: { precedent: Precedent | null }) {
  if (precedent === null) {
    return (
      <span className="draft-card__track-record draft-card__track-record--none">No precedent</span>
    );
  }

  const isPositive = precedent.decision === 'approved';
  const modifier = isPositive ? 'positive' : 'negative';

  return (
    <span className={`draft-card__track-record draft-card__track-record--${modifier}`}>
      Similar draft {precedent.decision} {precedent.timeAgo} → {precedent.outcome}
    </span>
  );
}
