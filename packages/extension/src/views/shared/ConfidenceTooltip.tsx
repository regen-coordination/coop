import { useState } from 'react';

interface ConfidenceBreakdown {
  schema: number;
  content: number;
  precedentDelta: number;
}

interface ConfidenceTooltipProps {
  confidence: number;
  breakdown: ConfidenceBreakdown;
}

function formatDelta(value: number): string {
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

export function ConfidenceTooltip({ confidence, breakdown }: ConfidenceTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span
      className="badge"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {confidence}%
      {showTooltip ? (
        <span className="confidence-tooltip__breakdown" role="tooltip">
          Schema: {breakdown.schema}% &middot; Content: {breakdown.content}% &middot; Precedent:{' '}
          {formatDelta(breakdown.precedentDelta)}
        </span>
      ) : null}
    </span>
  );
}
