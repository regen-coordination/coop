import type React from "react";
import { forwardRef } from "react";
import { visualTokens } from "../../theme/visualTokens";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Badge content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: "default" | "primary" | "success" | "warning" | "error";
  /** Size */
  size?: "sm" | "md";
  /** Pill style (full radius) */
  isPill?: boolean;
  /** Dot indicator variant (no text, just colored dot) */
  isDot?: boolean;
  /** Additional className */
  className?: string;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = "default",
      size = "md",
      isPill = false,
      isDot = false,
      className = "",
      style,
      ...props
    },
    ref,
  ) => {
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        backgroundColor: visualTokens.colors.bg.quaternary,
        color: visualTokens.colors.text.secondary,
        border: `1px solid ${visualTokens.colors.border.subtle}`,
      },
      primary: {
        backgroundColor: `${visualTokens.colors.brand[500]}20`,
        color: visualTokens.colors.brand[400],
        border: `1px solid ${visualTokens.colors.brand[500]}40`,
      },
      success: {
        backgroundColor: `${visualTokens.colors.semantic.success}20`,
        color: visualTokens.colors.semantic.success,
        border: `1px solid ${visualTokens.colors.semantic.success}40`,
      },
      warning: {
        backgroundColor: `${visualTokens.colors.semantic.warning}20`,
        color: visualTokens.colors.semantic.warning,
        border: `1px solid ${visualTokens.colors.semantic.warning}40`,
      },
      error: {
        backgroundColor: `${visualTokens.colors.semantic.error}20`,
        color: visualTokens.colors.semantic.error,
        border: `1px solid ${visualTokens.colors.semantic.error}40`,
      },
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        padding: isDot ? "0" : `${visualTokens.spacing[0]} ${visualTokens.spacing[2]}`,
        fontSize: visualTokens.typography.sizes.xs.size,
        height: isDot ? "6px" : "auto",
        minHeight: isDot ? "6px" : "18px",
        width: isDot ? "6px" : "auto",
      },
      md: {
        padding: isDot ? "0" : `${visualTokens.spacing[1]} ${visualTokens.spacing[3]}`,
        fontSize: visualTokens.typography.sizes.sm.size,
        height: isDot ? "8px" : "auto",
        minHeight: isDot ? "8px" : "22px",
        width: isDot ? "8px" : "auto",
      },
    };

    const styles: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: visualTokens.typography.fontFamily.sans,
      fontWeight: visualTokens.typography.weights.medium,
      borderRadius: isPill || isDot ? visualTokens.borderRadius.full : visualTokens.borderRadius.sm,
      whiteSpace: "nowrap",
      transition: visualTokens.transitions.fast,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...style,
    };

    return (
      <span ref={ref} className={className} style={styles} {...props}>
        {!isDot && children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

export default Badge;
