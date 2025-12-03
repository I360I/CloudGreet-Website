/**
 * Focus Trap Utility for Modals and Overlays
 * Ensures keyboard users can't escape modal context
 */

export class FocusTrap {
  private container: HTMLElement
  private previousActiveElement: HTMLElement | null = null
  private focusableElements: HTMLElement[] = []

  constructor(container: HTMLElement) {
    this.container = container
  }

  /**
   * Get all focusable elements within container
   */
  private getFocusableElements(): HTMLElement[] {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const elements = this.container.querySelectorAll<HTMLElement>(selectors)
    return Array.from(elements).filter(el => {
      // Filter out hidden elements
      return el.offsetParent !== null
    })
  }

  /**
   * Activate focus trap
   */
  activate(): void {
    // Store currently focused element
    this.previousActiveElement = document.activeElement as HTMLElement

    // Get focusable elements
    this.focusableElements = this.getFocusableElements()

    // Focus first element
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus()
    }

    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown)
  }

  /**
   * Deactivate focus trap
   */
  deactivate(): void {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown)

    // Restore focus to previously focused element
    if (this.previousActiveElement && this.previousActiveElement.focus) {
      this.previousActiveElement.focus()
    }
  }

  /**
   * Handle Tab key to trap focus
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return

    // Refresh focusable elements (in case DOM changed)
    this.focusableElements = this.getFocusableElements()

    if (this.focusableElements.length === 0) return

    const firstElement = this.focusableElements[0]
    const lastElement = this.focusableElements[this.focusableElements.length - 1]

    if (e.shiftKey) {
      // Shift + Tab - going backwards
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab - going forwards
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
  }
}

/**
 * React hook for focus trap
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  React.useEffect(() => {
    if (!isActive || !containerRef.current) return

    const trap = new FocusTrap(containerRef.current)
    trap.activate()

    return () => {
      trap.deactivate()
    }
  }, [isActive, containerRef])
}

// For React imports
import React from 'react'

