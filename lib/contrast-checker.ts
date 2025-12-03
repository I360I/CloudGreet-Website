/**
 * WCAG 2.1 Color Contrast Checker
 * Ensures all color combinations meet accessibility standards
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

/**
 * Calculate relative luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) return 0

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if color combination meets WCAG standards
 */
export function meetsWCAG(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): { pass: boolean; ratio: number; required: number } {
  const ratio = getContrastRatio(foreground, background)

  // WCAG 2.1 requirements
  const requirements = {
    AA: {
      normal: 4.5, // 14px or smaller
      large: 3.0,  // 18px or 14px bold
    },
    AAA: {
      normal: 7.0,
      large: 4.5,
    },
  }

  const required = requirements[level][size]
  const pass = ratio >= required

  return { pass, ratio, required }
}

/**
 * Get accessible text color for a background
 */
export function getAccessibleTextColor(background: string): string {
  const whiteContrast = getContrastRatio('#ffffff', background)
  const blackContrast = getContrastRatio('#000000', background)

  return whiteContrast > blackContrast ? '#ffffff' : '#000000'
}

/**
 * Audit all color combinations in the design system
 */
export function auditColorContrast() {
  const combinations = [
    // Text on dark backgrounds
    { fg: '#d1d5db', bg: '#000000', name: 'gray-300 on black', level: 'AA' as const, size: 'normal' as const },
    { fg: '#9ca3af', bg: '#000000', name: 'gray-400 on black', level: 'AA' as const, size: 'normal' as const },
    { fg: '#6b7280', bg: '#000000', name: 'gray-500 on black', level: 'AA' as const, size: 'normal' as const },
    
    // Primary color on dark
    { fg: '#8b5cf6', bg: '#000000', name: 'primary-500 on black', level: 'AA' as const, size: 'large' as const },
    { fg: '#a78bfa', bg: '#000000', name: 'primary-400 on black', level: 'AA' as const, size: 'normal' as const },
    
    // Secondary color on dark
    { fg: '#3b82f6', bg: '#000000', name: 'secondary-500 on black', level: 'AA' as const, size: 'large' as const },
    { fg: '#60a5fa', bg: '#000000', name: 'secondary-400 on black', level: 'AA' as const, size: 'normal' as const },
    
    // Status colors
    { fg: '#22c55e', bg: '#000000', name: 'success-500 on black', level: 'AA' as const, size: 'large' as const },
    { fg: '#ef4444', bg: '#000000', name: 'error-500 on black', level: 'AA' as const, size: 'large' as const },
    { fg: '#f59e0b', bg: '#000000', name: 'warning-500 on black', level: 'AA' as const, size: 'large' as const },
    
    // Text on gray backgrounds
    { fg: '#ffffff', bg: '#1f2937', name: 'white on gray-800', level: 'AA' as const, size: 'normal' as const },
    { fg: '#d1d5db', bg: '#1f2937', name: 'gray-300 on gray-800', level: 'AA' as const, size: 'normal' as const },
  ]

  const results = combinations.map((combo) => ({
    ...combo,
    ...meetsWCAG(combo.fg, combo.bg, combo.level, combo.size),
  }))

  return results
}

/**
 * Fix color to meet WCAG standards
 */
export function fixColorContrast(
  color: string,
  background: string,
  targetRatio: number = 4.5
): string {
  let rgb = hexToRgb(color)
  if (!rgb) return color

  let iterations = 0
  const maxIterations = 100

  while (iterations < maxIterations) {
    const ratio = getContrastRatio(
      `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`,
      background
    )

    if (ratio >= targetRatio) {
      return `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`
    }

    // Lighten color
    rgb.r = Math.min(255, rgb.r + 5)
    rgb.g = Math.min(255, rgb.g + 5)
    rgb.b = Math.min(255, rgb.b + 5)

    iterations++
  }

  return color // Return original if can't fix
}

