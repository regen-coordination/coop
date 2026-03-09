import type React from "react";
import { forwardRef } from "react";
import { visualTokens } from "../../theme/visualTokens";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Divider orientation */
  orientation?: "horizontal" | "vertical";
  /** Visual weight */
  variant?: "subtle" | "medium" | "strong";
  /** Optional text label for horizontal dividers */
  label?: string;
  /** Label position when using label */
  labelPosition?: "left" | "center" | "right";
  /** Additional className */
  className?: string;
}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  (
    {
      orientation = "horizontal",
      variant = "subtle",
      label,
      labelPosition = "center",
      className = "",
      style,
      ...props
    },
    ref,
  ) => {
    const borderColors: Record<string, string> = {
      subtle: visualTokens.colors.border.subtle,
      medium: visualTokens.colors.border.light,
      strong: visualTokens.colors.border.medium,
    };

    const borderColor = borderColors[variant];

    const horizontalStyles: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      width: "100%",
      height: label ? "auto" : "1px",
    };

    const verticalStyles: React.CSSProperties = {
      display: "inline-flex",
      width: "1px",
      height: "100%",
      minHeight: "20px",
      alignSelf: "stretch",
    };

    const lineStyles: React.CSSProperties = {
      flex: 1,
      height: "1px",
      backgroundColor: borderColor,
    };

    const verticalLineStyles: React.CSSProperties = {
      width: "1px",
      height: "100%",
      backgroundColor: borderColor,
    };

    const labelStyles: React.CSSProperties = {
      padding: `0 ${visualTokens.spacing[3]}`,
      fontFamily: visualTokens.typography.fontFamily.sans,
      fontSize: visualTokens.typography.sizes.xs.size,
      fontWeight: visualTokens.typography.weights.medium,
      color: visualTokens.colors.text.tertiary,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      whiteSpace: "nowrap",
    };

    if (orientation === "vertical") {
      return (
        <div ref={ref} className={className} style={{ ...verticalStyles, ...style }} {...props}>
          <div style={verticalLineStyles} />
        </div>
      );
    }

    // Horizontal divider
    if (label) {
      const beforeFlex = labelPosition === "left" ? 0 : labelPosition === "right" ? 1 : 1;
      const afterFlex = labelPosition === "left" ? 1 : labelPosition === "right" ? 0 : 1;

      return (
        <div ref={ref} className={className} style={{ ...horizontalStyles, ...style }} {...props}>
          <div style={{ ...lineStyles, flex: beforeFlex }} />
          <span style={labelStyles}>{label}</span>
          <div style={{ ...lineStyles, flex: afterFlex }} />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={className}
        style={{ ...horizontalStyles, backgroundColor: borderColor, ...style }}
        {...props}
      />
    );
  },
);

Divider.displayName = "Divider";

export default Divider;
