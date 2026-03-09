import React, { forwardRef } from "react";
import { visualTokens } from "../../theme/visualTokens";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: React.ReactNode;
  /** Visual elevation level */
  elevation?: "flat" | "glass" | "elevated";
  /** Border radius */
  radius?: "sm" | "md" | "lg";
  /** Hover effect - lift up with enhanced shadow */
  hoverable?: boolean;
  /** Additional className */
  className?: string;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      elevation = "glass",
      radius = "md",
      hoverable = false,
      className = "",
      style,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const radiusStyles: Record<string, string> = {
      sm: visualTokens.borderRadius.sm,
      md: visualTokens.borderRadius.md,
      lg: visualTokens.borderRadius.lg,
    };

    const elevationStyles: Record<string, React.CSSProperties> = {
      flat: {
        backgroundColor: visualTokens.colors.bg.secondary,
        border: `1px solid ${visualTokens.colors.border.subtle}`,
        boxShadow: "none",
      },
      glass: {
        backgroundColor: visualTokens.colors.surface.glass,
        backdropFilter: visualTokens.effects.glass.backdropFilter,
        border: visualTokens.effects.glass.border,
        boxShadow: visualTokens.shadows.glass,
      },
      elevated: {
        background: visualTokens.colors.surface.elevated,
        border: `1px solid ${visualTokens.colors.border.light}`,
        boxShadow: visualTokens.shadows.lg,
      },
    };

    const hoverStyles: React.CSSProperties = {
      transform: "translateY(-4px)",
      boxShadow:
        elevation === "glass"
          ? visualTokens.shadows.glassHover
          : elevation === "elevated"
            ? visualTokens.shadows.xl
            : visualTokens.shadows.md,
    };

    const styles: React.CSSProperties = {
      borderRadius: radiusStyles[radius],
      padding: visualTokens.spacing[4],
      transition: visualTokens.transitions.normal,
      cursor: onClick ? "pointer" : "default",
      ...elevationStyles[elevation],
      ...(hoverable && isHovered ? hoverStyles : {}),
      ...style,
    };

    return (
      <div
        ref={ref}
        className={className}
        style={styles}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = "", style, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: visualTokens.spacing[3],
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  ),
);

CardHeader.displayName = "CardHeader";

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className = "", style, ...props }, ref) => (
    <div ref={ref} className={className} style={{ flex: 1, ...style }} {...props}>
      {children}
    </div>
  ),
);

CardBody.displayName = "CardBody";

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = "", style, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: visualTokens.spacing[2],
        marginTop: visualTokens.spacing[3],
        paddingTop: visualTokens.spacing[3],
        borderTop: `1px solid ${visualTokens.colors.border.subtle}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  ),
);

CardFooter.displayName = "CardFooter";

export default Card;
