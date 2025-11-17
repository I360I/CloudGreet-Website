/**
 * Gradient System
 * Provides consistent gradient effects throughout the application
 */

export const gradients = {
  hero: 'from-slate-900 via-black to-slate-900',
  card: (color: string) => `from-[${color}]/20 via-transparent to-transparent`,
  button: (primaryColor: string, secondaryColor: string) => 
    `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
  background: (color: string) => `radial-gradient(at top, ${color}/10, transparent)`,
}

export const getGradient = (
  type: 'hero' | 'card' | 'button' | 'background',
  color?: string,
  secondaryColor?: string
) => {
  switch (type) {
    case 'hero':
      return gradients.hero
    case 'card':
      return color ? gradients.card(color) : gradients.card('#8b5cf6')
    case 'button':
      return color && secondaryColor 
        ? gradients.button(color, secondaryColor)
        : gradients.button('#8b5cf6', '#ec4899')
    case 'background':
      return color ? gradients.background(color) : gradients.background('#8b5cf6')
    default:
      return gradients.hero
  }
}

