import type React from "react";
import { createContext, useContext, useMemo } from "react";
import { tokens } from "./tokens";

// Theme context type
interface ThemeContextType {
  tokens: typeof tokens;
  isDark: boolean;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  tokens,
  isDark: false,
});

// Theme provider component
export interface ThemeProviderProps {
  children: React.ReactNode;
  isDark?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, isDark = false }) => {
  const value = useMemo(
    () => ({
      tokens,
      isDark,
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Utility to combine class names
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// CSS variable injection helper
export function generateCSSVariables() {
  return `
    :root {
      /* Brand Colors */
      --coop-brand-50: ${tokens.colors.brand[50]};
      --coop-brand-100: ${tokens.colors.brand[100]};
      --coop-brand-200: ${tokens.colors.brand[200]};
      --coop-brand-300: ${tokens.colors.brand[300]};
      --coop-brand-400: ${tokens.colors.brand[400]};
      --coop-brand-500: ${tokens.colors.brand[500]};
      --coop-brand-600: ${tokens.colors.brand[600]};
      --coop-brand-700: ${tokens.colors.brand[700]};
      --coop-brand-800: ${tokens.colors.brand[800]};
      --coop-brand-900: ${tokens.colors.brand[900]};
      
      /* Semantic */
      --coop-success: ${tokens.colors.semantic.success};
      --coop-warning: ${tokens.colors.semantic.warning};
      --coop-danger: ${tokens.colors.semantic.danger};
      --coop-info: ${tokens.colors.semantic.info};
      
      /* Text */
      --coop-text-primary: ${tokens.colors.text.primary};
      --coop-text-secondary: ${tokens.colors.text.secondary};
      --coop-text-muted: ${tokens.colors.text.muted};
      --coop-text-placeholder: ${tokens.colors.text.placeholder};
      --coop-text-inverse: ${tokens.colors.text.inverse};
      --coop-text-link: ${tokens.colors.text.link};
      
      /* Background */
      --coop-bg-page: ${tokens.colors.background.page};
      --coop-bg-card: ${tokens.colors.background.card};
      --coop-bg-elevated: ${tokens.colors.background.elevated};
      --coop-bg-overlay: ${tokens.colors.background.overlay};
      
      /* Border */
      --coop-border-light: ${tokens.colors.border.light};
      --coop-border-medium: ${tokens.colors.border.medium};
      --coop-border-focus: ${tokens.colors.border.focus};
      
      /* Shadows */
      --coop-shadow-sm: ${tokens.shadows.sm};
      --coop-shadow-md: ${tokens.shadows.md};
      --coop-shadow-lg: ${tokens.shadows.lg};
      --coop-shadow-card: ${tokens.shadows.card};
      --coop-shadow-elevated: ${tokens.shadows.elevated};
      --coop-shadow-focus: ${tokens.shadows.focus};
      
      /* Typography */
      --coop-font-sans: ${tokens.typography.fontFamily.sans};
      --coop-font-mono: ${tokens.typography.fontFamily.mono};
      
      /* Spacing */
      --coop-space-1: ${tokens.spacing[1]};
      --coop-space-2: ${tokens.spacing[2]};
      --coop-space-3: ${tokens.spacing[3]};
      --coop-space-4: ${tokens.spacing[4]};
      --coop-space-5: ${tokens.spacing[5]};
      --coop-space-6: ${tokens.spacing[6]};
      
      /* Border Radius */
      --coop-radius-sm: ${tokens.borderRadius.sm};
      --coop-radius-md: ${tokens.borderRadius.md};
      --coop-radius-lg: ${tokens.borderRadius.lg};
      
      /* Transitions */
      --coop-transition-fast: ${tokens.transitions.fast};
      --coop-transition-normal: ${tokens.transitions.normal};
      
      /* Z-Index */
      --coop-z-dropdown: ${tokens.zIndex.dropdown};
      --coop-z-modal: ${tokens.zIndex.modal};
      --coop-z-tooltip: ${tokens.zIndex.tooltip};
      --coop-z-toast: ${tokens.zIndex.toast};
    }
  `;
}

export { tokens };
export default ThemeContext;
