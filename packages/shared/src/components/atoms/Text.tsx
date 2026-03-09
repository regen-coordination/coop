import type React from "react";
import { createElement, forwardRef } from "react";
import { visualTokens } from "../../theme/visualTokens";

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  /** Text content */
  children: React.ReactNode;
  /** Visual style variant */
  variant?: "display" | "headline" | "title" | "body" | "label" | "caption";
  /** Size scale */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  /** Font weight */
  weight?: "normal" | "medium" | "semibold" | "bold";
  /** Text color */
  color?: "primary" | "secondary" | "muted" | "brand" | "success" | "warning" | "error";
  /** Text alignment */
  align?: "left" | "center" | "right" | "justify";
  /** Truncate with ellipsis */
  truncate?: boolean;
  /** Multi-line truncation (number of lines) */
  lineClamp?: number;
  /** HTML element to render */
  as?: "p" | "span" | "div" | "label" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** Additional className */
  className?: string;
}

export const Text = forwardRef<HTMLElement, TextProps>(
  (
    {
      children,
      variant = "body",
      size = "md",
      weight = "normal",
      color = "primary",
      align = "left",
      truncate = false,
      lineClamp,
      as: Component = "span",
      className = "",
      style,
      ...props
    },
    ref,
  ) => {
    // Size mapping with responsive fallback
    const sizeStyles: Record<
      string,
      { fontSize: string; lineHeight: string; letterSpacing: string }
    > = {
      xs: {
        fontSize: visualTokens.typography.sizes.xs.size,
        lineHeight: visualTokens.typography.sizes.xs.lineHeight,
        letterSpacing: visualTokens.typography.sizes.xs.letterSpacing,
      },
      sm: {
        fontSize: visualTokens.typography.sizes.sm.size,
        lineHeight: visualTokens.typography.sizes.sm.lineHeight,
        letterSpacing: visualTokens.typography.sizes.sm.letterSpacing,
      },
      md: {
        fontSize: visualTokens.typography.sizes.md.size,
        lineHeight: visualTokens.typography.sizes.md.lineHeight,
        letterSpacing: visualTokens.typography.sizes.md.letterSpacing,
      },
      lg: {
        fontSize: visualTokens.typography.sizes.lg.size,
        lineHeight: visualTokens.typography.sizes.lg.lineHeight,
        letterSpacing: visualTokens.typography.sizes.lg.letterSpacing,
      },
      xl: {
        fontSize: visualTokens.typography.sizes.xl.size,
        lineHeight: visualTokens.typography.sizes.xl.lineHeight,
        letterSpacing: visualTokens.typography.sizes.xl.letterSpacing,
      },
      "2xl": {
        fontSize: visualTokens.typography.sizes["2xl"].size,
        lineHeight: visualTokens.typography.sizes["2xl"].lineHeight,
        letterSpacing: visualTokens.typography.sizes["2xl"].letterSpacing,
      },
      "3xl": {
        fontSize: visualTokens.typography.sizes["3xl"].size,
        lineHeight: visualTokens.typography.sizes["3xl"].lineHeight,
        letterSpacing: visualTokens.typography.sizes["3xl"].letterSpacing,
      },
    };

    // Color mapping
    const colorMap: Record<string, string> = {
      primary: visualTokens.colors.text.primary,
      secondary: visualTokens.colors.text.secondary,
      muted: visualTokens.colors.text.tertiary,
      brand: visualTokens.colors.brand[400],
      success: visualTokens.colors.semantic.success,
      warning: visualTokens.colors.semantic.warning,
      error: visualTokens.colors.semantic.error,
    };

    // Variant-specific base styles
    const variantBaseStyles: Record<string, React.CSSProperties> = {
      display: {
        fontSize: visualTokens.typography.sizes["3xl"].size,
        lineHeight: visualTokens.typography.sizes["3xl"].lineHeight,
        letterSpacing: visualTokens.typography.sizes["3xl"].letterSpacing,
        fontWeight: visualTokens.typography.weights.bold,
      },
      headline: {
        fontSize: visualTokens.typography.sizes["2xl"].size,
        lineHeight: visualTokens.typography.sizes["2xl"].lineHeight,
        letterSpacing: visualTokens.typography.sizes["2xl"].letterSpacing,
        fontWeight: visualTokens.typography.weights.semibold,
      },
      title: {
        fontSize: visualTokens.typography.sizes.xl.size,
        lineHeight: visualTokens.typography.sizes.xl.lineHeight,
        letterSpacing: visualTokens.typography.sizes.xl.letterSpacing,
        fontWeight: visualTokens.typography.weights.semibold,
      },
      body: {
        fontSize: visualTokens.typography.sizes.md.size,
        lineHeight: visualTokens.typography.sizes.md.lineHeight,
        letterSpacing: visualTokens.typography.sizes.md.letterSpacing,
      },
      label: {
        fontSize: visualTokens.typography.sizes.sm.size,
        lineHeight: visualTokens.typography.sizes.sm.lineHeight,
        letterSpacing: visualTokens.typography.sizes.sm.letterSpacing,
        fontWeight: visualTokens.typography.weights.medium,
        textTransform: "uppercase",
      },
      caption: {
        fontSize: visualTokens.typography.sizes.xs.size,
        lineHeight: visualTokens.typography.sizes.xs.lineHeight,
        letterSpacing: visualTokens.typography.sizes.xs.letterSpacing,
        color: visualTokens.colors.text.tertiary,
      },
    };

    const styles: React.CSSProperties = {
      fontFamily: visualTokens.typography.fontFamily.sans,
      fontWeight: visualTokens.typography.weights[weight],
      color: colorMap[color],
      textAlign: align,
      margin: 0,
      ...variantBaseStyles[variant],
      // Override with explicit size if provided
      ...(size !== "md" && variant === "body"
        ? {
            fontSize: sizeStyles[size].fontSize,
            lineHeight: sizeStyles[size].lineHeight,
            letterSpacing: sizeStyles[size].letterSpacing,
          }
        : {}),
      ...(truncate && {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }),
      ...(lineClamp && {
        display: "-webkit-box",
        WebkitLineClamp: lineClamp,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }),
      ...style,
    };

    return createElement(
      Component,
      {
        ref,
        className,
        style: styles,
        ...props,
      },
      children,
    );
  },
);

Text.displayName = "Text";

export default Text;
