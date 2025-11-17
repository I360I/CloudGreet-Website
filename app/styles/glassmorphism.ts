/**
 * Glassmorphism System
 * Provides consistent glassmorphism effects throughout the application
 */

export const glassmorphism = {
  light: 'bg-white/5 backdrop-blur-xl border-white/10',
  medium: 'bg-white/10 backdrop-blur-xl border-white/20',
  dark: 'bg-slate-900/80 backdrop-blur-xl border-slate-700/50',
  colored: (color: string) => `bg-[${color}]/10 backdrop-blur-xl border-[${color}]/30`,
}

export const getGlassmorphism = (variant: 'light' | 'medium' | 'dark' | 'colored', color?: string) => {
  if (variant === 'colored' && color) {
    return `bg-[${color}]/10 backdrop-blur-xl border-[${color}]/30`
  }
  return glassmorphism[variant]
}

