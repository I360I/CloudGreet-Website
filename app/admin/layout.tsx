"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Shield, Eye, EyeOff, LogOut, Crown, Users, Phone, DollarSign, 
  BarChart3, Settings, Activity, Database, Target, TrendingUp,
  Zap, UserPlus, Mail, MessageSquare, Calendar, CheckCircle, 
  AlertTriangle, Clock, RefreshCw, Play, Pause, Home,
  FileText, Wrench, TestTube, Monitor, PhoneCall, Search,
  Building2, Bot, Mail as MailIcon, MessageCircle, Calendar as CalendarIcon,
  DollarSign as MoneyIcon, BarChart, Settings as SettingsIcon,
  Users as UsersIcon, Activity as ActivityIcon, Database as DatabaseIcon,
  Target as TargetIcon, TrendingUp as TrendingUpIcon
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password,
          email: 'admin@cloudgreet.com'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('admin_token', data.token)
        setIsAuthenticated(true)
      } else {
        setError(data.message || 'Invalid access credentials')
      }
    } catch (err) {
      setError('Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setIsAuthenticated(false)
    setPassword('')
    setError('')
    router.push('/admin')
  }

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: Home,
      current: pathname === '/admin'
    },
    {
      name: 'Leads',
      href: '/admin/leads',
      icon: Users,
      current: pathname === '/admin/leads'
    },
    {
      name: 'Apollo Killer',
      href: '/admin/apollo-killer',
      icon: Search,
      current: pathname === '/admin/apollo-killer'
    },
    {
      name: 'Automation',
      href: '/admin/automation',
      icon: Zap,
      current: pathname === '/admin/automation'
    },
    {
      name: 'Phone Numbers',
      href: '/admin/phone-numbers',
      icon: Phone,
      current: pathname === '/admin/phone-numbers'
    },
    {
      name: 'Monitoring',
      href: '/admin/monitoring',
      icon: Monitor,
      current: pathname === '/admin/monitoring'
    },
    {
      name: 'Testing',
      href: '/admin/testing',
      icon: TestTube,
      current: pathname === '/admin/testing'
    },
    {
      name: 'Code Quality',
      href: '/admin/code-quality',
      icon: FileText,
      current: pathname === '/admin/code-quality'
    },
    {
      name: 'Code Formatter',
      href: '/admin/code-formatter',
      icon: Wrench,
      current: pathname === '/admin/code-formatter'
    },
    {
      name: 'Deployment Guide',
      href: '/admin/deployment-guide',
      icon: Settings,
      current: pathname === '/admin/deployment-guide'
    },
    {
      name: 'Tools',
      href: '/admin/tools',
      icon: Wrench,
      current: pathname === '/admin/tools'
    }
  ]

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-black to-gray-900/50"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-4 shadow-2xl"
            >
              <Crown className="w-8 h-8 text-white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-2"
            >
              MONEY MAKER DASHBOARD
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-sm"
            >
              Real Revenue • Real Clients • Real Automation
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-xl p-8 shadow-2xl"
          >
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-green-300 mb-2">
                  ACCESS KEY:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/70 border border-green-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                    placeholder="Enter access key"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-green-400 hover:text-green-200"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    ACCESS MONEY SYSTEM
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-xl border-r border-gray-800 flex-shrink-0 overflow-hidden"
          >
            <div className="p-6">
              {/* Logo */}
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Money Maker</h1>
                  <p className="text-gray-400 text-sm">Admin Dashboard</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <motion.button
                      key={item.name}
                      onClick={() => router.push(item.href)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                        item.current
                          ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                          : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.name}</span>
                    </motion.button>
                  )
                })}
              </nav>

              {/* Logout Button */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-gray-900/50 backdrop-blur-xl border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-white">
                {navigationItems.find(item => item.current)?.name || 'Dashboard'}
              </h1>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}


