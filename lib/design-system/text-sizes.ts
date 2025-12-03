/**
 * Standard text size classes for consistent typography
 * Use these instead of arbitrary values like text-[10px]
 */

export const TEXT_SIZES = {
  // Extra small - for labels, badges, timestamps
  xs: 'text-xs', // 12px
  // Small - for secondary text, captions
  sm: 'text-sm', // 14px
  // Base - default body text
  base: 'text-base', // 16px
  // Large - for emphasized text
  lg: 'text-lg', // 18px
  // Extra large - for section headings
  xl: 'text-xl', // 20px
  // 2XL - for page titles
  '2xl': 'text-2xl', // 24px
  // 3XL - for hero headings
  '3xl': 'text-3xl', // 30px
  // 4XL - for large hero headings
  '4xl': 'text-4xl', // 36px
  // 5XL - for extra large hero headings
  '5xl': 'text-5xl', // 48px
} as const

/**
 * Standard text size classes for mobile/desktop responsive
 */
export const TEXT_SIZES_RESPONSIVE = {
  // Small on mobile, base on desktop
  smBase: 'text-sm md:text-base',
  // Base on mobile, large on desktop
  baseLg: 'text-base md:text-lg',
  // Large on mobile, XL on desktop
  lgXl: 'text-lg md:text-xl',
  // XL on mobile, 2XL on desktop
  xl2xl: 'text-xl md:text-2xl',
  // 2XL on mobile, 3XL on desktop
  '2xl3xl': 'text-2xl md:text-3xl',
  // 3XL on mobile, 4XL on desktop
  '3xl4xl': 'text-3xl md:text-4xl',
  // 4XL on mobile, 5XL on desktop
  '4xl5xl': 'text-4xl md:text-5xl',
} as const





