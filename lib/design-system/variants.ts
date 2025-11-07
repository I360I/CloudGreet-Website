// CloudGreet Design System - Component Variants
// Standardized component variants for consistency

export const componentVariants = {
  // Button variants
  button: {
    primary: {
      base: 'px-4 py-2 rounded-lg font-medium transition-all duration-200',
      colors: 'bg-purple-600 hover:bg-purple-700 text-white',
      states: 'focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900',
      disabled: 'disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed',
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
      }
    },
    secondary: {
      base: 'px-4 py-2 rounded-lg font-medium transition-all duration-200',
      colors: 'bg-gray-700 hover:bg-gray-600 text-white',
      states: 'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900',
      disabled: 'disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed',
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
      }
    },
    ghost: {
      base: 'px-4 py-2 rounded-lg font-medium transition-all duration-200',
      colors: 'bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white',
      states: 'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900',
      disabled: 'disabled:bg-transparent disabled:text-gray-600 disabled:cursor-not-allowed',
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
      }
    },
    danger: {
      base: 'px-4 py-2 rounded-lg font-medium transition-all duration-200',
      colors: 'bg-red-600 hover:bg-red-700 text-white',
      states: 'focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900',
      disabled: 'disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed',
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
      }
    }
  },

  // Card variants
  card: {
    default: {
      base: 'rounded-xl backdrop-blur-xl transition-all duration-200',
      colors: 'bg-gray-900/50 border-gray-700/50',
      states: 'hover:bg-gray-900/60 hover:border-gray-600/50',
      padding: 'p-6'
    },
    elevated: {
      base: 'rounded-xl backdrop-blur-xl transition-all duration-200 shadow-lg',
      colors: 'bg-gray-800/50 border-gray-600/50',
      states: 'hover:bg-gray-800/60 hover:border-gray-500/50',
      padding: 'p-6'
    },
    accent: {
      base: 'rounded-xl backdrop-blur-xl transition-all duration-200',
      colors: 'bg-purple-900/20 border-purple-700/50',
      states: 'hover:bg-purple-900/30 hover:border-purple-600/50',
      padding: 'p-6'
    },
    compact: {
      base: 'rounded-lg backdrop-blur-xl transition-all duration-200',
      colors: 'bg-gray-900/50 border-gray-700/50',
      states: 'hover:bg-gray-900/60 hover:border-gray-600/50',
      padding: 'p-4'
    }
  },

  // Input variants
  input: {
    default: {
      base: 'w-full rounded-lg transition-all duration-200',
      colors: 'bg-gray-800 border-gray-600 text-white placeholder-gray-400',
      states: 'focus:ring-2 focus:ring-purple-500 focus:border-purple-500',
      padding: 'px-4 py-3',
      disabled: 'disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed'
    },
    error: {
      base: 'w-full rounded-lg transition-all duration-200',
      colors: 'bg-gray-800 border-red-500 text-white placeholder-gray-400',
      states: 'focus:ring-2 focus:ring-red-500 focus:border-red-500',
      padding: 'px-4 py-3',
      disabled: 'disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed'
    },
    success: {
      base: 'w-full rounded-lg transition-all duration-200',
      colors: 'bg-gray-800 border-green-500 text-white placeholder-gray-400',
      states: 'focus:ring-2 focus:ring-green-500 focus:border-green-500',
      padding: 'px-4 py-3',
      disabled: 'disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed'
    }
  },

  // Badge variants
  badge: {
    success: {
      base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors: 'bg-green-900/50 text-green-400 border border-green-700/50'
    },
    warning: {
      base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors: 'bg-amber-900/50 text-amber-400 border border-amber-700/50'
    },
    error: {
      base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors: 'bg-red-900/50 text-red-400 border border-red-700/50'
    },
    info: {
      base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors: 'bg-blue-900/50 text-blue-400 border border-blue-700/50'
    },
    neutral: {
      base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors: 'bg-gray-800/50 text-gray-300 border border-gray-600/50'
    }
  },

  // Alert variants
  alert: {
    success: {
      base: 'rounded-lg p-4 border',
      colors: 'bg-green-900/20 border-green-700/50 text-green-400',
      icon: 'text-green-400'
    },
    warning: {
      base: 'rounded-lg p-4 border',
      colors: 'bg-amber-900/20 border-amber-700/50 text-amber-400',
      icon: 'text-amber-400'
    },
    error: {
      base: 'rounded-lg p-4 border',
      colors: 'bg-red-900/20 border-red-700/50 text-red-400',
      icon: 'text-red-400'
    },
    info: {
      base: 'rounded-lg p-4 border',
      colors: 'bg-blue-900/20 border-blue-700/50 text-blue-400',
      icon: 'text-blue-400'
    }
  },

  // Table variants
  table: {
    default: {
      container: 'w-full overflow-hidden rounded-lg border border-gray-700/50',
      header: 'bg-gray-800/50 border-b border-gray-700/50',
      row: 'border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors',
      cell: 'px-4 py-3 text-sm text-gray-300',
      headerCell: 'px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide'
    },
    striped: {
      container: 'w-full overflow-hidden rounded-lg border border-gray-700/50',
      header: 'bg-gray-800/50 border-b border-gray-700/50',
      row: 'border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors even:bg-gray-900/20',
      cell: 'px-4 py-3 text-sm text-gray-300',
      headerCell: 'px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide'
    }
  },

  // Modal variants
  modal: {
    default: {
      overlay: 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50',
      container: 'fixed inset-0 z-50 flex items-center justify-center p-4',
      content: 'bg-gray-900 border border-gray-700/50 rounded-xl shadow-xl max-w-md w-full',
      header: 'px-6 py-4 border-b border-gray-700/50',
      body: 'px-6 py-4',
      footer: 'px-6 py-4 border-t border-gray-700/50 flex gap-3 justify-end'
    },
    large: {
      overlay: 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50',
      container: 'fixed inset-0 z-50 flex items-center justify-center p-4',
      content: 'bg-gray-900 border border-gray-700/50 rounded-xl shadow-xl max-w-2xl w-full',
      header: 'px-6 py-4 border-b border-gray-700/50',
      body: 'px-6 py-4',
      footer: 'px-6 py-4 border-t border-gray-700/50 flex gap-3 justify-end'
    }
  }
} as const

