// Color Palettes for Accessibility
export const COLOR_PALETTES = {
  default: {
    id: 'default',
    name: 'Default',
    primary: '#0ea5e9',
    secondary: '#8b5cf6',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#0ea5e9',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    primary: '#0891b2',
    secondary: '#06b6d4',
    background: '#f0fdfa',
    surface: '#ccfbf1',
    text: '#134e4a',
    textSecondary: '#115e59',
    border: '#5eead4',
    success: '#14b8a6',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#0891b2',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    primary: '#16a34a',
    secondary: '#22c55e',
    background: '#f0fdf4',
    surface: '#dcfce7',
    text: '#14532d',
    textSecondary: '#166534',
    border: '#86efac',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#0ea5e9',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    primary: '#ea580c',
    secondary: '#f97316',
    background: '#fff7ed',
    surface: '#ffedd5',
    text: '#7c2d12',
    textSecondary: '#9a3412',
    border: '#fdba74',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#0ea5e9',
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    background: '#faf5ff',
    surface: '#f3e8ff',
    text: '#4c1d95',
    textSecondary: '#5b21b6',
    border: '#c4b5fd',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#0ea5e9',
  },
  neutral: {
    id: 'neutral',
    name: 'Neutral',
    primary: '#64748b',
    secondary: '#94a3b8',
    background: '#f8fafc',
    surface: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#475569',
    border: '#cbd5e1',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#0ea5e9',
  },
} as const;

// Dark Mode Colors
export const DARK_COLORS = {
  default: {
    id: 'default',
    name: 'Default Dark',
    primary: '#38bdf8',
    secondary: '#a78bfa',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    border: '#334155',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#38bdf8',
  },
} as const;

// Typography
export const FONT_FAMILIES = {
  default: 'System',
  opensans: 'Open Sans',
  roboto: 'Roboto',
  lato: 'Lato',
  inter: 'Inter',
} as const;

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const FONT_WEIGHTS = {
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

// Spacing Scale (matching Tailwind)
export const SPACING = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// Border Radius
export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

// Shadows (iOS/Android compatible)
export const SHADOWS = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
} as const;

// Animation Timings
export const ANIMATION = {
  fast: 150,
  base: 200,
  slow: 300,
  slower: 500,
} as const;

// Z-Index Scale
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
} as const;

// Icon Sizes
export const ICON_SIZES = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 32,
  xl: 40,
  '2xl': 48,
} as const;

// Button Heights
export const BUTTON_HEIGHTS = {
  sm: 32,
  base: 44,
  lg: 56,
} as const;

// Input Heights
export const INPUT_HEIGHTS = {
  sm: 36,
  base: 44,
  lg: 52,
} as const;

// Screen Breakpoints (for responsive design)
export const BREAKPOINTS = {
  sm: 375, // iPhone SE
  md: 768, // iPad
  lg: 1024, // iPad Pro
  xl: 1280, // Large tablets
} as const;
