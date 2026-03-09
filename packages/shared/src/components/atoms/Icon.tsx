import type React from "react";
import { forwardRef } from "react";
import { visualTokens } from "../../theme/visualTokens";

export type IconName =
  | "search"
  | "clear"
  | "check"
  | "chevron-down"
  | "chevron-up"
  | "chevron-left"
  | "chevron-right"
  | "plus"
  | "minus"
  | "close"
  | "menu"
  | "settings"
  | "user"
  | "home"
  | "bell"
  | "heart"
  | "star"
  | "trash"
  | "edit"
  | "copy"
  | "share"
  | "download"
  | "upload"
  | "more"
  | "spinner";

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  /** Icon name from predefined set or custom SVG content */
  name?: IconName;
  /** Custom SVG content (path data) - takes precedence over name if provided */
  path?: string;
  /** Icon size */
  size?: "sm" | "md" | "lg";
  /** Icon color - matches text colors */
  color?:
    | "primary"
    | "secondary"
    | "muted"
    | "brand"
    | "success"
    | "warning"
    | "error"
    | "currentColor";
  /** Rotation in degrees */
  rotate?: number;
  /** Spin animation */
  spin?: boolean;
  /** Additional className */
  className?: string;
}

// Icon path definitions
const iconPaths: Record<IconName, string> = {
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  clear: "M6 18L18 6M6 6l12 12",
  check: "M5 13l4 4L19 7",
  "chevron-down": "M19 9l-7 7-7-7",
  "chevron-up": "M5 15l7-7 7 7",
  "chevron-left": "M15 19l-7-7 7-7",
  "chevron-right": "M9 5l7 7-7 7",
  plus: "M12 4v16m8-8H4",
  minus: "M20 12H4",
  close: "M6 18L18 6M6 6l12 12",
  menu: "M4 6h16M4 12h16M4 18h16",
  settings:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  heart:
    "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  trash:
    "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  copy: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
  share:
    "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
  download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  more: "M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z",
  spinner:
    "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      name,
      path,
      size = "md",
      color = "currentColor",
      rotate = 0,
      spin = false,
      className = "",
      style,
      ...props
    },
    ref,
  ) => {
    const sizeMap: Record<string, number> = {
      sm: 16,
      md: 20,
      lg: 24,
    };

    const colorMap: Record<string, string> = {
      primary: visualTokens.colors.text.primary,
      secondary: visualTokens.colors.text.secondary,
      muted: visualTokens.colors.text.tertiary,
      brand: visualTokens.colors.brand[400],
      success: visualTokens.colors.semantic.success,
      warning: visualTokens.colors.semantic.warning,
      error: visualTokens.colors.semantic.error,
      currentColor: "currentColor",
    };

    const dimension = sizeMap[size];
    const iconColor = colorMap[color];
    const pathData = path || (name && iconPaths[name]) || "";

    const svgStyles: React.CSSProperties = {
      width: dimension,
      height: dimension,
      flexShrink: 0,
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
      animation: spin ? "icon-spin 1s linear infinite" : undefined,
      ...style,
    };

    return (
      <svg
        ref={ref}
        className={className}
        style={svgStyles}
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {pathData.split(" M").map((segment, index) => {
          const path = index === 0 ? segment : `M${segment}`;
          return <path key={`${path}-${path.length}`} d={path} />;
        })}
        <style>{`
          @keyframes icon-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </svg>
    );
  },
);

Icon.displayName = "Icon";

export default Icon;
