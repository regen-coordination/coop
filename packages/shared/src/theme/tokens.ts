// Design Tokens - Centralized theme configuration
// These tokens define the visual language of Coop

export const colors = {
  // Brand colors - Coop's identity
  brand: {
    50: "#e8f5e9",
    100: "#c8e6c9",
    200: "#a5d6a7",
    300: "#81c784",
    400: "#66bb6a",
    500: "#4caf50", // Primary brand color
    600: "#43a047",
    700: "#388e3c",
    800: "#2e7d32",
    900: "#1b5e20",
  },

  // Semantic colors - Status indicators
  semantic: {
    success: "#4caf50",
    warning: "#ff9800",
    danger: "#f44336",
    info: "#2196f3",
    neutral: "#9e9e9e",
  },

  // Text colors - Hierarchy and readability
  text: {
    primary: "#1a1a1a",
    secondary: "#666666",
    muted: "#999999",
    placeholder: "#bdbdbd",
    inverse: "#ffffff",
    link: "#4caf50",
    linkHover: "#388e3c",
  },

  // Background colors - Layering and depth
  background: {
    page: "#f5f5f5",
    card: "#ffffff",
    elevated: "#fafafa",
    overlay: "rgba(0, 0, 0, 0.5)",
    input: "#ffffff",
    disabled: "#f5f5f5",
  },

  // Border colors - Separation and structure
  border: {
    light: "#e0e0e0",
    medium: "#bdbdbd",
    dark: "#9e9e9e",
    focus: "#4caf50",
    error: "#f44336",
  },

  // Canvas-specific colors
  canvas: {
    background: "#f8f9fa",
    grid: "#e9ecef",
    nodeDefault: "#ffffff",
    nodeSelected: "#e8f5e9",
    edgeDefault: "#adb5bd",
    edgeActive: "#4caf50",
  },
};

export const spacing = {
  0: "0",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "32px",
  8: "40px",
  9: "48px",
  10: "64px",
};

export const typography = {
  fontFamily: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, Inconsolata, "Roboto Mono", "Fira Code", monospace',
  },

  sizes: {
    xs: { fontSize: "12px", lineHeight: "16px", letterSpacing: "0.01em" },
    sm: { fontSize: "14px", lineHeight: "20px", letterSpacing: "0" },
    md: { fontSize: "16px", lineHeight: "24px", letterSpacing: "0" },
    lg: { fontSize: "18px", lineHeight: "28px", letterSpacing: "-0.01em" },
    xl: { fontSize: "20px", lineHeight: "28px", letterSpacing: "-0.01em" },
    "2xl": { fontSize: "24px", lineHeight: "32px", letterSpacing: "-0.02em" },
    "3xl": { fontSize: "30px", lineHeight: "36px", letterSpacing: "-0.02em" },
  },

  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const borderRadius = {
  none: "0",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
};

export const shadows = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px rgba(0, 0, 0, 0.07)",
  lg: "0 10px 15px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px rgba(0, 0, 0, 0.1)",
  inner: "inset 0 2px 4px rgba(0, 0, 0, 0.06)",
  card: "0 2px 8px rgba(0, 0, 0, 0.08)",
  elevated: "0 8px 24px rgba(0, 0, 0, 0.12)",
  focus: "0 0 0 3px rgba(76, 175, 80, 0.3)",
};

export const transitions = {
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  normal: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "350ms cubic-bezier(0.4, 0, 0.2, 1)",
  bounce: "500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)",
};

export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
  canvasControls: 50,
  canvasNodes: 10,
  canvasEdges: 5,
  canvasGrid: 1,
};

// Compose all tokens
export const tokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  breakpoints,
  zIndex,
};

export default tokens;
