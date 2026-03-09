import React, { forwardRef } from "react";
import { visualTokens } from "../../theme/visualTokens";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image URL */
  src?: string;
  /** User name for initials fallback */
  name?: string;
  /** Avatar size */
  size?: "xs" | "sm" | "md" | "lg";
  /** Online status indicator */
  isOnline?: boolean;
  /** Custom status color (defaults to brand green) */
  statusColor?: string;
  /** Additional className */
  className?: string;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    { src, name = "", size = "md", isOnline, statusColor, className = "", style, ...props },
    ref,
  ) => {
    const sizeMap: Record<string, { size: number; fontSize: string; status: number }> = {
      xs: { size: 24, fontSize: "10px", status: 6 },
      sm: { size: 32, fontSize: "12px", status: 8 },
      md: { size: 40, fontSize: "14px", status: 10 },
      lg: { size: 48, fontSize: "16px", status: 12 },
    };

    const { size: dimension, fontSize, status: statusSize } = sizeMap[size];

    // Generate initials from name
    const getInitials = (name: string): string => {
      if (!name) return "?";
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    };

    // Generate consistent background color from name
    const getBackgroundColor = (name: string): string => {
      if (!name) return visualTokens.colors.bg.quaternary;
      const colors = [
        visualTokens.colors.brand[500],
        visualTokens.colors.semantic.info,
        visualTokens.colors.semantic.warning,
        visualTokens.colors.brand[600],
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    const containerStyles: React.CSSProperties = {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: dimension,
      height: dimension,
      borderRadius: visualTokens.borderRadius.full,
      overflow: "hidden",
      flexShrink: 0,
      backgroundColor: getBackgroundColor(name),
      border: `2px solid ${visualTokens.colors.bg.primary}`,
      ...style,
    };

    const imageStyles: React.CSSProperties = {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    };

    const initialsStyles: React.CSSProperties = {
      fontFamily: visualTokens.typography.fontFamily.sans,
      fontSize,
      fontWeight: visualTokens.typography.weights.semibold,
      color: visualTokens.colors.text.inverse,
      userSelect: "none",
    };

    const statusStyles: React.CSSProperties = {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: statusSize,
      height: statusSize,
      borderRadius: "50%",
      backgroundColor: statusColor || visualTokens.colors.semantic.success,
      border: `2px solid ${visualTokens.colors.bg.primary}`,
      boxShadow: `0 0 4px ${statusColor || visualTokens.colors.semantic.success}`,
    };

    return (
      <div
        ref={ref}
        className={className}
        style={containerStyles}
        role="img"
        aria-label={`Avatar for ${name || "user"}`}
        {...props}
      >
        {src ? (
          <img src={src} alt={name} style={imageStyles} />
        ) : (
          <span style={initialsStyles}>{getInitials(name)}</span>
        )}
        {isOnline !== undefined && <span style={statusStyles} aria-hidden="true" />}
      </div>
    );
  },
);

Avatar.displayName = "Avatar";

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Avatar components */
  children: React.ReactNode;
  /** Maximum number of avatars to show */
  max?: number;
  /** Spacing between avatars (negative for overlap) */
  spacing?: number;
  /** Size for all avatars in group */
  size?: "xs" | "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ children, max, spacing = -8, className = "", style, ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const displayChildren = max ? childrenArray.slice(0, max) : childrenArray;
    const remainingCount = max ? childrenArray.length - max : 0;

    const groupStyles: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
    };

    const itemStyles: React.CSSProperties = {
      marginLeft: spacing,
    };

    const remainingStyles: React.CSSProperties = {
      marginLeft: spacing,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 40,
      height: 40,
      borderRadius: visualTokens.borderRadius.full,
      backgroundColor: visualTokens.colors.bg.quaternary,
      border: `2px solid ${visualTokens.colors.bg.primary}`,
      fontFamily: visualTokens.typography.fontFamily.sans,
      fontSize: "12px",
      fontWeight: visualTokens.typography.weights.medium,
      color: visualTokens.colors.text.secondary,
    };

    return (
      <div ref={ref} className={className} style={{ ...groupStyles, ...style }} {...props}>
        {displayChildren.map((child, index) => {
          const childKey =
            React.isValidElement(child) && child.key != null
              ? String(child.key)
              : `avatar-${String(child)}`;

          return (
            <div key={childKey} style={index > 0 ? itemStyles : undefined}>
              {child}
            </div>
          );
        })}
        {remainingCount > 0 && (
          <span style={remainingStyles} aria-label={`${remainingCount} more users`}>
            +{remainingCount}
          </span>
        )}
      </div>
    );
  },
);

AvatarGroup.displayName = "AvatarGroup";

export default Avatar;
