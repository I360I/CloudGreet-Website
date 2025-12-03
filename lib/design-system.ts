/**
 * CloudGreet Design System
 * Single source of truth for all design tokens
 * Use these tokens instead of arbitrary Tailwind values
 */

export const designSystem = {
  // COLORS
  colors: {
    // Brand Colors
    primary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6', // Main brand purple
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
    secondary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main brand blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    accent: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef', // Accent pink
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
    },
    
    // Semantic Colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Main success green
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main error red
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b', // Main warning yellow
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main info blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    
    // Grayscale (Dark theme optimized)
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    
    // Special colors
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
    current: 'currentColor',
  },
  
  // TYPOGRAPHY
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['Monaco', 'Courier New', 'monospace'],
    },
    fontSize: {
      // With line-height and letter-spacing
      xs: { size: '12px', lineHeight: '18px', letterSpacing: '0' },
      sm: { size: '14px', lineHeight: '21px', letterSpacing: '0' },
      base: { size: '16px', lineHeight: '24px', letterSpacing: '0' },
      lg: { size: '18px', lineHeight: '27px', letterSpacing: '-0.01em' },
      xl: { size: '20px', lineHeight: '28px', letterSpacing: '-0.01em' },
      '2xl': { size: '24px', lineHeight: '32px', letterSpacing: '-0.02em' },
      '3xl': { size: '30px', lineHeight: '38px', letterSpacing: '-0.02em' },
      '4xl': { size: '36px', lineHeight: '44px', letterSpacing: '-0.02em' },
      '5xl': { size: '48px', lineHeight: '56px', letterSpacing: '-0.03em' },
      '6xl': { size: '60px', lineHeight: '68px', letterSpacing: '-0.03em' },
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },
  
  // SPACING (8px base grid)
  spacing: {
    0: '0',
    1: '8px',    // 0.5rem
    2: '16px',   // 1rem
    3: '24px',   // 1.5rem
    4: '32px',   // 2rem
    5: '40px',   // 2.5rem
    6: '48px',   // 3rem
    7: '56px',   // 3.5rem
    8: '64px',   // 4rem
    9: '72px',   // 4.5rem
    10: '80px',  // 5rem
    12: '96px',  // 6rem
    16: '128px', // 8rem
    20: '160px', // 10rem
    24: '192px', // 12rem
  },
  
  // BORDER RADIUS
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },
  
  // SHADOWS (elevation system)
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    glow: '0 0 20px rgba(139, 92, 246, 0.3)', // Purple glow
  },
  
  // Z-INDEX SCALE
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
  
  // ANIMATION TIMING
  animation: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      'very-slow': '800ms',
    },
    easing: {
      linear: 'linear',
      'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      'ease-out-cubic': 'cubic-bezier(0.33, 1, 0.68, 1)',
      'ease-in-out-cubic': 'cubic-bezier(0.65, 0, 0.35, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  
  // COMPONENT SIZES
  components: {
    button: {
      height: {
        sm: '32px',
        md: '44px', // Touch target minimum
        lg: '52px',
      },
      padding: {
        sm: '8px 16px',
        md: '12px 24px',
        lg: '16px 32px',
      },
    },
    input: {
      height: {
        sm: '36px',
        md: '44px', // Touch target minimum
        lg: '52px',
      },
      padding: {
        sm: '8px 12px',
        md: '12px 16px',
        lg: '16px 20px',
      },
    },
    card: {
      padding: {
        sm: '16px',
        md: '24px',
        lg: '32px',
      },
    },
    modal: {
      maxWidth: {
        sm: '400px',
        md: '600px',
        lg: '800px',
        xl: '1200px',
      },
    },
  },
  
  // BREAKPOINTS
  breakpoints: {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const

// Type-safe color accessor
export type ColorScale = keyof typeof designSystem.colors
export type ColorShade = keyof typeof designSystem.colors.primary

// Helper functions
export const getColor = (scale: ColorScale, shade?: ColorShade) => {
  const colorScale = designSystem.colors[scale]
  if (typeof colorScale === 'string') return colorScale
  if (!shade) return colorScale[500] // Default to 500
  return colorScale[shade as keyof typeof colorScale]
}

export const getSpacing = (scale: keyof typeof designSystem.spacing) => {
  return designSystem.spacing[scale]
}

// CSS Custom Properties for dynamic theming
export const cssVariables = `
:root {
  /* Colors */
  --color-primary: ${designSystem.colors.primary[500]};
  --color-secondary: ${designSystem.colors.secondary[500]};
  --color-accent: ${designSystem.colors.accent[500]};
  --color-success: ${designSystem.colors.success[500]};
  --color-error: ${designSystem.colors.error[500]};
  --color-warning: ${designSystem.colors.warning[500]};
  --color-info: ${designSystem.colors.info[500]};
  
  /* Spacing */
  --spacing-1: ${designSystem.spacing[1]};
  --spacing-2: ${designSystem.spacing[2]};
  --spacing-3: ${designSystem.spacing[3]};
  --spacing-4: ${designSystem.spacing[4]};
  --spacing-6: ${designSystem.spacing[6]};
  --spacing-8: ${designSystem.spacing[8]};
  
  /* Border Radius */
  --radius-sm: ${designSystem.borderRadius.sm};
  --radius-md: ${designSystem.borderRadius.md};
  --radius-lg: ${designSystem.borderRadius.lg};
  --radius-xl: ${designSystem.borderRadius.xl};
  
  /* Animation */
  --duration-fast: ${designSystem.animation.duration.fast};
  --duration-normal: ${designSystem.animation.duration.normal};
  --duration-slow: ${designSystem.animation.duration.slow};
  
  /* Shadows */
  --shadow-sm: ${designSystem.shadows.sm};
  --shadow-md: ${designSystem.shadows.md};
  --shadow-lg: ${designSystem.shadows.lg};
  --shadow-xl: ${designSystem.shadows.xl};
}
`

