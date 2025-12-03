'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {  Menu, X, Home, Phone, Calendar, Settings, LogOut, User, DollarSign, HelpCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MobileNavProps {
  currentPath?: string
}

export default function MobileNav({ currentPath = '/dashboard' }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/clear-token', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Phone, label: 'Calls', href: '/calls' },
    { icon: Calendar, label: 'Appointments', href: '/appointments' },
    { icon: DollarSign, label: 'Pricing', href: '/pricing' },
    { icon: User, label: 'Account', href: '/account' },
    { icon: Settings, label: 'Settings', href: '/settings' },
    { icon: HelpCircle, label: 'Help', href: '/help' },
  ]

  return (
    <>
      {/* Mobile Menu Button - Always visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-[1070] min-w-[44px] min-h-[44px] flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white rounded-lg shadow-lg transition-all duration-normal"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-menu"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1040] lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            id="mobile-nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-[280px] bg-gray-900 border-l border-gray-800 z-[1050] lg:hidden overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                  CloudGreet
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">AI Receptionist Platform</p>
            </div>

            {/* Menu Items */}
            <div className="py-4">
              {menuItems.map((item, index) => {
                const Icon = item.icon
                const isActive = currentPath === item.href
                
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                        flex items-center gap-3 px-6 py-3 min-h-[44px]
                        transition-colors duration-normal
                        ${isActive 
                          ? 'bg-primary-500/10 text-primary-400 border-r-2 border-primary-500' 
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </motion.div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-800 bg-gray-900">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 bg-error-500 hover:bg-error-600 text-white rounded-lg font-medium transition-colors duration-normal shadow-lg"
                aria-label="Log out of your account"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
                <span>Log Out</span>
              </button>
              
              <p className="text-center text-xs text-gray-500 mt-4">
                Version 1.0.0
              </p>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}

