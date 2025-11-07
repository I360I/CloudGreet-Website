// CloudGreet Design System - Spacing Tokens
// 8px scale for consistent spacing

export const spacing = {
  // Base spacing scale (8px increments)
  px: '1px',
  0: '0px',
  0.5: '2px',   // 0.25 * 8px
  1: '4px',     // 0.5 * 8px
  1.5: '6px',   // 0.75 * 8px
  2: '8px',     // 1 * 8px
  2.5: '10px',  // 1.25 * 8px
  3: '12px',    // 1.5 * 8px
  3.5: '14px',  // 1.75 * 8px
  4: '16px',    // 2 * 8px
  5: '20px',    // 2.5 * 8px
  6: '24px',    // 3 * 8px
  7: '28px',    // 3.5 * 8px
  8: '32px',    // 4 * 8px
  9: '36px',    // 4.5 * 8px
  10: '40px',   // 5 * 8px
  11: '44px',   // 5.5 * 8px
  12: '48px',   // 6 * 8px
  14: '56px',   // 7 * 8px
  16: '64px',   // 8 * 8px
  20: '80px',   // 10 * 8px
  24: '96px',   // 12 * 8px
  28: '112px',  // 14 * 8px
  32: '128px',  // 16 * 8px
  36: '144px',  // 18 * 8px
  40: '160px',  // 20 * 8px
  44: '176px',  // 22 * 8px
  48: '192px',  // 24 * 8px
  52: '208px',  // 26 * 8px
  56: '224px',  // 28 * 8px
  60: '240px',  // 30 * 8px
  64: '256px',  // 32 * 8px
  72: '288px',  // 36 * 8px
  80: '320px',  // 40 * 8px
  96: '384px'   // 48 * 8px
} as const

// Semantic spacing tokens
export const semanticSpacing = {
  // Component spacing
  component: {
    xs: spacing[1],    // 4px - tight spacing
    sm: spacing[2],    // 8px - small spacing
    md: spacing[4],    // 16px - medium spacing
    lg: spacing[6],    // 24px - large spacing
    xl: spacing[8],    // 32px - extra large spacing
    '2xl': spacing[12], // 48px - 2x large spacing
    '3xl': spacing[16]  // 64px - 3x large spacing
  },

  // Layout spacing
  layout: {
    section: spacing[12],    // 48px - between sections
    container: spacing[6],   // 24px - container padding
    grid: spacing[4],        // 16px - grid gaps
    stack: spacing[3]        // 12px - stacked elements
  },

  // Interactive spacing
  interactive: {
    button: {
      padding: {
        sm: `${spacing[2]} ${spacing[3]}`,  // 8px 12px
        md: `${spacing[3]} ${spacing[4]}`,  // 12px 16px
        lg: `${spacing[4]} ${spacing[6]}`   // 16px 24px
      },
      gap: spacing[2]  // 8px - between icon and text
    },
    
    input: {
      padding: `${spacing[3]} ${spacing[4]}`, // 12px 16px
      gap: spacing[2]  // 8px - between elements
    },
    
    card: {
      padding: spacing[6],  // 24px - card padding
      gap: spacing[4]       // 16px - card content gap
    }
  },

  // Typography spacing
  typography: {
    heading: {
      marginBottom: spacing[4],  // 16px - below headings
      lineHeight: '1.2'
    },
    
    paragraph: {
      marginBottom: spacing[3],  // 12px - between paragraphs
      lineHeight: '1.6'
    },
    
    list: {
      itemGap: spacing[2],       // 8px - between list items
      indent: spacing[4]         // 16px - list indentation
    }
  }
} as const

// Spacing utility functions
export const spacingUtils = {
  // Get consistent gap classes
  getGap: (size: keyof typeof spacing) => `gap-${size}`,
  
  // Get consistent padding classes
  getPadding: (size: keyof typeof spacing) => `p-${size}`,
  
  // Get consistent margin classes
  getMargin: (size: keyof typeof spacing) => `m-${size}`,
  
  // Get responsive spacing
  getResponsive: (mobile: keyof typeof spacing, desktop: keyof typeof spacing) => 
    `gap-${mobile} md:gap-${desktop}`,
  
  // Get consistent spacing for common patterns
  getCardSpacing: () => 'p-6 gap-4',
  getButtonSpacing: () => 'px-4 py-3 gap-2',
  getInputSpacing: () => 'px-4 py-3',
  getSectionSpacing: () => 'mb-12',
  getContainerSpacing: () => 'p-6'
} as const

// Common spacing patterns
export const commonSpacing = {
  // Dashboard spacing
  dashboard: {
    container: 'p-6',
    section: 'mb-8',
    card: 'p-6',
    grid: 'gap-6',
    stack: 'space-y-4'
  },
  
  // Form spacing
  form: {
    container: 'space-y-6',
    field: 'space-y-2',
    group: 'space-y-4',
    actions: 'flex gap-3 pt-4'
  },
  
  // List spacing
  list: {
    container: 'space-y-2',
    item: 'p-4',
    header: 'pb-4'
  },
  
  // Modal spacing
  modal: {
    container: 'p-6',
    header: 'pb-4',
    body: 'py-4',
    footer: 'pt-4 flex gap-3'
  }
} as const

export type SpacingSize = keyof typeof spacing
export type ComponentSpacing = keyof typeof semanticSpacing.component
export type LayoutSpacing = keyof typeof semanticSpacing.layout

