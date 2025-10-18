'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Command, 
  Search, 
  Users, 
  BarChart3, 
  Settings, 
  Bell,
  Download,
  Plus,
  RefreshCw,
  X,
  Zap
} from 'lucide-react'

interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  icon: React.ComponentType<any>
  category: 'navigation' | 'actions' | 'tools'
}

export default function AdminKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false)
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Open shortcuts help with Cmd/Ctrl + ?
      if ((event.metaKey || event.ctrlKey) && event.key === '?') {
        event.preventDefault()
        setIsOpen(true)
        return
      }

      // Don't trigger shortcuts if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      // Execute shortcuts
      shortcuts.forEach(shortcut => {
        if (shortcut.key === event.key && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault()
          shortcut.action()
        }
      })
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])

  const initializeShortcuts = (actions: {
    onSearch: () => void
    onClients: () => void
    onAnalytics: () => void
    onSettings: () => void
    onNotifications: () => void
    onExport: () => void
    onAddClient: () => void
    onRefresh: () => void
  }) => {
    const newShortcuts: KeyboardShortcut[] = [
      {
        key: 's',
        description: 'Focus search',
        action: actions.onSearch,
        icon: Search,
        category: 'navigation'
      },
      {
        key: 'c',
        description: 'Go to clients',
        action: actions.onClients,
        icon: Users,
        category: 'navigation'
      },
      {
        key: 'a',
        description: 'Go to analytics',
        action: actions.onAnalytics,
        icon: BarChart3,
        category: 'navigation'
      },
      {
        key: 't',
        description: 'Go to settings',
        action: actions.onSettings,
        icon: Settings,
        category: 'navigation'
      },
      {
        key: 'n',
        description: 'Open notifications',
        action: actions.onNotifications,
        icon: Bell,
        category: 'actions'
      },
      {
        key: 'e',
        description: 'Export data',
        action: actions.onExport,
        icon: Download,
        category: 'actions'
      },
      {
        key: '+',
        description: 'Add new client',
        action: actions.onAddClient,
        icon: Plus,
        category: 'actions'
      },
      {
        key: 'r',
        description: 'Refresh data',
        action: actions.onRefresh,
        icon: RefreshCw,
        category: 'tools'
      }
    ]

    setShortcuts(newShortcuts)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation':
        return <Command className="w-4 h-4" />
      case 'actions':
        return <Zap className="w-4 h-4" />
      case 'tools':
        return <Settings className="w-4 h-4" />
      default:
        return <Command className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation':
        return 'text-blue-400'
      case 'actions':
        return 'text-green-400'
      case 'tools':
        return 'text-purple-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <>
      {/* Keyboard Shortcuts Help */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Command className="w-5 h-5 text-blue-400" />
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Press <kbd className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">Cmd/Ctrl + ?</kbd> to toggle this help
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Shortcuts List */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-6">
                  {['navigation', 'actions', 'tools'].map(category => {
                    const categoryShortcuts = shortcuts.filter(s => s.category === category)
                    if (categoryShortcuts.length === 0) return null

                    return (
                      <div key={category}>
                        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2 capitalize">
                          {getCategoryIcon(category)}
                          {category}
                        </h3>
                        <div className="space-y-2">
                          {categoryShortcuts.map((shortcut) => (
                            <div
                              key={shortcut.key}
                              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <shortcut.icon className={`w-4 h-4 ${getCategoryColor(shortcut.category)}`} />
                                <span className="text-white">{shortcut.description}</span>
                              </div>
                              <kbd className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm font-mono">
                                {shortcut.key}
                              </kbd>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-700 bg-gray-800/50">
                <p className="text-xs text-gray-400 text-center">
                  All shortcuts work globally in the admin dashboard
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export the initialize function for parent component */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.initializeAdminShortcuts = ${initializeShortcuts.toString()};
          `
        }}
      />
    </>
  )
}

// Export the initialize function
export { AdminKeyboardShortcuts as initializeAdminShortcuts }
