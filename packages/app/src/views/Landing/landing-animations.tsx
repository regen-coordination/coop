import type { ChickenColor, ChickenFacing, ChickenVariant } from './landing-types';

export function ChickenSprite({
  label,
  showLabel = true,
  variant = 'adult',
  facing = 'right',
  color = 'classic',
}: {
  label: string;
  showLabel?: boolean;
  variant?: ChickenVariant;
  facing?: ChickenFacing;
  color?: ChickenColor;
}) {
  const variantClass = variant !== 'adult' ? ` chicken-${variant}` : '';
  const colorClass = color !== 'classic' ? ` chicken-${color}` : '';
  const facingClass = facing === 'left' ? ' is-facing-left' : '';

  return (
    <>
      <span className={`scene-chicken-art${facingClass}`}>
        <svg
          aria-hidden="true"
          className={`scene-chicken-svg${variantClass}${colorClass}`}
          viewBox="0 0 150 118"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="chicken-tail"
            d="M34 61c-10-8-14-19-11-31 16 0 30 6 38 18-6 8-15 12-27 13Z"
          />
          <path
            className="chicken-body"
            d="M42 31c15-10 38-13 61-6 27 9 42 31 36 52-5 19-25 31-48 31-18 0-35-6-46-18-16-16-18-41-3-59Z"
          />
          <path
            className="chicken-wing"
            d="M78 53c17 1 30 11 31 24 0 9-8 17-19 20-15-2-25-10-26-21 0-11 6-19 14-23Z"
          />
          <path
            className="chicken-comb"
            d="M80 22c4-9 9-14 16-14 5 0 9 3 12 8 5-5 11-6 17-1 5 5 6 12 1 21H82c-6-3-7-8-2-14Z"
          />
          <circle className="chicken-eye" cx="104" cy="49" r="3.3" />
          <path className="chicken-beak" d="M117 54l22 6-22 8-4-7 4-7Z" />
          <path className="chicken-leg" d="M66 100v15" />
          <path className="chicken-leg" d="M90 103v15" />
          <path className="chicken-foot" d="M60 116h12" />
          <path className="chicken-foot" d="M84 118h12" />
        </svg>
      </span>
      {showLabel ? <span className="scene-chicken-label">{label}</span> : null}
    </>
  );
}

export function CoopIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="scene-coop-svg"
      viewBox="0 0 320 278"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path className="coop-roof" d="M67 94L160 26l93 68-16 18H83z" />
      <rect className="coop-body" x="56" y="94" width="208" height="154" rx="30" />
      <rect className="coop-window" x="88" y="124" width="54" height="54" rx="14" />
      <rect className="coop-window" x="178" y="124" width="54" height="54" rx="14" />
      <rect className="coop-door" x="134" y="170" width="52" height="78" rx="16" />
      <path className="coop-slat" d="M104 104v132" />
      <path className="coop-slat" d="M160 104v132" />
      <path className="coop-slat" d="M216 104v132" />
      <path className="coop-trim" d="M56 152h208" />
    </svg>
  );
}
