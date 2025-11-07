// CloudGreet Design System - Typography Tokens
// Consistent typography system

export const typography = {
  // Font families
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'monospace'],
    display: ['Inter', 'system-ui', 'sans-serif']
  },

  // Font sizes
  fontSize: {
    xs: ['12px', { lineHeight: '16px' }],
    sm: ['14px', { lineHeight: '20px' }],
    base: ['16px', { lineHeight: '24px' }],
    lg: ['18px', { lineHeight: '28px' }],
    xl: ['20px', { lineHeight: '28px' }],
    '2xl': ['24px', { lineHeight: '32px' }],
    '3xl': ['30px', { lineHeight: '36px' }],
    '4xl': ['36px', { lineHeight: '40px' }],
    '5xl': ['48px', { lineHeight: '1' }],
    '6xl': ['60px', { lineHeight: '1' }],
    '7xl': ['72px', { lineHeight: '1' }],
    '8xl': ['96px', { lineHeight: '1' }],
    '9xl': ['128px', { lineHeight: '1' }]
  },

  // Font weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  },

  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2'
  }
} as const

// Semantic typography styles
export const textStyles = {
  // Headings
  heading: {
    h1: 'text-4xl font-bold text-white leading-tight',
    h2: 'text-3xl font-semibold text-white leading-tight',
    h3: 'text-2xl font-semibold text-white leading-snug',
    h4: 'text-xl font-semibold text-white leading-snug',
    h5: 'text-lg font-medium text-white leading-snug',
    h6: 'text-base font-medium text-white leading-snug'
  },

  // Body text
  body: {
    large: 'text-lg text-gray-300 leading-relaxed',
    base: 'text-base text-gray-300 leading-relaxed',
    small: 'text-sm text-gray-400 leading-relaxed',
    xs: 'text-xs text-gray-500 leading-normal'
  },

  // Specialized text
  special: {
    label: 'text-sm font-medium text-gray-400 uppercase tracking-wide',
    caption: 'text-xs text-gray-500 leading-normal',
    code: 'text-sm font-mono text-gray-300 bg-gray-800 px-2 py-1 rounded',
    link: 'text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300/50 transition-colors',
    muted: 'text-gray-500',
    accent: 'text-purple-400',
    success: 'text-green-400',
    warning: 'text-amber-400',
    error: 'text-red-400'
  },

  // Interactive text
  interactive: {
    button: {
      primary: 'text-base font-medium text-white',
      secondary: 'text-base font-medium text-gray-300',
      ghost: 'text-base font-medium text-gray-400 hover:text-white'
    },
    
    link: {
      primary: 'text-blue-400 hover:text-blue-300 font-medium transition-colors',
      secondary: 'text-gray-400 hover:text-gray-300 transition-colors',
      accent: 'text-purple-400 hover:text-purple-300 font-medium transition-colors'
    }
  }
} as const

// Component typography patterns
export const componentTypography = {
  // Card typography
  card: {
    title: 'text-lg font-semibold text-white mb-2',
    subtitle: 'text-sm text-gray-400 mb-4',
    content: 'text-base text-gray-300 leading-relaxed',
    meta: 'text-xs text-gray-500'
  },

  // Form typography
  form: {
    label: 'text-sm font-medium text-gray-300 mb-1',
    input: 'text-base text-white placeholder-gray-500',
    helper: 'text-xs text-gray-500 mt-1',
    error: 'text-xs text-red-400 mt-1'
  },

  // Table typography
  table: {
    header: 'text-xs font-medium text-gray-400 uppercase tracking-wide',
    cell: 'text-sm text-gray-300',
    cellBold: 'text-sm font-medium text-white'
  },

  // Navigation typography
  nav: {
    item: 'text-sm font-medium text-gray-400 hover:text-white transition-colors',
    itemActive: 'text-sm font-medium text-white',
    subitem: 'text-xs text-gray-500 hover:text-gray-300 transition-colors'
  },

  // Dashboard typography
  dashboard: {
    metric: {
      value: 'text-2xl font-bold text-white',
      label: 'text-sm text-gray-400',
      change: 'text-xs font-medium'
    },
    
    chart: {
      title: 'text-lg font-semibold text-white mb-4',
      subtitle: 'text-sm text-gray-400 mb-6'
    }
  }
} as const

// Typography utility functions
export const typographyUtils = {
  // Get heading class
  getHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => textStyles.heading[`h${level}` as keyof typeof textStyles.heading],
  
  // Get body text class
  getBody: (size: 'large' | 'base' | 'small' | 'xs') => textStyles.body[size],
  
  // Get special text class
  getSpecial: (type: keyof typeof textStyles.special) => textStyles.special[type],
  
  // Get responsive text
  getResponsive: (mobile: string, desktop: string) => `${mobile} md:${desktop}`,
  
  // Get text with color
  getColored: (baseClass: string, color: string) => `${baseClass} ${color}`,
  
  // Get text with weight
  getWeighted: (baseClass: string, weight: keyof typeof typography.fontWeight) => 
    `${baseClass} font-${weight}`
} as const

// Common typography patterns
export const commonTypography = {
  // Page headers
  pageTitle: 'text-3xl font-bold text-white mb-2',
  pageSubtitle: 'text-lg text-gray-400 mb-8',
  
  // Section headers
  sectionTitle: 'text-xl font-semibold text-white mb-4',
  sectionSubtitle: 'text-sm text-gray-400 mb-6',
  
  // Card headers
  cardTitle: 'text-lg font-semibold text-white mb-2',
  cardSubtitle: 'text-sm text-gray-400 mb-4',
  
  // List items
  listItem: 'text-base text-gray-300 leading-relaxed',
  listItemBold: 'text-base font-medium text-white leading-relaxed',
  
  // Status text
  status: {
    success: 'text-sm font-medium text-green-400',
    warning: 'text-sm font-medium text-amber-400',
    error: 'text-sm font-medium text-red-400',
    info: 'text-sm font-medium text-blue-400'
  }
} as const

export type FontSize = keyof typeof typography.fontSize
export type FontWeight = keyof typeof typography.fontWeight
export type TextStyle = keyof typeof textStyles.heading | keyof typeof textStyles.body | keyof typeof textStyles.special

