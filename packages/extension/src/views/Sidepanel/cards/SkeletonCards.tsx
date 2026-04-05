export interface SkeletonCardsProps {
  count: number;
  label: string;
}

export function SkeletonCards({ count, label }: SkeletonCardsProps) {
  return (
    <output aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have stable count and no identity
        <div className="skeleton skeleton-card" aria-hidden="true" key={i} />
      ))}
    </output>
  );
}

export interface SkeletonSummaryProps {
  label: string;
}

export function SkeletonSummary({ label }: SkeletonSummaryProps) {
  return (
    <output aria-label={label}>
      <div className="summary-strip">
        <div className="skeleton skeleton-summary" aria-hidden="true" />
        <div className="skeleton skeleton-summary" aria-hidden="true" />
        <div className="skeleton skeleton-summary" aria-hidden="true" />
      </div>
      <div className="skeleton skeleton-header" aria-hidden="true" />
      <div className="skeleton skeleton-card" aria-hidden="true" />
      <div className="skeleton skeleton-card" aria-hidden="true" />
    </output>
  );
}
