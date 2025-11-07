// CloudGreet Design System - Color Tokens
// Centralized color system for consistent UI

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7', // Main purple
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764'
  },

  // Secondary Colors
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main blue
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49'
  },

  // Success Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16'
  },

  // Warning Colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main amber
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03'
  },

  // Error Colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main red
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a'
  },

  // Neutral Colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a'
  },

  // Dark Theme Colors
  dark: {
    bg: {
      primary: '#0a0a0a',      // neutral-950
      secondary: '#171717',    // neutral-900
      tertiary: '#262626',     // neutral-800
      elevated: '#404040',     // neutral-700
      overlay: 'rgba(0, 0, 0, 0.8)'
    },
    text: {
      primary: '#fafafa',      // neutral-50
      secondary: '#a3a3a3',    // neutral-400
      tertiary: '#737373',     // neutral-500
      muted: '#525252'         // neutral-600
    },
    border: {
      primary: '#404040',      // neutral-700
      secondary: '#525252',    // neutral-600
      accent: '#a855f7'        // primary-500
    }
  },

  // Semantic Colors
  semantic: {
    call: '#0ea5e9',           // secondary-500
    appointment: '#22c55e',    // success-500
    revenue: '#f59e0b',        // warning-500
    error: '#ef4444',          // error-500
    info: '#0ea5e9',           // secondary-500
    success: '#22c55e',        // success-500
    warning: '#f59e0b'         // warning-500
  }
} as const

// Color utility functions
export const colorUtils = {
  // Get color with opacity
  withOpacity: (color: string, opacity: number) => `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
  
  // Get gradient colors
  getGradient: (from: string, to: string) => `linear-gradient(135deg, ${from}, ${to})`,
  
  // Get hover color (lighter)
  getHover: (color: string) => {
    const colorMap: Record<string, string> = {
      'bg-purple-600': 'bg-purple-700',
      'bg-blue-600': 'bg-blue-700',
      'bg-green-600': 'bg-green-700',
      'bg-red-600': 'bg-red-700',
      'bg-gray-600': 'bg-gray-700'
    }
    return colorMap[color] || color
  },
  
  // Get focus color
  getFocus: (color: string) => {
    const focusMap: Record<string, string> = {
      'border-purple-500': 'ring-purple-500',
      'border-blue-500': 'ring-blue-500',
      'border-green-500': 'ring-green-500',
      'border-red-500': 'ring-red-500'
    }
    return focusMap[color] || 'ring-gray-500'
  }
}

// Component color variants
export const componentColors = {
  button: {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    error: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'bg-transparent hover:bg-gray-800 text-gray-300'
  },
  
  card: {
    default: 'bg-gray-900/50 border-gray-700/50',
    elevated: 'bg-gray-800/50 border-gray-600/50',
    accent: 'bg-purple-900/20 border-purple-700/50'
  },
  
  input: {
    default: 'bg-gray-800 border-gray-600 text-white placeholder-gray-400',
    focus: 'ring-purple-500 border-purple-500',
    error: 'border-red-500 ring-red-500'
  },
  
  badge: {
    success: 'bg-green-900/50 text-green-400 border-green-700/50',
    warning: 'bg-amber-900/50 text-amber-400 border-amber-700/50',
    error: 'bg-red-900/50 text-red-400 border-red-700/50',
    info: 'bg-blue-900/50 text-blue-400 border-blue-700/50',
    neutral: 'bg-gray-800/50 text-gray-300 border-gray-600/50'
  }
} as const

// Export for use in components
export type ColorVariant = keyof typeof componentColors.button
export type CardVariant = keyof typeof componentColors.card
export type BadgeVariant = keyof typeof componentColors.badge

