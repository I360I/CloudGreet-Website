// Accessibility utilities and features

export interface AccessibilityConfig {
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
  screenReader: boolean
  keyboardNavigation: boolean
  focusVisible: boolean
}

export interface AccessibilityFeatures {
  skipLinks: boolean
  ariaLabels: boolean
  keyboardShortcuts: boolean
  colorContrast: boolean
  textScaling: boolean
  motionReduction: boolean
}

class AccessibilityManager {
  private config: AccessibilityConfig = {
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: false,
    focusVisible: true
  }

  private features: AccessibilityFeatures = {
    skipLinks: true,
    ariaLabels: true,
    keyboardShortcuts: true,
    colorContrast: true,
    textScaling: true,
    motionReduction: true
  }

  // Initialize accessibility features
  initialize() {
    this.detectScreenReader()
    this.detectReducedMotion()
    this.setupKeyboardNavigation()
    this.setupFocusManagement()
    this.setupColorContrast()
    this.setupTextScaling()
    this.setupSkipLinks()
    this.setupAriaLabels()
  }

  // Detect if screen reader is being used
  private detectScreenReader() {
    // Check for screen reader indicators
    const hasScreenReader = 
      window.speechSynthesis ||
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver') ||
      document.querySelector('[aria-live]')

    this.config.screenReader = hasScreenReader
  }

  // Detect reduced motion preference
  private detectReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.config.reducedMotion = prefersReducedMotion

    if (prefersReducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms')
      document.documentElement.style.setProperty('--transition-duration', '0.01ms')
    }
  }

  // Setup keyboard navigation
  private setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
      // Skip to main content
      if (event.key === 'Tab' && event.shiftKey === false && !event.ctrlKey) {
        const firstFocusable = document.querySelector('[tabindex="0"], button, input, select, textarea, a[href]')
        if (firstFocusable && !document.activeElement) {
          (firstFocusable as HTMLElement).focus()
        }
      }

      // Escape key handling
      if (event.key === 'Escape') {
        this.handleEscapeKey()
      }

      // Arrow key navigation for custom components
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.handleArrowNavigation(event)
      }
    })

    this.config.keyboardNavigation = true
  }

  // Setup focus management
  private setupFocusManagement() {
    // Add focus-visible class for better focus indicators
    document.addEventListener('keydown', () => {
      document.body.classList.add('keyboard-navigation')
    })

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation')
    })

    // Trap focus in modals
    this.setupFocusTrap()
  }

  // Setup focus trap for modals
  private setupFocusTrap() {
    const modals = document.querySelectorAll('[role="dialog"], [role="modal"]')
    
    modals.forEach(modal => {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      modal.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus()
              event.preventDefault()
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus()
              event.preventDefault()
            }
          }
        }
      })
    })
  }

  // Setup color contrast
  private setupColorContrast() {
    const toggle = document.getElementById('high-contrast-toggle')
    if (toggle) {
      toggle.addEventListener('click', () => {
        this.toggleHighContrast()
      })
    }
  }

  // Toggle high contrast mode
  toggleHighContrast() {
    this.config.highContrast = !this.config.highContrast
    document.body.classList.toggle('high-contrast', this.config.highContrast)
    
    // Save preference
    localStorage.setItem('accessibility-high-contrast', this.config.highContrast.toString())
  }

  // Setup text scaling
  private setupTextScaling() {
    const increaseButton = document.getElementById('text-increase')
    const decreaseButton = document.getElementById('text-decrease')
    const resetButton = document.getElementById('text-reset')

    if (increaseButton) {
      increaseButton.addEventListener('click', () => this.increaseTextSize())
    }
    if (decreaseButton) {
      decreaseButton.addEventListener('click', () => this.decreaseTextSize())
    }
    if (resetButton) {
      resetButton.addEventListener('click', () => this.resetTextSize())
    }
  }

  // Increase text size
  increaseTextSize() {
    const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const newSize = Math.min(currentSize + 2, 24) // Max 24px
    document.documentElement.style.fontSize = `${newSize}px`
    this.config.largeText = newSize > 16
    localStorage.setItem('accessibility-text-size', newSize.toString())
  }

  // Decrease text size
  decreaseTextSize() {
    const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const newSize = Math.max(currentSize - 2, 12) // Min 12px
    document.documentElement.style.fontSize = `${newSize}px`
    this.config.largeText = newSize > 16
    localStorage.setItem('accessibility-text-size', newSize.toString())
  }

  // Reset text size
  resetTextSize() {
    document.documentElement.style.fontSize = '16px'
    this.config.largeText = false
    localStorage.removeItem('accessibility-text-size')
  }

  // Setup skip links
  private setupSkipLinks() {
    const skipLink = document.createElement('a')
    skipLink.href = '#main-content'
    skipLink.textContent = 'Skip to main content'
    skipLink.className = 'skip-link'
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 1000;
      transition: top 0.3s;
    `
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px'
    })
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px'
    })

    document.body.insertBefore(skipLink, document.body.firstChild)
  }

  // Setup ARIA labels
  private setupAriaLabels() {
    // Add ARIA labels to interactive elements without labels
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])')
    buttons.forEach(button => {
      if (!button.textContent?.trim()) {
        button.setAttribute('aria-label', 'Button')
      }
    })

    // Add ARIA labels to form inputs
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])')
    inputs.forEach(input => {
      const label = document.querySelector(`label[for="${input.id}"]`)
      if (!label && !input.getAttribute('placeholder')) {
        input.setAttribute('aria-label', 'Input field')
      }
    })

    // Add ARIA live regions for dynamic content
    this.setupLiveRegions()
  }

  // Setup live regions for screen readers
  private setupLiveRegions() {
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `
    document.body.appendChild(liveRegion)
  }

  // Handle escape key
  private handleEscapeKey() {
    // Close modals
    const modals = document.querySelectorAll('[role="dialog"][aria-hidden="false"]')
    modals.forEach(modal => {
      const closeButton = modal.querySelector('[aria-label*="close"], [aria-label*="Close"]')
      if (closeButton) {
        (closeButton as HTMLElement).click()
      }
    })

    // Close dropdowns
    const dropdowns = document.querySelectorAll('[aria-expanded="true"]')
    dropdowns.forEach(dropdown => {
      (dropdown as HTMLElement).setAttribute('aria-expanded', 'false')
    })
  }

  // Handle arrow key navigation
  private handleArrowNavigation(event: KeyboardEvent) {
    const target = event.target as HTMLElement
    const container = target.closest('[role="menu"], [role="listbox"], [role="grid"]')
    
    if (!container) return

    const items = container.querySelectorAll('[role="menuitem"], [role="option"], [role="gridcell"]')
    const currentIndex = Array.from(items).indexOf(target)
    
    let nextIndex = currentIndex
    
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % items.length
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1
        break
    }
    
    if (nextIndex !== currentIndex) {
      (items[nextIndex] as HTMLElement).focus()
      event.preventDefault()
    }
  }

  // Announce message to screen readers
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const liveRegion = document.querySelector('[aria-live]') as HTMLElement
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority)
      liveRegion.textContent = message
      
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = ''
      }, 1000)
    }
  }

  // Get current accessibility configuration
  getConfig(): AccessibilityConfig {
    return { ...this.config }
  }

  // Get available features
  getFeatures(): AccessibilityFeatures {
    return { ...this.features }
  }

  // Load saved preferences
  loadPreferences() {
    const highContrast = localStorage.getItem('accessibility-high-contrast') === 'true'
    const textSize = localStorage.getItem('accessibility-text-size')
    
    if (highContrast) {
      this.toggleHighContrast()
    }
    
    if (textSize) {
      document.documentElement.style.fontSize = `${textSize}px`
      this.config.largeText = parseFloat(textSize) > 16
    }
  }

  // Save preferences
  savePreferences() {
    localStorage.setItem('accessibility-config', JSON.stringify(this.config))
  }
}

