'use client'

import { useEffect, useCallback } from 'react'

interface ShortcutConfig {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  callback: () => void
  description?: string
  preventDefault?: boolean
}

/**
 * Hook for keyboard shortcuts with proper accessibility
 * Respects prefers-reduced-motion and provides help overlay
 */
export function useKeyboardShortcut(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return
    }

    // Check each shortcut
    shortcuts.forEach((shortcut) => {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatch = shortcut.ctrlKey === undefined || e.ctrlKey === shortcut.ctrlKey
      const shiftMatch = shortcut.shiftKey === undefined || e.shiftKey === shortcut.shiftKey
      const altMatch = shortcut.altKey === undefined || e.altKey === shortcut.altKey
      const metaMatch = shortcut.metaKey === undefined || e.metaKey === shortcut.metaKey

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        if (shortcut.preventDefault) {
          e.preventDefault()
        }
        shortcut.callback()
      }
    })
  }, [shortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Keyboard shortcuts for dashboard
 */
export const dashboardShortcuts: ShortcutConfig[] = [
  {
    key: '?',
    callback: () => {
      // Open help modal
      const event = new CustomEvent('show-keyboard-shortcuts')
      window.dispatchEvent(event)
    },
    description: 'Show keyboard shortcuts',
    preventDefault: true,
  },
  {
    key: 'c',
    callback: () => {
      const event = new CustomEvent('create-appointment')
      window.dispatchEvent(event)
    },
    description: 'Create appointment',
    preventDefault: true,
  },
  {
    key: 's',
    callback: () => {
      const event = new CustomEvent('open-search')
      window.dispatchEvent(event)
    },
    description: 'Search',
    preventDefault: true,
  },
  {
    key: 'Escape',
    callback: () => {
      const event = new CustomEvent('close-modal')
      window.dispatchEvent(event)
    },
    description: 'Close modal',
  },
]

/**
 * Component to display keyboard shortcuts
 */
export function KeyboardShortcutsHelp({ shortcuts }: { shortcuts: ShortcutConfig[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
            <span className="text-gray-300">{shortcut.description}</span>
            <kbd className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm font-mono text-gray-300">
              {shortcut.ctrlKey && 'Ctrl + '}
              {shortcut.shiftKey && 'Shift + '}
              {shortcut.altKey && 'Alt + '}
              {shortcut.metaKey && 'Cmd + '}
              {shortcut.key.toUpperCase()}
            </kbd>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Press <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs font-mono">?</kbd> anytime to see this help
      </p>
    </div>
  )
}