// Component variant utility functions
export const variantUtils = {
  // Get button classes
  getButtonClasses: (variant: keyof typeof componentVariants.button, size: 'sm' | 'md' | 'lg' = 'md') => {
    const buttonVariant = componentVariants.button[variant]
    return `${buttonVariant.base} ${buttonVariant.colors} ${buttonVariant.states} ${buttonVariant.disabled} ${buttonVariant.size[size]}`
  },

  // Get card classes
  getCardClasses: (variant: keyof typeof componentVariants.card) => {
    const cardVariant = componentVariants.card[variant]
    return `${cardVariant.base} ${cardVariant.colors} ${cardVariant.states} ${cardVariant.padding}`
  },

  // Get input classes
  getInputClasses: (variant: keyof typeof componentVariants.input) => {
    const inputVariant = componentVariants.input[variant]
    return `${inputVariant.base} ${inputVariant.colors} ${inputVariant.states} ${inputVariant.padding} ${inputVariant.disabled}`
  },

  // Get badge classes
  getBadgeClasses: (variant: keyof typeof componentVariants.badge) => {
    const badgeVariant = componentVariants.badge[variant]
    return `${badgeVariant.base} ${badgeVariant.colors}`
  },

  // Get alert classes
  getAlertClasses: (variant: keyof typeof componentVariants.alert) => {
    const alertVariant = componentVariants.alert[variant]
    return `${alertVariant.base} ${alertVariant.colors}`
  },

  // Get table classes
  getTableClasses: (variant: keyof typeof componentVariants.table) => {
    const tableVariant = componentVariants.table[variant]
    return {
      container: tableVariant.container,
      header: tableVariant.header,
      row: tableVariant.row,
      cell: tableVariant.cell,
      headerCell: tableVariant.headerCell
    }
  },

  // Get modal classes
  getModalClasses: (variant: keyof typeof componentVariants.modal) => {
    const modalVariant = componentVariants.modal[variant]
    return {
      overlay: modalVariant.overlay,
      container: modalVariant.container,
      content: modalVariant.content,
      header: modalVariant.header,
      body: modalVariant.body,
      footer: modalVariant.footer
    }
  }
} as const

// Common component class combinations
export const commonClasses = {
  // Interactive elements
  clickable: 'cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95',
  hoverable: 'transition-all duration-200 hover:bg-gray-800/30',
  focusable: 'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900',

  // Layout
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  section: 'py-8 md:py-12',
  grid: 'grid gap-6',
  stack: 'space-y-4',

  // Text
  heading: 'text-2xl font-bold text-white',
  subheading: 'text-lg font-semibold text-gray-300',
  body: 'text-base text-gray-300',
  caption: 'text-sm text-gray-400',
  muted: 'text-sm text-gray-500',

  // Spacing
  spacing: {
    xs: 'space-y-1',
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8'
  }
} as const

export type ButtonVariant = keyof typeof componentVariants.button
export type CardVariant = keyof typeof componentVariants.card
export type InputVariant = keyof typeof componentVariants.input
export type BadgeVariant = keyof typeof componentVariants.badge
export type AlertVariant = keyof typeof componentVariants.alert
export type TableVariant = keyof typeof componentVariants.table
export type ModalVariant = keyof typeof componentVariants.modal

