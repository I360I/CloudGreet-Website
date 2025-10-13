'use client'

import { useEffect, useCallback } from 'react'

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
}

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

/**
 * Custom hook for keyboard shortcuts
 * Provides power user features for the Apollo Killer interface
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true
}: UseKeyboardShortcutsProps) {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return
    }

    shortcuts.forEach(shortcut => {
      const { key, ctrl, shift, alt, action } = shortcut

      const ctrlMatch = ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
      const shiftMatch = shift ? event.shiftKey : !event.shiftKey
      const altMatch = alt ? event.altKey : !event.altKey
      const keyMatch = event.key.toLowerCase() === key.toLowerCase()

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        event.preventDefault()
        action()
      }
    })
  }, [shortcuts, enabled])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

/**
 * Predefined shortcut sets for Apollo Killer
 */
export const apolloKillerShortcuts = {
  search: (action: () => void) => ({
    key: 'k',
    ctrl: true,
    description: 'Focus search',
    action
  }),

  selectAll: (action: () => void) => ({
    key: 'a',
    ctrl: true,
    description: 'Select all visible leads',
    action
  }),

  clearSelection: (action: () => void) => ({
    key: 'escape',
    description: 'Clear selection',
    action
  }),

  bulkEnrich: (action: () => void) => ({
    key: 'e',
    ctrl: true,
    description: 'Enrich selected leads',
    action
  }),

  exportLeads: (action: () => void) => ({
    key: 'x',
    ctrl: true,
    description: 'Export leads',
    action
  }),

  toggleFilters: (action: () => void) => ({
    key: 'f',
    ctrl: true,
    description: 'Toggle advanced filters',
    action
  }),

  nextPage: (action: () => void) => ({
    key: 'arrowright',
    ctrl: true,
    description: 'Next page',
    action
  }),

  prevPage: (action: () => void) => ({
    key: 'arrowleft',
    ctrl: true,
    description: 'Previous page',
    action
  }),

  refresh: (action: () => void) => ({
    key: 'r',
    ctrl: true,
    description: 'Refresh leads',
    action
  }),

  help: (action: () => void) => ({
    key: '?',
    description: 'Show keyboard shortcuts',
    action
  })
}

/**
 * Hook for Apollo Killer specific shortcuts
 */
export function useApolloKillerShortcuts(handlers: {
  onSearch?: () => void
  onSelectAll?: () => void
  onClearSelection?: () => void
  onBulkEnrich?: () => void
  onExport?: () => void
  onToggleFilters?: () => void
  onNextPage?: () => void
  onPrevPage?: () => void
  onRefresh?: () => void
  onHelp?: () => void
}) {
  const shortcuts = Object.entries(handlers)
    .filter(([, handler]) => handler !== undefined)
    .map(([key, handler]) => {
      const shortcutCreator = apolloKillerShortcuts[key as keyof typeof apolloKillerShortcuts]
      return shortcutCreator ? shortcutCreator(handler!) : null
    })
    .filter(Boolean) as KeyboardShortcut[]

  return useKeyboardShortcuts({ shortcuts })
}

/**
 * Keyboard shortcut help component
 */
export const KeyboardShortcutHelp = () => {
  const shortcuts = [
    { keys: 'Ctrl+K', description: 'Focus search' },
    { keys: 'Ctrl+A', description: 'Select all visible leads' },
    { keys: 'Escape', description: 'Clear selection' },
    { keys: 'Ctrl+E', description: 'Enrich selected leads' },
    { keys: 'Ctrl+X', description: 'Export leads' },
    { keys: 'Ctrl+F', description: 'Toggle advanced filters' },
    { keys: 'Ctrl+→', description: 'Next page' },
    { keys: 'Ctrl+←', description: 'Previous page' },
    { keys: 'Ctrl+R', description: 'Refresh leads' },
    { keys: '?', description: 'Show keyboard shortcuts' }
  ]

  return (
    <div className="bg-gray-800/90 border border-gray-600 rounded-xl p-6 backdrop-blur-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-gray-300">{shortcut.description}</span>
            <kbd className="px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-sm text-gray-300">
              {shortcut.keys}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}
