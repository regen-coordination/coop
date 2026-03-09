import type React from "react";
import { forwardRef } from "react";
import { visualTokens } from "../../theme/visualTokens";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Progress type */
  type?: "linear" | "circular";
  /** Current progress value (0-100), undefined for indeterminate */
  value?: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Size (diameter for circular, height for linear) */
  size?: number;
  /** Show percentage text */
  showLabel?: boolean;
  /** Label position for linear progress */
  labelPosition?: "left" | "right" | "inside";
  /** Color variant */
  color?: "brand" | "success" | "warning" | "error";
  /** Additional className */
  className?: string;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      type = "linear",
      value,
      min = 0,
      max = 100,
      size = type === "linear" ? 6 : 48,
      showLabel = false,
      labelPosition = "right",
      color = "brand",
      className = "",
      style,
      ...props
    },
    ref,
  ) => {
    const colorMap: Record<string, string> = {
      brand: visualTokens.colors.brand[500],
      success: visualTokens.colors.semantic.success,
      warning: visualTokens.colors.semantic.warning,
      error: visualTokens.colors.semantic.error,
    };

    const progressColor = colorMap[color];
    const isIndeterminate = value === undefined;
    const percentage = !isIndeterminate
      ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
      : 0;

    // Linear Progress
    if (type === "linear") {
      const containerStyles: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: visualTokens.spacing[2],
        width: "100%",
      };

      const trackStyles: React.CSSProperties = {
        flex: 1,
        height: size,
        backgroundColor: visualTokens.colors.bg.quaternary,
        borderRadius: visualTokens.borderRadius.full,
        overflow: "hidden",
        position: "relative",
      };

      const fillStyles: React.CSSProperties = {
        height: "100%",
        width: isIndeterminate ? "30%" : `${percentage}%`,
        backgroundColor: progressColor,
        borderRadius: visualTokens.borderRadius.full,
        transition: isIndeterminate ? "none" : `width ${visualTokens.transitions.normal}`,
        animation: isIndeterminate ? "progress-indeterminate 1.5s infinite ease-in-out" : "none",
      };

      const labelStyles: React.CSSProperties = {
        fontFamily: visualTokens.typography.fontFamily.sans,
        fontSize: visualTokens.typography.sizes.sm.size,
        fontWeight: visualTokens.typography.weights.medium,
        color: visualTokens.colors.text.secondary,
        minWidth: "40px",
        textAlign: "right",
      };

      const insideLabelStyles: React.CSSProperties = {
        position: "absolute",
        right: visualTokens.spacing[2],
        top: "50%",
        transform: "translateY(-50%)",
        fontFamily: visualTokens.typography.fontFamily.sans,
        fontSize: "10px",
        fontWeight: visualTokens.typography.weights.bold,
        color: visualTokens.colors.text.inverse,
      };

      return (
        <div
          ref={ref}
          className={className}
          style={{ ...containerStyles, ...style }}
          role="progressbar"
          tabIndex={0}
          aria-valuenow={isIndeterminate ? undefined : value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={isIndeterminate ? undefined : `${Math.round(percentage)}%`}
          aria-busy={isIndeterminate}
          {...props}
        >
          {showLabel && labelPosition === "left" && (
            <span style={labelStyles}>{Math.round(percentage)}%</span>
          )}
          <div style={trackStyles}>
            <div style={fillStyles} />
            {showLabel && labelPosition === "inside" && percentage > 20 && (
              <span style={insideLabelStyles}>{Math.round(percentage)}%</span>
            )}
          </div>
          {showLabel && (labelPosition === "right" || labelPosition === "inside") && (
            <span style={labelStyles}>{Math.round(percentage)}%</span>
          )}
          <style>{`
            @keyframes progress-indeterminate {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(200%); }
              100% { transform: translateX(400%); }
            }
          `}</style>
        </div>
      );
    }

    // Circular Progress
    const strokeWidth = Math.max(2, size / 12);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = isIndeterminate
      ? circumference * 0.75
      : circumference - (percentage / 100) * circumference;

    const containerStyles: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      width: size,
      height: size,
    };

    const svgStyles: React.CSSProperties = {
      transform: "rotate(-90deg)",
      animation: isIndeterminate ? "circular-spin 1s linear infinite" : "none",
    };

    const trackStyles: React.CSSProperties = {
      fill: "none",
      stroke: visualTokens.colors.bg.quaternary,
      strokeWidth,
    };

    const fillStyles: React.CSSProperties = {
      fill: "none",
      stroke: progressColor,
      strokeWidth,
      strokeLinecap: "round",
      strokeDasharray: circumference,
      strokeDashoffset,
      transition: isIndeterminate ? "none" : `stroke-dashoffset ${visualTokens.transitions.normal}`,
    };

    const labelStyles: React.CSSProperties = {
      position: "absolute",
      fontFamily: visualTokens.typography.fontFamily.sans,
      fontSize: size > 48 ? "14px" : "10px",
      fontWeight: visualTokens.typography.weights.semibold,
      color: visualTokens.colors.text.secondary,
    };

    return (
      <div
        ref={ref}
        className={className}
        style={{ ...containerStyles, ...style }}
        role="progressbar"
        tabIndex={0}
        aria-valuenow={isIndeterminate ? undefined : value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={isIndeterminate ? undefined : `${Math.round(percentage)}%`}
        aria-busy={isIndeterminate}
        {...props}
      >
        <svg width={size} height={size} style={svgStyles} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} style={trackStyles} />
          <circle cx={size / 2} cy={size / 2} r={radius} style={fillStyles} />
        </svg>
        {showLabel && <span style={labelStyles}>{Math.round(percentage)}%</span>}
        <style>{`
          @keyframes circular-spin {
            from { transform: rotate(-90deg); }
            to { transform: rotate(270deg); }
          }
        `}</style>
      </div>
    );
  },
);

Progress.displayName = "Progress";

export default Progress;
