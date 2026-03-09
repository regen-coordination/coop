import React, { forwardRef } from "react";
import { visualTokens } from "../../theme/visualTokens";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
  /** Switch size */
  switchSize?: "sm" | "md" | "lg";
  /** Checked state (controlled) */
  checked?: boolean;
  /** Default checked state (uncontrolled) */
  defaultChecked?: boolean;
  /** Change handler */
  onCheckedChange?: (checked: boolean) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      switchSize = "md",
      checked,
      defaultChecked,
      onCheckedChange,
      disabled,
      className = "",
      style,
      ...props
    },
    ref,
  ) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked || false);
    const isControlled = checked !== undefined;
    const currentChecked = isControlled ? checked : isChecked;

    const sizeMap: Record<string, { width: number; height: number; thumb: number }> = {
      sm: { width: 36, height: 20, thumb: 14 },
      md: { width: 44, height: 24, thumb: 18 },
      lg: { width: 52, height: 28, thumb: 22 },
    };

    const { width, height, thumb } = sizeMap[switchSize];
    const padding = (height - thumb) / 2;
    const translateX = currentChecked ? width - thumb - padding * 2 : 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked;
      if (!isControlled) {
        setIsChecked(newChecked);
      }
      onCheckedChange?.(newChecked);
    };

    const trackStyles: React.CSSProperties = {
      position: "relative",
      width,
      height,
      backgroundColor: currentChecked
        ? visualTokens.colors.brand[500]
        : visualTokens.colors.bg.quaternary,
      borderRadius: visualTokens.borderRadius.full,
      transition: visualTokens.transitions.normal,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1,
      boxShadow: currentChecked
        ? `inset 0 0 4px ${visualTokens.colors.brand.glow}`
        : "inset 0 1px 3px rgba(0,0,0,0.3)",
    };

    const thumbStyles: React.CSSProperties = {
      position: "absolute",
      top: padding,
      left: padding,
      width: thumb,
      height: thumb,
      backgroundColor: visualTokens.colors.text.primary,
      borderRadius: "50%",
      transform: `translateX(${translateX}px)`,
      transition: visualTokens.transitions.spring,
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    };

    const hiddenInputStyles: React.CSSProperties = {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0,
      margin: 0,
      padding: 0,
    };

    return (
      <label
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          ...style,
        }}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={currentChecked}
          onChange={handleChange}
          disabled={disabled}
          style={hiddenInputStyles}
          aria-checked={currentChecked}
          {...props}
        />
        <span style={trackStyles}>
          <span style={thumbStyles} />
        </span>
      </label>
    );
  },
);

Switch.displayName = "Switch";

export default Switch;
