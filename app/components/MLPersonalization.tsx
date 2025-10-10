'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, TrendingUp, Target, Users, BarChart3, Sparkles } from 'lucide-react'

interface MLPersonalizationProps {
  children: React.ReactNode
}

interface UserProfile {
  id: string
  behaviorPatterns: {
    clickPatterns: string[]
    scrollPatterns: number[]
    timeSpent: { [page: string]: number }
    navigationFlow: string[]
    deviceType: string
    sessionLength: number
  }
  preferences: {
    contentType: 'visual' | 'text' | 'mixed'
    interactionStyle: 'quick' | 'exploratory' | 'detailed'
    featureInterest: string[]
    painPoints: string[]
  }
  predictions: {
    nextAction: string
    churnRisk: number
    featureInterest: { [feature: string]: number }
    optimalContent: string[]
  }
}

interface Recommendation {
  id: string
  type: 'content' | 'feature' | 'action' | 'optimization'
  title: string
  description: string
  confidence: number
  priority: 'high' | 'medium' | 'low'
  reasoning: string
  action: () => void
  icon: React.ComponentType<any>
}

export default function MLPersonalization({ children }: MLPersonalizationProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [mlInsights, setMlInsights] = useState({
    engagementScore: 0,
    conversionProbability: 0,
    optimalTiming: '',
    suggestedImprovements: [] as string[]
  })

  const behaviorDataRef = useRef({
    clicks: [] as Array<{ element: string; timestamp: number; page: string }>,
    scrolls: [] as Array<{ position: number; timestamp: number; page: string }>,
    timeSpent: {} as { [page: string]: number },
    navigation: [] as string[],
    sessionStart: Date.now()
  })

  // Collect user behavior data
  useEffect(() => {
    const trackBehavior = () => {
      const currentPage = window.location.pathname
      const currentTime = Date.now()

      // Track clicks
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        const element = target.tagName.toLowerCase()
        
        behaviorDataRef.current.clicks.push({
          element,
          timestamp: currentTime,
          page: currentPage
        })
      }

      // Track scrolls
      const handleScroll = throttle((e: Event) => {
        const scrollTop = window.scrollY
        behaviorDataRef.current.scrolls.push({
          position: scrollTop,
          timestamp: currentTime,
          page: currentPage
        })
      }, 1000)

      // Track time spent
      const updateTimeSpent = () => {
        const timeSpent = currentTime - (behaviorDataRef.current.sessionStart)
        behaviorDataRef.current.timeSpent[currentPage] = 
          (behaviorDataRef.current.timeSpent[currentPage] || 0) + timeSpent
      }

      // Track navigation
      const trackNavigation = () => {
        behaviorDataRef.current.navigation.push(currentPage)
      }

      document.addEventListener('click', handleClick)
      window.addEventListener('scroll', handleScroll)
      const timeInterval = setInterval(updateTimeSpent, 5000)

      trackNavigation()

      return () => {
        document.removeEventListener('click', handleClick)
        window.removeEventListener('scroll', handleScroll)
        clearInterval(timeInterval)
      }
    }

    const cleanup = trackBehavior()
    return cleanup
  }, [])

  // ML Analysis Engine
  const analyzeUserBehavior = useCallback(async () => {
    setIsAnalyzing(true)
    
    // Simulate ML analysis (in real app, this would call ML API)
    const analysis = await new Promise<any>((resolve) => {
      setTimeout(() => {
        const behavior = behaviorDataRef.current
        
        // Calculate engagement metrics
        const totalClicks = behavior.clicks.length
        const totalScrolls = behavior.scrolls.length
        const avgTimePerPage = Object.values(behavior.timeSpent).reduce((a, b) => a + b, 0) / Object.keys(behavior.timeSpent).length
        const uniquePages = new Set(behavior.navigation).size
        
        // ML-powered user profiling
        const userProfile: UserProfile = {
          id: `user_${Date.now()}`,
          behaviorPatterns: {
            clickPatterns: behavior.clicks.map(c => c.element),
            scrollPatterns: behavior.scrolls.map(s => s.position),
            timeSpent: behavior.timeSpent,
            navigationFlow: behavior.navigation,
            deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
            sessionLength: Date.now() - behavior.sessionStart
          },
          preferences: {
            contentType: totalClicks > 10 ? 'visual' : 'text',
            interactionStyle: avgTimePerPage > 30000 ? 'detailed' : 'quick',
            featureInterest: extractFeatureInterest(behavior.clicks),
            painPoints: identifyPainPoints(behavior)
          },
          predictions: {
            nextAction: predictNextAction(behavior.navigation),
            churnRisk: calculateChurnRisk(behavior),
            featureInterest: calculateFeatureInterest(behavior.clicks),
            optimalContent: generateOptimalContent(behavior)
          }
        }

        resolve({
          userProfile,
          insights: {
            engagementScore: calculateEngagementScore(behavior),
            conversionProbability: calculateConversionProbability(behavior),
            optimalTiming: calculateOptimalTiming(behavior),
            suggestedImprovements: generateImprovements(behavior)
          }
        })
      }, 2000)
    })

    setUserProfile(analysis.userProfile)
    setMlInsights(analysis.insights)
    generateRecommendations(analysis.userProfile, analysis.insights)
    setIsAnalyzing(false)
  }, [])

  // ML Helper Functions
  const extractFeatureInterest = (clicks: Array<{ element: string; page: string }>): string[] => {
    const featureMap: { [key: string]: string[] } = {
      'test-agent': ['AI Testing', 'Voice Features'],
      'billing': ['Pricing', 'Payment'],
      'settings': ['Customization', 'Configuration'],
      'dashboard': ['Analytics', 'Overview']
    }

    const interests = new Set<string>()
    clicks.forEach(click => {
      const features = featureMap[click.page] || []
      features.forEach(feature => interests.add(feature))
    })

    return Array.from(interests)
  }

  const identifyPainPoints = (behavior: any): string[] => {
    const painPoints = []
    
    if (behavior.clicks.some((c: any) => c.element === 'button' && c.timestamp > Date.now() - 5000)) {
      painPoints.push('Difficulty finding actions')
    }
    
    if (behavior.scrolls.length > 20) {
      painPoints.push('Information discovery challenges')
    }
    
    if (Object.values(behavior.timeSpent).some((time: any) => time > 60000)) {
      painPoints.push('Complex decision making')
    }

    return painPoints
  }

  const predictNextAction = (navigation: string[]): string => {
    const currentPage = navigation[navigation.length - 1]
    const patterns = {
      '/': '/dashboard',
      '/dashboard': '/test-agent',
      '/pricing': '/start',
      '/start': '/dashboard'
    }
    
    return patterns[currentPage as keyof typeof patterns] || '/dashboard'
  }

  const calculateChurnRisk = (behavior: any): number => {
    let risk = 0
    
    if (behavior.sessionStart < Date.now() - 300000) risk += 0.3 // 5+ minutes
    if (behavior.clicks.length < 3) risk += 0.4 // Low engagement
    if (Object.keys(behavior.timeSpent).length < 2) risk += 0.3 // Single page
    
    return Math.min(1, risk)
  }

  const calculateFeatureInterest = (clicks: Array<{ page: string }>): { [feature: string]: number } => {
    const interest: { [feature: string]: number } = {}
    
    clicks.forEach(click => {
      interest[click.page] = (interest[click.page] || 0) + 1
    })
    
    return interest
  }

  const generateOptimalContent = (behavior: any): string[] => {
    const content = []
    
    if (behavior.clicks.length > 10) {
      content.push('Interactive demos')
    }
    
    if (behavior.scrolls.some((s: any) => s.position > 1000)) {
      content.push('Detailed explanations')
    }
    
    return content
  }

  const calculateEngagementScore = (behavior: any): number => {
    const clicks = behavior.clicks.length
    const scrolls = behavior.scrolls.length
    const timeValues = Object.values(behavior.timeSpent) as number[]
    const avgTime = timeValues.length > 0 ? timeValues.reduce((a: number, b: number) => a + b, 0) / timeValues.length : 0
    
    return Math.min(100, (clicks * 3 + scrolls * 1 + avgTime / 1000) / 5)
  }

  const calculateConversionProbability = (behavior: any): number => {
    let probability = 0.1
    
    if (behavior.clicks.some((c: any) => c.page === '/pricing')) probability += 0.3
    if (behavior.clicks.some((c: any) => c.page === '/start')) probability += 0.4
    if (Object.values(behavior.timeSpent).some((time: any) => time > 60000)) probability += 0.2
    
    return Math.min(1, probability)
  }

  const calculateOptimalTiming = (behavior: any): string => {
    const hour = new Date().getHours()
    
    if (hour >= 9 && hour <= 17) return 'Business hours - optimal for demos'
    if (hour >= 18 && hour <= 22) return 'Evening - good for detailed exploration'
    return 'Off-peak hours - casual browsing'
  }

  const generateImprovements = (behavior: any): string[] => {
    const improvements = []
    
    if (behavior.clicks.length < 5) {
      improvements.push('Increase interactive elements')
    }
    
    if (behavior.scrolls.length > 30) {
      improvements.push('Improve information hierarchy')
    }
    
    return improvements
  }

  // Generate personalized recommendations
  const generateRecommendations = useCallback((profile: UserProfile, insights: any) => {
    const recs: Recommendation[] = []

    // High engagement user
    if (insights.engagementScore > 70) {
      recs.push({
        id: 'advanced-features',
        type: 'feature',
        title: 'Explore Advanced Features',
        description: 'You show high engagement. Try our advanced AI customization options.',
        confidence: 0.9,
        priority: 'high',
        reasoning: 'High engagement score indicates readiness for advanced features',
        action: () => window.location.href = '/settings',
        icon: Brain
      })
    }

    // Conversion-focused user
    if (insights.conversionProbability > 0.6) {
      recs.push({
        id: 'conversion-optimization',
        type: 'action',
        title: 'Complete Your Setup',
        description: 'You\'re close to converting! Complete your AI agent setup.',
        confidence: 0.85,
        priority: 'high',
        reasoning: 'High conversion probability detected',
        action: () => window.location.href = '/start',
        icon: Target
      })
    }

    // Churn risk user
    if (profile.predictions.churnRisk > 0.7) {
      recs.push({
        id: 'retention-focus',
        type: 'content',
        title: 'Need Help Getting Started?',
        description: 'Let us help you get the most out of CloudGreet.',
        confidence: 0.8,
        priority: 'high',
        reasoning: 'High churn risk detected - intervention needed',
        action: () => window.location.href = '/help',
        icon: TrendingUp
      })
    }

    // Feature interest recommendations
    Object.entries(profile.predictions.featureInterest).forEach(([feature, score]) => {
      if (score > 2) {
        recs.push({
          id: `feature-${feature}`,
          type: 'feature',
          title: `Explore ${feature}`,
          description: `Based on your behavior, you might be interested in ${feature}.`,
          confidence: 0.7,
          priority: 'medium',
          reasoning: `High interest in ${feature} detected`,
          action: () => window.location.href = `/${feature}`,
          icon: Sparkles
        })
      }
    })

    setRecommendations(recs)
  }, [])

  // Run analysis when enough data is collected
  useEffect(() => {
    const behavior = behaviorDataRef.current
    
    if (behavior.clicks.length >= 10 || Object.keys(behavior.timeSpent).length >= 3) {
      analyzeUserBehavior()
    }
  }, [analyzeUserBehavior])

  // Auto-adapt UI based on ML insights
  useEffect(() => {
    if (!userProfile) return

    // Adapt content based on user preferences
    const contentElements = document.querySelectorAll('[data-personalizable]')
    contentElements.forEach(element => {
      const htmlElement = element as HTMLElement
      
      if (userProfile.preferences.contentType === 'visual') {
        htmlElement.classList.add('visual-focused')
      }
      
      if (userProfile.preferences.interactionStyle === 'quick') {
        htmlElement.classList.add('quick-interaction')
      }
    })
  }, [userProfile])

  return (
    <>
      {children}
      
      {/* ML Analysis Indicator */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-4 right-4 bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-2 flex items-center space-x-2 z-50"
          >
            <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-purple-400 text-sm">AI Analyzing...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ML Recommendations Panel */}
      <AnimatePresence>
        {recommendations.length > 0 && showRecommendations && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-black/90 backdrop-blur-sm border border-white/20 rounded-xl p-4 max-w-sm z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <span>AI Insights</span>
              </h3>
              <button
                onClick={() => setShowRecommendations(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recommendations.map((rec) => (
                <motion.button
                  key={rec.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (rec.action && typeof rec.action === 'function') {
                      rec.action()
                    }
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    rec.priority === 'high' 
                      ? 'bg-red-500/20 border border-red-500/30 hover:bg-red-500/30' 
                      : rec.priority === 'medium'
                      ? 'bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/30'
                      : 'bg-white/10 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <rec.icon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-white text-sm font-medium">{rec.title}</h4>
                      <p className="text-white/70 text-xs mt-1">{rec.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <div className="flex-1 bg-white/20 rounded-full h-1">
                          <div 
                            className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${rec.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-white/60 text-xs">
                          {Math.round(rec.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
            
            {userProfile && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="text-white/60 text-xs space-y-1">
                  <p><strong>Engagement:</strong> {mlInsights.engagementScore.toFixed(0)}%</p>
                  <p><strong>Conversion Risk:</strong> {(mlInsights.conversionProbability * 100).toFixed(0)}%</p>
                  <p><strong>Timing:</strong> {mlInsights.optimalTiming}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ML Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowRecommendations(!showRecommendations)}
        className="fixed bottom-32 left-4 w-12 h-12 bg-black/80 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center z-50"
        title="AI Insights"
      >
        <Brain className="w-5 h-5 text-purple-400" />
      </motion.button>

      {/* ML Personalization Styles */}
      <style jsx global>{`
        .visual-focused {
          /* Enhanced visual elements for visual learners */
        }
        
        .quick-interaction {
          /* Streamlined interactions for quick users */
        }
        
        [data-personalizable] {
          transition: all 0.3s ease-out;
        }
      `}</style>
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
