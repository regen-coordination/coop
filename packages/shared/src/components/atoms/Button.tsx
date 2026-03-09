import React, { forwardRef } from "react";
import { visualTokens } from "../../theme/visualTokens";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: "primary" | "secondary" | "ghost" | "danger" | "premium";
  /** Size of the button */
  size?: "sm" | "md" | "lg";
  /** Full width button */
  fullWidth?: boolean;
  /** Icon before the text */
  leftIcon?: React.ReactNode;
  /** Icon after the text */
  rightIcon?: React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Additional className */
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      leftIcon,
      rightIcon,
      isLoading,
      disabled,
      className = "",
      style,
      ...props
    },
    ref,
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isActive, setIsActive] = React.useState(false);

    // Size styles
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        height: "32px",
        padding: `0 ${visualTokens.spacing[3]}`,
        fontSize: visualTokens.typography.sizes.sm.size,
      },
      md: {
        height: "40px",
        padding: `0 ${visualTokens.spacing[4]}`,
        fontSize: visualTokens.typography.sizes.md.size,
      },
      lg: {
        height: "48px",
        padding: `0 ${visualTokens.spacing[6]}`,
        fontSize: visualTokens.typography.sizes.lg.size,
      },
    };

    // Base styles
    const baseStyles: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: visualTokens.spacing[2],
      fontFamily: visualTokens.typography.fontFamily.sans,
      fontWeight: visualTokens.typography.weights.medium,
      border: "none",
      borderRadius: visualTokens.borderRadius.md,
      cursor: disabled || isLoading ? "not-allowed" : "pointer",
      width: fullWidth ? "100%" : "auto",
      transition: visualTokens.transitions.hover,
      outline: "none",
      position: "relative",
      overflow: "hidden",
    };

    // Variant styles
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: visualTokens.colors.brand[500],
        color: visualTokens.colors.text.inverse,
        boxShadow: isHovered && !disabled && !isLoading ? visualTokens.shadows.glow : "none",
      },
      secondary: {
        backgroundColor: visualTokens.colors.surface.glass,
        backdropFilter: visualTokens.effects.glass.backdropFilter,
        color: visualTokens.colors.text.primary,
        border: visualTokens.effects.glass.border,
      },
      ghost: {
        backgroundColor: "transparent",
        color: visualTokens.colors.text.secondary,
        border: "1px solid transparent",
      },
      danger: {
        backgroundColor: visualTokens.colors.semantic.error,
        color: visualTokens.colors.text.inverse,
      },
      premium: {
        background: `linear-gradient(135deg, ${visualTokens.colors.brand[400]} 0%, ${visualTokens.colors.brand[600]} 100%)`,
        color: visualTokens.colors.text.inverse,
        boxShadow:
          isHovered && !disabled && !isLoading
            ? visualTokens.shadows.glowIntense
            : visualTokens.shadows.glow,
      },
    };

    // Hover styles
    const getHoverStyles = () => {
      if (disabled || isLoading) return {};

      const hoverBg: Record<string, React.CSSProperties> = {
        primary: { backgroundColor: visualTokens.colors.brand[600] },
        secondary: {
          backgroundColor: visualTokens.colors.surface.glassHover,
          borderColor: visualTokens.colors.border.light,
        },
        ghost: {
          backgroundColor: visualTokens.colors.bg.quaternary,
          color: visualTokens.colors.text.primary,
        },
        danger: {
          backgroundColor: "#ef5350",
          boxShadow: "0 0 20px rgba(248, 113, 113, 0.3)",
        },
        premium: {
          background: `linear-gradient(135deg, ${visualTokens.colors.brand[300]} 0%, ${visualTokens.colors.brand[500]} 100%)`,
        },
      };

      const activeStyles: Record<string, React.CSSProperties> = {
        primary: { transform: "scale(0.98)" },
        secondary: { transform: "scale(0.98)" },
        ghost: { transform: "scale(0.98)" },
        danger: { transform: "scale(0.98)" },
        premium: { transform: "scale(0.98)" },
      };

      if (isActive) {
        return { ...hoverBg[variant], ...activeStyles[variant] };
      }

      if (isHovered) {
        return { ...hoverBg[variant], transform: "scale(1.02)" };
      }

      return {};
    };

    // Disabled state
    const disabledStyles: React.CSSProperties = {
      opacity: 0.4,
      pointerEvents: "none",
    };

    return (
      <button
        ref={ref}
        className={className}
        style={{
          ...baseStyles,
          ...sizeStyles[size],
          ...variantStyles[variant],
          ...getHoverStyles(),
          ...(disabled || isLoading ? disabledStyles : {}),
          ...style,
        }}
        disabled={disabled || isLoading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsActive(false);
        }}
        onMouseDown={() => setIsActive(true)}
        onMouseUp={() => setIsActive(false)}
        aria-disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{
                animation: "spin 1s linear infinite",
              }}
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="60"
                strokeDashoffset="20"
              />
            </svg>
          </span>
        )}
        {!isLoading && leftIcon}
        <span style={{ display: "inline-flex", alignItems: "center" }}>{children}</span>
        {!isLoading && rightIcon}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
