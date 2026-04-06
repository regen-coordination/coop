import { Tooltip } from './Tooltip';

type Breakdown = {
  schema: number;
  content: number;
  precedentDelta: number;
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function deltaPct(n: number) {
  const rounded = Math.round(n * 100);
  return rounded >= 0 ? `+${rounded}%` : `${rounded}%`;
}

export function ConfidenceTooltip({
  confidence,
  breakdown,
}: {
  confidence: number;
  breakdown: Breakdown;
}) {
  const tooltipContent = `Schema: ${pct(breakdown.schema)} · Content: ${pct(breakdown.content)} · Precedent: ${deltaPct(breakdown.precedentDelta)}`;

  return (
    <Tooltip content={tooltipContent} placement="above">
      {({ targetProps }) => (
        <button type="button" className="badge badge--confidence" {...targetProps}>
          {pct(confidence)}
        </button>
      )}
    </Tooltip>
  );
}
