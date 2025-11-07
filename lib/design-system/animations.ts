// CloudGreet Design System - Animations and Micro-interactions
// Consistent animation patterns and micro-interactions

export const animations = {
  // Framer Motion variants
  motion: {
    // Fade animations
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    
    fadeInUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 }
    },
    
    fadeInDown: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 }
    },
    
    fadeInLeft: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 }
    },
    
    fadeInRight: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 }
    },
    
    // Scale animations
    scaleIn: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 }
    },
    
    scaleUp: {
      initial: { scale: 1 },
      animate: { scale: 1.05 },
      exit: { scale: 1 }
    },
    
    // Slide animations
    slideUp: {
      initial: { y: 100, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: 100, opacity: 0 }
    },
    
    slideDown: {
      initial: { y: -100, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: -100, opacity: 0 }
    },
    
    // Stagger animations
    stagger: {
      animate: {
        transition: {
          staggerChildren: 0.1
        }
      }
    },
    
    staggerItem: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 }
    }
  },

  // Transition configurations
  transitions: {
    // Quick transitions
    quick: {
      duration: 0.2,
      ease: 'easeOut'
    },
    
    // Standard transitions
    standard: {
      duration: 0.3,
      ease: 'easeInOut'
    },
    
    // Slow transitions
    slow: {
      duration: 0.5,
      ease: 'easeInOut'
    },
    
    // Spring transitions
    spring: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    },
    
    // Bounce transitions
    bounce: {
      type: 'spring',
      stiffness: 400,
      damping: 10
    }
  },

  // Hover animations
  hover: {
    // Button hover
    button: {
      scale: 1.05,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    
    // Card hover
    card: {
      scale: 1.02,
      y: -2,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    
    // Icon hover
    icon: {
      scale: 1.1,
      rotate: 5,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    
    // Link hover
    link: {
      scale: 1.02,
      transition: { duration: 0.2, ease: 'easeOut' }
    }
  },

  // Loading animations
  loading: {
    // Pulse animation
    pulse: {
      animate: {
        opacity: [0.5, 1, 0.5],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }
      }
    },
    
    // Spin animation
    spin: {
      animate: {
        rotate: 360,
        transition: {
          duration: 1,
          repeat: Infinity,
          ease: 'linear'
        }
      }
    },
    
    // Bounce animation
    bounce: {
      animate: {
        y: [0, -10, 0],
        transition: {
          duration: 0.6,
          repeat: Infinity,
          ease: 'easeInOut'
        }
      }
    }
  },

  // Page transitions
  page: {
    // Page enter
    enter: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    
    // Modal enter
    modal: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    
    // Drawer enter
    drawer: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
      transition: { duration: 0.3, ease: 'easeInOut' }
    }
  }
} as const

// Micro-interaction utilities
export const microInteractions = {
  // Button interactions
  button: {
    // Primary button
    primary: {
      whileHover: animations.hover.button,
      whileTap: { scale: 0.95 },
      transition: animations.transitions.quick
    },
    
    // Secondary button
    secondary: {
      whileHover: { scale: 1.02, backgroundColor: 'rgba(55, 65, 81, 0.8)' },
      whileTap: { scale: 0.98 },
      transition: animations.transitions.quick
    },
    
    // Ghost button
    ghost: {
      whileHover: { scale: 1.05, backgroundColor: 'rgba(55, 65, 81, 0.2)' },
      whileTap: { scale: 0.95 },
      transition: animations.transitions.quick
    }
  },

  // Card interactions
  card: {
    // Interactive card
    interactive: {
      whileHover: animations.hover.card,
      whileTap: { scale: 0.98 },
      transition: animations.transitions.standard
    },
    
    // Static card
    static: {
      whileHover: { y: -1 },
      transition: animations.transitions.quick
    }
  },

  // Icon interactions
  icon: {
    // Clickable icon
    clickable: {
      whileHover: animations.hover.icon,
      whileTap: { scale: 0.9 },
      transition: animations.transitions.quick
    },
    
    // Status icon
    status: {
      whileHover: { scale: 1.1 },
      transition: animations.transitions.quick
    }
  },

  // Input interactions
  input: {
    // Focus animation
    focus: {
      whileFocus: { scale: 1.02 },
      transition: animations.transitions.quick
    }
  },

  // List item interactions
  listItem: {
    // Interactive list item
    interactive: {
      whileHover: { x: 4, backgroundColor: 'rgba(55, 65, 81, 0.3)' },
      transition: animations.transitions.quick
    }
  }
} as const

// Animation utility functions
export const animationUtils = {
  // Get motion props for common patterns
  getMotionProps: (type: 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'scaleIn' | 'slideUp') => ({
    ...animations.motion[type],
    transition: animations.transitions.standard
  }),

  // Get hover props for components
  getHoverProps: (component: 'button' | 'card' | 'icon' | 'input' | 'listItem', variant?: string) => {
    const componentInteractions = microInteractions[component]
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
    if (variant && componentInteractions[variant as keyof typeof componentInteractions]) {
      return componentInteractions[variant as keyof typeof componentInteractions]
    }
    // Return the first available interaction type for the component
    const firstKey = Object.keys(componentInteractions)[0] as keyof typeof componentInteractions
    return componentInteractions[firstKey]
  },

  // Get stagger animation props
  getStaggerProps: (delay: number = 0.1) => ({
    ...animations.motion.stagger,
    transition: {
      staggerChildren: delay
    }
  }),

  // Get loading animation props
  getLoadingProps: (type: 'pulse' | 'spin' | 'bounce') => animations.loading[type],

  // Get page transition props
  getPageProps: (type: 'enter' | 'modal' | 'drawer') => animations.page[type],

  // Combine animations
  combine: (...animations: unknown[]) => {
    return animations.reduce((acc: any, anim) => ({ ...acc, ...(anim as any) }), {} as any)
  }
} as const

// Common animation patterns
export const commonAnimations = {
  // Dashboard animations
  dashboard: {
    // Metric card animation
    metricCard: {
      ...animations.motion.fadeInUp,
      transition: { ...animations.transitions.standard, delay: 0.1 }
    },
    
    // Chart animation
    chart: {
      ...animations.motion.fadeInUp,
      transition: { ...animations.transitions.standard, delay: 0.2 }
    },
    
    // Table animation
    table: {
      ...animations.motion.fadeInUp,
      transition: { ...animations.transitions.standard, delay: 0.3 }
    }
  },

  // Form animations
  form: {
    // Field animation
    field: {
      ...animations.motion.fadeInUp,
      transition: { ...animations.transitions.standard, delay: 0.1 }
    },
    
    // Error animation
    error: {
      ...animations.motion.fadeInDown,
      transition: { ...animations.transitions.quick }
    }
  },

  // Modal animations
  modal: {
    // Backdrop animation
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: animations.transitions.quick
    },
    
    // Content animation
    content: {
      ...animations.motion.scaleIn,
      transition: { ...animations.transitions.standard, delay: 0.1 }
    }
  }
} as const

export type AnimationType = keyof typeof animations.motion
export type TransitionType = keyof typeof animations.transitions
export type HoverType = keyof typeof animations.hover
export type LoadingType = keyof typeof animations.loading
