'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronUp, Home, User, Settings, Phone } from 'lucide-react'

interface MobileOptimizerProps {
  children: React.ReactNode
}

export default function MobileOptimizer({ children }: MobileOptimizerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  // Detect device type and orientation
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      setOrientation(width > height ? 'landscape' : 'portrait')
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)

    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [])

  // Handle scroll to show/hide back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Touch gesture handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Swipe detection
    if (absDeltaX > absDeltaY && absDeltaX > 50) {
      if (deltaX > 0) {
        // Swipe right - could open menu
        if (isMobile && !showMobileMenu) {
          setShowMobileMenu(true)
        }
      } else {
        // Swipe left - could close menu
        if (isMobile && showMobileMenu) {
          setShowMobileMenu(false)
        }
      }
    }

    setTouchStart(null)
  }, [touchStart, isMobile, showMobileMenu])

  // Prevent zoom on input focus (iOS)
  useEffect(() => {
    if (isMobile) {
      const inputs = document.querySelectorAll('input, textarea, select')
      inputs.forEach(input => {
        input.setAttribute('style', 'font-size: 16px;')
      })
    }
  }, [isMobile])

  // Mobile-specific optimizations
  useEffect(() => {
    if (isMobile) {
      // Add mobile-specific CSS classes
      document.body.classList.add('mobile-optimized')
      
      // Optimize viewport
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      }

      return () => {
        document.body.classList.remove('mobile-optimized')
      }
    }
  }, [isMobile])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const mobileMenuItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: User, label: 'Dashboard', href: '/dashboard' },
    { icon: Phone, label: 'Test Agent', href: '/test-agent' },
    { icon: Settings, label: 'Settings', href: '/settings' }
  ]

  return (
    <div 
      className={`mobile-optimizer ${isMobile ? 'mobile' : ''} ${isTablet ? 'tablet' : ''} ${orientation}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/20 z-50"
        >
          <div className="flex justify-around py-2">
            {mobileMenuItems.map((item, index) => (
              <motion.a
                key={index}
                href={item.href}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center space-y-1 p-2 text-white/60 hover:text-white transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </motion.a>
            ))}
          </div>
        </motion.div>
      )}

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {showMobileMenu && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowMobileMenu(false)}
          >
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="w-80 h-full bg-slate-900 border-r border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-white">Menu</h2>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="p-2 text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <nav className="space-y-4">
                  {mobileMenuItems.map((item, index) => (
                    <motion.a
                      key={index}
                      href={item.href}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center space-x-3 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </motion.a>
                  ))}
                </nav>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={scrollToTop}
            className="fixed bottom-20 right-4 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
            style={{ bottom: isMobile ? '80px' : '20px' }}
          >
            <ChevronUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile-specific styles */}
      <style jsx global>{`
        .mobile-optimized {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        .mobile-optimized input,
        .mobile-optimized textarea,
        .mobile-optimized select {
          font-size: 16px !important;
          -webkit-appearance: none;
          border-radius: 0;
        }
        
        .mobile-optimized button {
          -webkit-tap-highlight-color: transparent;
        }
        
        .mobile-optimized * {
          -webkit-overflow-scrolling: touch;
        }
        
        @media (max-width: 768px) {
          .mobile-optimizer.mobile .content {
            padding-bottom: 80px;
          }
        }
        
        @media (orientation: landscape) and (max-height: 500px) {
          .mobile-optimizer.landscape .fixed.bottom-0 {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
