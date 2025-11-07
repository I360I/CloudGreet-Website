// CloudGreet Design System - Safe Tailwind Classes
// Pre-defined classes to avoid purging issues with dynamic classes

export const safeClasses = {
  // Gradient classes (pre-defined to avoid purging)
  gradients: {
    // Call volume gradients
    callVolume: {
      low: 'bg-gradient-to-r from-blue-900/50 to-blue-800/50',
      medium: 'bg-gradient-to-r from-blue-700/50 to-blue-600/50',
      high: 'bg-gradient-to-r from-blue-500/50 to-blue-400/50',
      peak: 'bg-gradient-to-r from-blue-300/50 to-blue-200/50'
    },
    
    // Sentiment gradients
    sentiment: {
      positive: 'bg-gradient-to-r from-green-500 to-green-400',
      neutral: 'bg-gradient-to-r from-gray-500 to-gray-400',
      negative: 'bg-gradient-to-r from-red-500 to-red-400'
    },
    
    // Status gradients
    status: {
      success: 'bg-gradient-to-r from-green-500 to-green-400',
      warning: 'bg-gradient-to-r from-amber-500 to-amber-400',
      error: 'bg-gradient-to-r from-red-500 to-red-400',
      info: 'bg-gradient-to-r from-blue-500 to-blue-400'
    },
    
    // Revenue gradients
    revenue: {
      low: 'bg-gradient-to-r from-red-500 to-red-400',
      medium: 'bg-gradient-to-r from-amber-500 to-amber-400',
      high: 'bg-gradient-to-r from-green-500 to-green-400'
    }
  },

  // Heatmap intensity classes
  heatmapIntensity: {
    0: 'bg-gray-800/30',
    1: 'bg-blue-900/40',
    2: 'bg-blue-800/50',
    3: 'bg-blue-700/60',
    4: 'bg-blue-600/70',
    5: 'bg-blue-500/80',
    6: 'bg-blue-400/90',
    7: 'bg-blue-300',
    8: 'bg-blue-200',
    9: 'bg-blue-100'
  },

  // Call quality classes
  callQuality: {
    excellent: 'bg-green-500',
    good: 'bg-green-400',
    fair: 'bg-amber-400',
    poor: 'bg-red-400',
    critical: 'bg-red-500'
  },

  // Lead score classes
  leadScore: {
    hot: 'bg-red-500 text-white',
    warm: 'bg-amber-500 text-white',
    cold: 'bg-blue-500 text-white',
    qualified: 'bg-green-500 text-white',
    unqualified: 'bg-gray-500 text-white'
  },

  // Time period classes
  timePeriod: {
    '7d': 'bg-purple-600 text-white',
    '30d': 'bg-purple-600 text-white',
    '90d': 'bg-purple-600 text-white',
    selected: 'bg-purple-600 text-white',
    unselected: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
  },

  // Chart color classes
  chartColors: {
    primary: 'fill-purple-500',
    secondary: 'fill-blue-500',
    success: 'fill-green-500',
    warning: 'fill-amber-500',
    error: 'fill-red-500',
    info: 'fill-blue-400'
  },

  // Animation classes
  animations: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    slideDown: 'animate-slide-down',
    scaleIn: 'animate-scale-in',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    spin: 'animate-spin'
  },

  // Hover states
  hoverStates: {
    card: 'hover:bg-gray-800/60 hover:border-gray-600/60',
    button: 'hover:scale-105 hover:shadow-lg',
    link: 'hover:text-white hover:underline',
    icon: 'hover:text-purple-400 hover:scale-110'
  },

  // Focus states
  focusStates: {
    button: 'focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900',
    input: 'focus:ring-2 focus:ring-purple-500 focus:border-purple-500',
    link: 'focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900'
  }
} as const

// Utility functions for safe class generation
export const safeClassUtils = {
  // Get heatmap intensity class
  getHeatmapIntensity: (intensity: number) => {
    const level = Math.min(Math.max(Math.floor(intensity * 10), 0), 9)
    return safeClasses.heatmapIntensity[level as keyof typeof safeClasses.heatmapIntensity]
  },

  // Get call quality class
  getCallQuality: (score: number) => {
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (score >= 90) return safeClasses.callQuality.excellent
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (score >= 80) return safeClasses.callQuality.good
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (score >= 70) return safeClasses.callQuality.fair
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (score >= 60) return safeClasses.callQuality.poor
    return safeClasses.callQuality.critical
  },

  // Get lead score class
  getLeadScore: (score: number) => {
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (score >= 80) return safeClasses.leadScore.hot
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (score >= 60) return safeClasses.leadScore.warm
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (score >= 40) return safeClasses.leadScore.cold
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (score >= 20) return safeClasses.leadScore.qualified
    return safeClasses.leadScore.unqualified
  },

  // Get sentiment class
  getSentiment: (sentiment: 'positive' | 'neutral' | 'negative') => {
    return safeClasses.gradients.sentiment[sentiment]
  },

  // Get time period class
  getTimePeriod: (period: string, selected: boolean) => {
    return selected ? safeClasses.timePeriod.selected : safeClasses.timePeriod.unselected
  },

  // Get gradient class
  getGradient: (type: 'callVolume' | 'sentiment' | 'status' | 'revenue', variant: string) => {
    const gradientType = safeClasses.gradients[type]
    const validVariant = variant as keyof typeof gradientType
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (validVariant in gradientType) {
      return gradientType[validVariant]
    }
    // Return first available variant as fallback
    const firstKey = Object.keys(gradientType)[0] as keyof typeof gradientType
    return gradientType[firstKey]
  },

  // Combine classes safely
  combine: (...classes: (string | undefined | null | false)[]) => {
    return classes.filter(Boolean).join(' ')
  }
} as const

// Pre-defined component class sets
export const componentClasses = {
  // Card variants
  card: {
    base: 'bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl',
    elevated: 'bg-gray-800/50 border border-gray-600/50 backdrop-blur-xl rounded-xl shadow-lg',
    accent: 'bg-purple-900/20 border border-purple-700/50 backdrop-blur-xl rounded-xl'
  },

  // Button variants
  button: {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded-lg transition-colors',
    ghost: 'bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white font-medium px-4 py-2 rounded-lg transition-colors',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors'
  },

  // Input variants
  input: {
    base: 'bg-gray-800 border border-gray-600 text-white placeholder-gray-400 px-4 py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors',
    error: 'bg-gray-800 border border-red-500 text-white placeholder-gray-400 px-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 transition-colors'
  },

  // Badge variants
  badge: {
    success: 'bg-green-900/50 text-green-400 border border-green-700/50 px-2 py-1 rounded-md text-xs font-medium',
    warning: 'bg-amber-900/50 text-amber-400 border border-amber-700/50 px-2 py-1 rounded-md text-xs font-medium',
    error: 'bg-red-900/50 text-red-400 border border-red-700/50 px-2 py-1 rounded-md text-xs font-medium',
    info: 'bg-blue-900/50 text-blue-400 border border-blue-700/50 px-2 py-1 rounded-md text-xs font-medium',
    neutral: 'bg-gray-800/50 text-gray-300 border border-gray-600/50 px-2 py-1 rounded-md text-xs font-medium'
  }
} as const

export type GradientType = keyof typeof safeClasses.gradients
export type HeatmapIntensity = keyof typeof safeClasses.heatmapIntensity
export type CallQuality = keyof typeof safeClasses.callQuality
export type LeadScore = keyof typeof safeClasses.leadScore
