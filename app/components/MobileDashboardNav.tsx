'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu, X, Home, Phone, Calendar, DollarSign, Settings, 
  LogOut, BarChart3, Users, Bell, Zap 
} from 'lucide-react'
import Link from 'next/link'

interface MobileDashboardNavProps {
  businessName: string
  onLogout: () => void
}

export default function MobileDashboardNav({ businessName, onLogout }: MobileDashboardNavProps) {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', color: 'blue' },
    { icon: Phone, label: 'Calls', href: '/calls', color: 'green' },
    { icon: Calendar, label: 'Appointments', href: '/appointments', color: 'purple' },
    { icon: DollarSign, label: 'Billing', href: '/billing', color: 'yellow' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics', color: 'pink' },
    { icon: Settings, label: 'Settings', href: '/settings', color: 'gray' }
  ]

  return (
    <>
      {/* Mobile Menu Button (only shows on mobile) */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="w-6 h-6 text-white" />
      </motion.button>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-gray-900 border-r border-white/10 z-50 lg:hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Menu</h2>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </motion.button>
                </div>
                <div className="text-sm text-gray-400">{businessName}</div>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 overflow-y-auto py-4">
                <div className="space-y-2 px-4">
                  {navItems.map((item, index) => {
                    const getColorClasses = (color: string) => {
                      const colors: any = {
                        blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
                        green: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
                        purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
                        yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
                        pink: { bg: 'bg-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-400' },
                        gray: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400' }
                      }
                      return colors[color] || colors.gray
                    }
                    const colors = getColorClasses(item.color)
                    
                    return (
                      <Link key={item.href} href={item.href}>
                        <motion.button
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setIsOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-left"
                        >
                          <div className={`w-10 h-10 ${colors.bg} border ${colors.border} rounded-lg flex items-center justify-center`}>
                            <item.icon className={`w-5 h-5 ${colors.text}`} />
                          </div>
                          <span className="text-white font-medium">{item.label}</span>
                        </motion.button>
                      </Link>
                    )
                  })}
                </div>

                {/* Quick Actions */}
                <div className="mt-6 px-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <Link href="/test-agent-simple">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white font-medium"
                      >
                        <Zap className="w-5 h-5" />
                        Test AI Agent
                      </motion.button>
                    </Link>

                    <Link href="/get-phone">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white"
                      >
                        <Phone className="w-5 h-5" />
                        Get Phone Number
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-white/10">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onLogout()
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 font-medium transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

