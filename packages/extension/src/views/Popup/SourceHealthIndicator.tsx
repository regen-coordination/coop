export interface SourceHealthIndicatorProps {
  activeCount: number;
  staleCount: number;
  totalCount: number;
  onOpenSources?: () => void;
}

export function SourceHealthIndicator(props: SourceHealthIndicatorProps) {
  const { activeCount, staleCount, totalCount, onOpenSources } = props;

  let label: string;
  let dot: React.ReactNode = null;

  if (totalCount === 0) {
    label = 'Sources: 0 configured';
  } else if (staleCount > 0) {
    label = `Sources: ${activeCount} active \u00b7 ${staleCount} stale`;
    dot = <span className="source-card__health source-card__health--stale" />;
  } else {
    label = `Sources: ${activeCount} active \u00b7 all fresh`;
    dot = <span className="source-card__health source-card__health--fresh" />;
  }

  return (
    <button className="source-health-indicator" onClick={onOpenSources} type="button">
      {dot}
      <span>{label}</span>
    </button>
  );
}
