'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, Zap, Target, TrendingUp } from 'lucide-react'

interface AIPoweredUXProps {
  children: React.ReactNode
}

interface UserBehavior {
  clicks: Array<{ element: string; timestamp: number }>
  scrolls: Array<{ position: number; timestamp: number }>
  timeSpent: { [page: string]: number }
  navigationPattern: string[]
  preferences: { [key: string]: any }
}

interface SmartSuggestion {
  id: string
  type: 'navigation' | 'action' | 'content' | 'optimization'
  title: string
  description: string
  confidence: number
  action: () => void
  icon: React.ComponentType<any>
}

export default function AIPoweredUX({ children }: AIPoweredUXProps) {
  const [userBehavior, setUserBehavior] = useState<UserBehavior>({
    clicks: [],
    scrolls: [],
    timeSpent: {},
    navigationPattern: [],
    preferences: {}
  })
  
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLearning, setIsLearning] = useState(true)
  const [predictedNextAction, setPredictedNextAction] = useState<string | null>(null)
  
  const behaviorRef = useRef<UserBehavior>(userBehavior)
  const sessionStartRef = useRef(Date.now())

  // Track user behavior in real-time
  useEffect(() => {
    const trackClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const element = target.tagName.toLowerCase()
      
      setUserBehavior(prev => ({
        ...prev,
        clicks: [...prev.clicks.slice(-99), { element, timestamp: Date.now() }]
      }))
    }

    const trackScroll = throttle((e: Event) => {
      const scrollTop = window.scrollY
      setUserBehavior(prev => ({
        ...prev,
        scrolls: [...prev.scrolls.slice(-99), { position: scrollTop, timestamp: Date.now() }]
      }))
    }, 100)

    const trackTimeSpent = () => {
      const currentPage = window.location.pathname
      const timeSpent = Date.now() - sessionStartRef.current
      
      setUserBehavior(prev => ({
        ...prev,
        timeSpent: {
          ...prev.timeSpent,
          [currentPage]: (prev.timeSpent[currentPage] || 0) + timeSpent
        }
      }))
      
      sessionStartRef.current = Date.now()
    }

    document.addEventListener('click', trackClick)
    window.addEventListener('scroll', trackScroll)
    
    const timeInterval = setInterval(trackTimeSpent, 5000)
    
    return () => {
      document.removeEventListener('click', trackClick)
      window.removeEventListener('scroll', trackScroll)
      clearInterval(timeInterval)
    }
  }, [])

  // AI-powered behavior analysis
  useEffect(() => {
    if (userBehavior.clicks.length < 5) return // Need minimum data

    const analyzeBehavior = async () => {
      // Simulate AI analysis (in real app, this would call ML API)
      const analysis = await new Promise<any>((resolve) => {
        setTimeout(() => {
          resolve({
            engagementScore: calculateEngagementScore(),
            nextActionProbability: calculateNextActionProbability(),
            optimizationSuggestions: generateOptimizationSuggestions(),
            userType: determineUserType()
          })
        }, 1000)
      })

      generateSmartSuggestions(analysis)
      setPredictedNextAction(analysis.nextActionProbability.mostLikely)
    }

    analyzeBehavior()
  }, [userBehavior.clicks.length, calculateEngagementScore, calculateNextActionProbability, determineUserType, generateOptimizationSuggestions, generateSmartSuggestions])

  const calculateEngagementScore = (): number => {
    const clicks = userBehavior.clicks.length
    const scrolls = userBehavior.scrolls.length
    const avgTimeSpent = Object.values(userBehavior.timeSpent).reduce((a, b) => a + b, 0) / Object.keys(userBehavior.timeSpent).length
    
    return Math.min(100, (clicks * 2 + scrolls * 1 + avgTimeSpent / 1000) / 10)
  }

  const calculateNextActionProbability = () => {
    const currentPath = window.location.pathname
    const recentClicks = userBehavior.clicks.slice(-10)
    
    // Simple prediction logic (in real app, this would use ML)
    const predictions = {
      '/': { '/dashboard': 0.7, '/pricing': 0.2, '/contact': 0.1 },
      '/dashboard': { '/test-agent': 0.4, '/settings': 0.3, '/billing': 0.3 },
      '/pricing': { '/start': 0.8, '/dashboard': 0.2 },
      '/start': { '/dashboard': 0.9, '/pricing': 0.1 }
    }

    const currentPredictions = predictions[currentPath as keyof typeof predictions] || {}
    const mostLikely = Object.keys(currentPredictions).reduce((a, b) => 
      currentPredictions[a] > currentPredictions[b] ? a : b
    )

    return { mostLikely, probabilities: currentPredictions }
  }

  const generateOptimizationSuggestions = () => {
    const suggestions = []
    
    if (userBehavior.clicks.length > 20) {
      suggestions.push('High engagement detected - consider showing advanced features')
    }
    
    if (userBehavior.scrolls.some(s => s.position > window.innerHeight * 3)) {
      suggestions.push('User scrolled deep - content is engaging')
    }
    
    const avgTimePerPage = Object.values(userBehavior.timeSpent).reduce((a, b) => a + b, 0) / Object.keys(userBehavior.timeSpent).length
    if (avgTimePerPage > 30000) {
      suggestions.push('Long session detected - user is highly interested')
    }

    return suggestions
  }

  const determineUserType = () => {
    const totalClicks = userBehavior.clicks.length
    const avgTimeSpent = Object.values(userBehavior.timeSpent).reduce((a, b) => a + b, 0) / Object.keys(userBehavior.timeSpent).length
    
    if (totalClicks > 15 && avgTimeSpent > 20000) return 'power-user'
    if (totalClicks > 5 && avgTimeSpent > 10000) return 'engaged-user'
    if (totalClicks < 3) return 'casual-browser'
    return 'regular-user'
  }

  const generateSmartSuggestions = (analysis: any) => {
    const suggestions: SmartSuggestion[] = []

    // Navigation suggestions based on behavior
    if (analysis.userType === 'power-user') {
      suggestions.push({
        id: 'advanced-features',
        type: 'navigation',
        title: 'Explore Advanced Features',
        description: 'Based on your usage, you might like our advanced AI customization options.',
        confidence: 0.85,
        action: () => window.location.href = '/settings',
        icon: Brain
      })
    }

    // Action suggestions
    if (userBehavior.clicks.some(c => c.element === 'button' && c.timestamp > Date.now() - 10000)) {
      suggestions.push({
        id: 'test-agent',
        type: 'action',
        title: 'Test Your AI Agent',
        description: 'Ready to see your AI receptionist in action?',
        confidence: 0.9,
        action: () => window.location.href = '/test-agent',
        icon: Zap
      })
    }

    // Content suggestions
    if (analysis.engagementScore > 70) {
      suggestions.push({
        id: 'pricing-info',
        type: 'content',
        title: 'View Pricing Plans',
        description: 'You seem interested - check out our flexible pricing options.',
        confidence: 0.75,
        action: () => window.location.href = '/pricing',
        icon: Target
      })
    }

    // Optimization suggestions
    if (analysis.optimizationSuggestions.length > 0) {
      suggestions.push({
        id: 'optimization',
        type: 'optimization',
        title: 'Performance Tips',
        description: 'We noticed some patterns that could help optimize your experience.',
        confidence: 0.6,
        action: () => setShowSuggestions(true),
        icon: TrendingUp
      })
    }

    setSmartSuggestions(suggestions)
  }

  // Predictive preloading
  useEffect(() => {
    if (!predictedNextAction) return

    // Preload the predicted page
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = predictedNextAction
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(link)
    }
  }, [predictedNextAction])

  // Smart content adaptation
  const adaptContent = useCallback((element: HTMLElement) => {
    if (userBehavior.preferences.highContrast) {
      element.classList.add('high-contrast')
    }
    
    if (userBehavior.preferences.largeText) {
      element.style.fontSize = '18px'
    }
    
    if (userBehavior.preferences.reducedMotion) {
      element.style.animation = 'none'
    }
  }, [userBehavior.preferences])

  // Auto-adapt content on page load
  useEffect(() => {
    const adaptAllContent = () => {
      const contentElements = document.querySelectorAll('[data-adaptable]')
      contentElements.forEach(adaptContent)
    }

    adaptAllContent()
    
    const observer = new MutationObserver(adaptAllContent)
    observer.observe(document.body, { childList: true, subtree: true })
    
    return () => observer.disconnect()
  }, [adaptContent])

  const handleSuggestionClick = (suggestion: SmartSuggestion) => {
    // Track suggestion interaction
    setUserBehavior(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [`suggestion_${suggestion.id}`]: true
      }
    }))
    
    suggestion.action()
  }

  return (
    <>
      {children}
      
      {/* Smart Suggestions Panel */}
      <AnimatePresence>
        {smartSuggestions.length > 0 && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 max-w-sm"
          >
            <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-semibold">AI Suggestions</h3>
                </div>
                <button
                  onClick={() => setSmartSuggestions([])}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                {smartSuggestions.map((suggestion) => (
                  <motion.button
                    key={suggestion.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <suggestion.icon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-white text-sm font-medium">{suggestion.title}</h4>
                        <p className="text-white/70 text-xs mt-1">{suggestion.description}</p>
                        <div className="flex items-center mt-2">
                          <div className="flex-1 bg-white/20 rounded-full h-1">
                            <div 
                              className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${suggestion.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-white/60 text-xs ml-2">
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Learning Indicator */}
      {isLearning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-4 left-4 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 flex items-center space-x-2 z-40"
        >
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="text-white text-sm">AI Learning...</span>
        </motion.div>
      )}

      {/* Predictive Loading Indicator */}
      {predictedNextAction && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-blue-500/20 border border-blue-500/30 rounded-lg px-3 py-2 text-blue-400 text-sm z-40"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span>Preloading next action...</span>
          </div>
        </motion.div>
      )}
    </>
  )
}

// Utility function for throttling
function throttle<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0

  return ((...args: any[]) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func(...args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }) as T
}
