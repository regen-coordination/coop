// Coop Visual Design System: Liquid Glass x Corecore
// Design Philosophy: Sleek, fluid, premium minimalism with purposeful interactions
// Aesthetic: Between liquid glass (translucency, depth) and corecore (minimal, functional)
// Goal: Invisible sophistication - UI that feels premium without shouting

// Core neutrals with subtle warmth
export const colors = {
  // Background layers - depth through opacity
  bg: {
    primary: "#0A0A0A", // Deep void - canvas backdrop
    secondary: "#141414", // Card backgrounds
    tertiary: "#1A1A1A", // Elevated surfaces
    quaternary: "#242424", // Hover/active states
    overlay: "rgba(0, 0, 0, 0.85)", // Modal overlays
  },

  // Surface variations with subtle gradients
  surface: {
    card: "linear-gradient(145deg, #161616 0%, #111111 100%)",
    elevated: "linear-gradient(145deg, #1E1E1E 0%, #181818 100%)",
    glass: "rgba(255, 255, 255, 0.03)", // Glassmorphism base
    glassHover: "rgba(255, 255, 255, 0.06)",
    glassActive: "rgba(255, 255, 255, 0.09)",
  },

  // Text hierarchy - liquid gradations
  text: {
    primary: "#FFFFFF", // Headlines, key actions
    secondary: "rgba(255, 255, 255, 0.72)", // Body text
    tertiary: "rgba(255, 255, 255, 0.48)", // Metadata, hints
    quaternary: "rgba(255, 255, 255, 0.28)", // Disabled
    inverse: "#0A0A0A", // On light backgrounds
  },

  // Accent: Living Green - organic, fresh
  brand: {
    50: "#E8F5E9",
    100: "#C8E6C9",
    200: "#A5D6A7",
    300: "#81C784",
    400: "#66BB6A",
    500: "#4CAF50", // Primary
    600: "#43A047",
    700: "#388E3C",
    glow: "rgba(76, 175, 80, 0.4)", // Glow effect
    pulse: "rgba(76, 175, 80, 0.15)", // Subtle pulse
  },

  // Semantic accents - muted but clear
  semantic: {
    success: "#4ADE80", // Soft green
    warning: "#FBBF24", // Warm amber
    error: "#F87171", // Soft red
    info: "#60A5FA", // Soft blue
  },

  // Borders - ethereal separation
  border: {
    subtle: "rgba(255, 255, 255, 0.06)",
    light: "rgba(255, 255, 255, 0.10)",
    medium: "rgba(255, 255, 255, 0.16)",
    strong: "rgba(255, 255, 255, 0.24)",
    focus: "#4CAF50",
  },
};

// Spacing - breathing room
export const spacing = {
  0: "0",
  1: "4px", // Micro
  2: "8px", // Tight
  3: "12px", // Snug
  4: "16px", // Default
  5: "20px", // Comfortable
  6: "24px", // Relaxed
  7: "32px", // Loose
  8: "40px", // Spacious
  9: "48px", // Airy
  10: "64px", // Expansive
  12: "80px", // Dramatic
};

// Typography - geometric sans, high legibility
export const typography = {
  fontFamily: {
    sans: '"Inter", "SF Pro Display", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", monospace',
  },

  sizes: {
    // Fluid type scale
    xs: { size: "11px", lineHeight: "16px", letterSpacing: "0.02em" },
    sm: { size: "13px", lineHeight: "20px", letterSpacing: "0.01em" },
    md: { size: "15px", lineHeight: "24px", letterSpacing: "0" },
    lg: { size: "17px", lineHeight: "28px", letterSpacing: "-0.01em" },
    xl: { size: "20px", lineHeight: "30px", letterSpacing: "-0.02em" },
    "2xl": { size: "24px", lineHeight: "32px", letterSpacing: "-0.02em" },
    "3xl": { size: "30px", lineHeight: "38px", letterSpacing: "-0.03em" },
  },

  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  } as const,
};

// Border radius - soft geometry
export const borderRadius = {
  none: "0",
  xs: "4px",
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  full: "9999px",
};

// Shadows - layered depth
export const shadows = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.3)",
  md: "0 4px 6px rgba(0, 0, 0, 0.4)",
  lg: "0 10px 15px rgba(0, 0, 0, 0.5)",
  xl: "0 20px 25px rgba(0, 0, 0, 0.6)",

  // Glass shadows
  glass: "0 8px 32px rgba(0, 0, 0, 0.4)",
  glassHover: "0 12px 40px rgba(0, 0, 0, 0.5)",

  // Glow effects
  glow: "0 0 20px rgba(76, 175, 80, 0.3)",
  glowIntense: "0 0 40px rgba(76, 175, 80, 0.5)",
};

// Transitions - liquid movement
export const transitions = {
  instant: "0ms",
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  normal: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "400ms cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "500ms cubic-bezier(0.34, 1.56, 0.64, 1)",

  // Specific
  hover: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  focus: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  scale: "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
};

// Effects
export const effects = {
  // Glassmorphism
  glass: {
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },

  glassStrong: {
    background: "rgba(255, 255, 255, 0.06)",
    backdropFilter: "blur(30px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
  },
};

// Breakpoints
export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

// Animation keyframes
export const animations = {
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,

  glow: `
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.3); }
      50% { box-shadow: 0 0 40px rgba(76, 175, 80, 0.5); }
    }
  `,

  slideIn: `
    @keyframes slideIn {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,

  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,

  scaleIn: `
    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `,
};

// Export all
export const visualTokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  effects,
  breakpoints,
  animations,
};

export type VisualTokens = typeof visualTokens;

export default visualTokens;
