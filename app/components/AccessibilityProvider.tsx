'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface AccessibilityContextType {
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large'
  setReducedMotion: (value: boolean) => void
  setHighContrast: (value: boolean) => void
  setFontSize: (size: 'small' | 'medium' | 'large') => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')

  useEffect(() => {
    // Check system preferences
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    // Check stored preferences
    const storedMotion = localStorage.getItem('reduced-motion')
    const storedContrast = localStorage.getItem('high-contrast')
    const storedFontSize = localStorage.getItem('font-size')

    if (storedMotion) setReducedMotion(storedMotion === 'true')
    if (storedContrast) setHighContrast(storedContrast === 'true')
    if (storedFontSize) setFontSize(storedFontSize as 'small' | 'medium' | 'large')

    // Apply styles
    applyAccessibilityStyles()

    // Listen for system changes
    mediaQuery.addEventListener('change', (e) => {
      setReducedMotion(e.matches)
    })

    return () => {
      mediaQuery.removeEventListener('change', () => {})
    }
  }, [applyAccessibilityStyles])

  useEffect(() => {
    applyAccessibilityStyles()
  }, [reducedMotion, highContrast, fontSize, applyAccessibilityStyles])

  const applyAccessibilityStyles = () => {
    const root = document.documentElement

    // Apply reduced motion
    if (reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms')
      root.style.setProperty('--animation-iteration-count', '1')
    } else {
      root.style.setProperty('--animation-duration', '300ms')
      root.style.setProperty('--animation-iteration-count', 'infinite')
    }

    // Apply high contrast
    if (highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Apply font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
    root.style.fontSize = fontSizes[fontSize]

    // Store preferences
    localStorage.setItem('reduced-motion', reducedMotion.toString())
    localStorage.setItem('high-contrast', highContrast.toString())
    localStorage.setItem('font-size', fontSize)
  }

  return (
    <AccessibilityContext.Provider value={{
      reducedMotion,
      highContrast,
      fontSize,
      setReducedMotion,
      setHighContrast,
      setFontSize
    }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

// Accessibility Controls Component
export function AccessibilityControls() {
  const { reducedMotion, highContrast, fontSize, setReducedMotion, setHighContrast, setFontSize } = useAccessibility()

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-white/20">
      <div className="space-y-3">
        <h3 className="text-white text-sm font-medium">Accessibility</h3>
        
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-gray-300 text-sm">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Reduce motion</span>
          </label>
          
          <label className="flex items-center space-x-2 text-gray-300 text-sm">
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>High contrast</span>
          </label>
          
          <div className="space-y-1">
            <label className="text-gray-300 text-sm">Font size</label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value as 'small' | 'medium' | 'large')}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
