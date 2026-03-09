import type React from "react";
import { forwardRef } from "react";
import { visualTokens } from "../../theme/visualTokens";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Skeleton shape */
  shape?: "text" | "circle" | "rectangle";
  /** Width (for text and rectangle) */
  width?: string | number;
  /** Height (for all shapes) */
  height?: string | number;
  /** Enable shimmer animation */
  animate?: boolean;
  /** Number of lines for text shape */
  lines?: number;
  /** Additional className */
  className?: string;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    { shape = "text", width, height, animate = true, lines = 1, className = "", style, ...props },
    ref,
  ) => {
    const baseStyles: React.CSSProperties = {
      backgroundColor: visualTokens.colors.bg.quaternary,
      borderRadius:
        shape === "circle"
          ? "50%"
          : shape === "text"
            ? visualTokens.borderRadius.sm
            : visualTokens.borderRadius.md,
      overflow: "hidden",
      position: "relative",
    };

    const getDimensions = (): React.CSSProperties => {
      if (shape === "circle") {
        const size = height || width || 40;
        return {
          width: size,
          height: size,
        };
      }

      if (shape === "text") {
        return {
          width: width || "100%",
          height: height || "1em",
        };
      }

      // rectangle
      return {
        width: width || "100%",
        height: height || 100,
      };
    };

    const shimmerStyles: React.CSSProperties = {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `linear-gradient(
        90deg,
        transparent 0%,
        ${visualTokens.colors.surface.glass} 50%,
        transparent 100%
      )`,
      transform: "translateX(-100%)",
      animation: animate ? "shimmer 1.5s infinite" : "none",
    };

    const dimensions = getDimensions();

    if (shape === "text" && lines > 1) {
      return (
        <div
          ref={ref}
          className={className}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: visualTokens.spacing[2],
            width: typeof width === "number" ? width : width || "100%",
            ...style,
          }}
          {...props}
        >
          {Array.from({ length: lines }, (_, lineNumber) => lineNumber + 1).map((lineNumber) => (
            <div
              key={`line-${lineNumber}`}
              style={{
                ...baseStyles,
                width: lineNumber === lines ? "60%" : "100%",
                height: height || "1em",
              }}
            >
              <div style={shimmerStyles} />
            </div>
          ))}
          <style>{`
            @keyframes shimmer {
              100% { transform: translateX(100%); }
            }
          `}</style>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={className}
        style={{
          ...baseStyles,
          ...dimensions,
          ...style,
        }}
        {...props}
      >
        <div style={shimmerStyles} />
        <style>{`
          @keyframes shimmer {
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  },
);

Skeleton.displayName = "Skeleton";

export default Skeleton;
