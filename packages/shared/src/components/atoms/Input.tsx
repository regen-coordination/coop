import React, { forwardRef } from "react";
import { visualTokens } from "../../theme/visualTokens";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Input size */
  inputSize?: "sm" | "md" | "lg";
  /** Error state */
  isError?: boolean;
  /** Success state */
  isSuccess?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Left icon/element */
  leftElement?: React.ReactNode;
  /** Right icon/element */
  rightElement?: React.ReactNode;
  /** Clear button on right */
  showClear?: boolean;
  /** Clear button handler */
  onClear?: () => void;
  /** Additional className */
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      inputSize = "md",
      isError = false,
      isSuccess = false,
      fullWidth = false,
      leftElement,
      rightElement,
      showClear,
      onClear,
      disabled,
      value,
      className = "",
      style,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        height: "32px",
        padding: `0 ${visualTokens.spacing[2]}`,
        fontSize: visualTokens.typography.sizes.sm.size,
      },
      md: {
        height: "40px",
        padding: `0 ${visualTokens.spacing[3]}`,
        fontSize: visualTokens.typography.sizes.md.size,
      },
      lg: {
        height: "48px",
        padding: `0 ${visualTokens.spacing[4]}`,
        fontSize: visualTokens.typography.sizes.lg.size,
      },
    };

    const containerStyles: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      position: "relative",
      width: fullWidth ? "100%" : "auto",
    };

    const getBorderColor = () => {
      if (isError) return visualTokens.colors.semantic.error;
      if (isSuccess) return visualTokens.colors.semantic.success;
      if (isFocused) return visualTokens.colors.border.focus;
      return visualTokens.colors.border.light;
    };

    const getBoxShadow = () => {
      if (disabled) return "none";
      if (isError) return "0 0 0 3px rgba(248, 113, 113, 0.15)";
      if (isSuccess) return "0 0 0 3px rgba(74, 222, 128, 0.15)";
      if (isFocused) return `0 0 0 3px ${visualTokens.colors.brand.pulse}`;
      return "none";
    };

    const inputStyles: React.CSSProperties = {
      fontFamily: visualTokens.typography.fontFamily.sans,
      backgroundColor: visualTokens.colors.bg.secondary,
      border: `1px solid ${getBorderColor()}`,
      borderRadius: visualTokens.borderRadius.md,
      color: visualTokens.colors.text.primary,
      outline: "none",
      transition: visualTokens.transitions.focus,
      width: fullWidth ? "100%" : "auto",
      opacity: disabled ? 0.5 : 1,
      boxShadow: getBoxShadow(),
      ...sizeStyles[inputSize],
      paddingLeft: leftElement
        ? `calc(${visualTokens.spacing[3]} + 24px)`
        : sizeStyles[inputSize].padding,
      paddingRight:
        rightElement || showClear
          ? `calc(${visualTokens.spacing[3]} + 24px)`
          : sizeStyles[inputSize].padding,
      ...style,
    };

    const elementStyles: React.CSSProperties = {
      position: "absolute",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: visualTokens.colors.text.tertiary,
      pointerEvents: "none",
      zIndex: 1,
    };

    const clearButtonStyles: React.CSSProperties = {
      position: "absolute",
      right: visualTokens.spacing[3],
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      backgroundColor: visualTokens.colors.bg.quaternary,
      color: visualTokens.colors.text.tertiary,
      cursor: "pointer",
      border: "none",
      padding: 0,
      transition: visualTokens.transitions.fast,
    };

    return (
      <div style={containerStyles} className={className}>
        {leftElement && (
          <span
            style={{
              ...elementStyles,
              left: visualTokens.spacing[3],
            }}
          >
            {leftElement}
          </span>
        )}
        <input
          ref={ref}
          style={inputStyles}
          disabled={disabled}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-invalid={isError}
          aria-disabled={disabled}
          {...props}
        />
        {showClear && value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            style={clearButtonStyles}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = visualTokens.colors.border.medium;
              e.currentTarget.style.color = visualTokens.colors.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = visualTokens.colors.bg.quaternary;
              e.currentTarget.style.color = visualTokens.colors.text.tertiary;
            }}
            aria-label="Clear input"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {rightElement && !showClear && (
          <span
            style={{
              ...elementStyles,
              right: visualTokens.spacing[3],
            }}
          >
            {rightElement}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
