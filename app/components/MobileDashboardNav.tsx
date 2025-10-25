'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Home, Phone, Calendar, DollarSign, Settings, Users } from 'lucide-react'
import Link from 'next/link'

interface MobileDashboardNavProps {
  currentPage?: string
}

export default function MobileDashboardNav({ currentPage = 'dashboard' }: MobileDashboardNavProps) {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/calls', label: 'Calls', icon: Phone },
    { href: '/appointments', label: 'Appointments', icon: Calendar },
    { href: '/billing', label: 'Billing', icon: DollarSign },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 bg-gray-800/80 border border-gray-700/50 rounded-xl flex items-center justify-center backdrop-blur-xl"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Navigation Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-gray-900/95 border-r border-gray-800/50 backdrop-blur-xl z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
                <h2 className="text-xl font-bold text-white">CloudGreet</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 bg-gray-800/50 border border-gray-700/50 rounded-lg flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="p-6 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPage === item.href.split('/')[1]
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
                          : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>

              {/* User Info */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Business Owner</p>
                      <p className="text-gray-400 text-xs">Active Plan</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