// Singleton instance
export const accessibilityManager = new AccessibilityManager()

// Initialize on DOM ready
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    accessibilityManager.initialize()
    accessibilityManager.loadPreferences()
  })
}

// Utility functions
export function addAriaLabel(element: HTMLElement, label: string) {
  element.setAttribute('aria-label', label)
}

export function addAriaDescribedBy(element: HTMLElement, descriptionId: string) {
  element.setAttribute('aria-describedby', descriptionId)
}

export function setAriaExpanded(element: HTMLElement, expanded: boolean) {
  element.setAttribute('aria-expanded', expanded.toString())
}

export function setAriaSelected(element: HTMLElement, selected: boolean) {
  element.setAttribute('aria-selected', selected.toString())
}

export function setAriaHidden(element: HTMLElement, hidden: boolean) {
  element.setAttribute('aria-hidden', hidden.toString())
}

export function addRole(element: HTMLElement, role: string) {
  element.setAttribute('role', role)
}

export function addTabIndex(element: HTMLElement, index: number) {
  element.setAttribute('tabindex', index.toString())
}

export function removeTabIndex(element: HTMLElement) {
  element.removeAttribute('tabindex')
}

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string) => {
    const rgb = hexToRgb(color)
    if (!rgb) return 0
    
    const { r, g, b } = rgb
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }
  
  const l1 = getLuminance(color1)
  const l2 = getLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export function isAccessibleContrast(color1: string, color2: string): boolean {
  const ratio = getContrastRatio(color1, color2)
  return ratio >= 4.5 // WCAG AA standard
}

// Keyboard shortcut utilities
export function addKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}
) {
  document.addEventListener('keydown', (event) => {
    if (event.key === key &&
        event.ctrlKey === !!modifiers.ctrl &&
        event.altKey === !!modifiers.alt &&
        event.shiftKey === !!modifiers.shift) {
      event.preventDefault()
      callback()
    }
  })
}

// Focus management utilities
export function focusElement(selector: string) {
  const element = document.querySelector(selector) as HTMLElement
  if (element) {
    element.focus()
  }
}

export function focusFirstFocusable(container: HTMLElement) {
  const focusable = container.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as HTMLElement
  
  if (focusable) {
    focusable.focus()
  }
}

export function focusLastFocusable(container: HTMLElement) {
  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  if (focusable.length > 0) {
    (focusable[focusable.length - 1] as HTMLElement).focus()
  }
}
