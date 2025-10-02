'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  timestamp?: number
  userId?: string
  sessionId?: string
}

interface AnalyticsContextType {
  track: (event: string, properties?: Record<string, any>) => void
  identify: (userId: string, traits?: Record<string, any>) => void
  page: (name: string, properties?: Record<string, any>) => void
  flush: () => Promise<void>
  isEnabled: boolean
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

interface AnalyticsProviderProps {
  children: React.ReactNode
  enabled?: boolean
  apiKey?: string
}

export function AnalyticsProvider({ 
  children, 
  enabled = true,
  apiKey 
}: AnalyticsProviderProps) {
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [userId, setUserId] = useState<string | null>(null)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [isOnline, setIsOnline] = useState(true)

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-flush events when online
  useEffect(() => {
    if (isOnline && events.length > 0) {
      flush()
    }
  }, [isOnline, events.length])

  // Track user interactions
  useEffect(() => {
    if (!isEnabled) return

    const trackClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const button = target.closest('button, a, [role="button"]')
      
      if (button) {
        const text = button.textContent?.trim() || ''
        const href = (button as HTMLAnchorElement).href
        const role = button.getAttribute('role')
        
        track('click', {
          element: 'button',
          text: text.substring(0, 100),
          href: href || undefined,
          role: role || undefined,
          xpath: getXPath(target)
        })
      }
    }

    const trackScroll = throttle(() => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      )
      
      if (scrollPercent % 25 === 0) {
        track('scroll', { percent: scrollPercent })
      }
    }, 1000)

    const trackResize = throttle(() => {
      track('resize', {
        width: window.innerWidth,
        height: window.innerHeight
      })
    }, 1000)

    document.addEventListener('click', trackClick, { passive: true })
    window.addEventListener('scroll', trackScroll, { passive: true })
    window.addEventListener('resize', trackResize, { passive: true })

    return () => {
      document.removeEventListener('click', trackClick)
      window.removeEventListener('scroll', trackScroll)
      window.removeEventListener('resize', trackResize)
    }
  }, [isEnabled])

  const track = useCallback((event: string, properties?: Record<string, any>) => {
    if (!isEnabled) return

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        screen: {
          width: window.screen.width,
          height: window.screen.height
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      userId,
      sessionId
    }

    setEvents(prev => [...prev, analyticsEvent])

    // Send immediately for critical events
    if (['signup', 'login', 'purchase', 'error'].includes(event)) {
      sendEvent(analyticsEvent)
    }
  }, [isEnabled, userId, sessionId])

  const identify = useCallback((newUserId: string, traits?: Record<string, any>) => {
    if (!isEnabled) return

    setUserId(newUserId)
    
    const identifyEvent: AnalyticsEvent = {
      event: 'identify',
      properties: {
        userId: newUserId,
        traits,
        timestamp: Date.now()
      },
      userId: newUserId,
      sessionId
    }

    sendEvent(identifyEvent)
  }, [isEnabled, sessionId])

  const page = useCallback((name: string, properties?: Record<string, any>) => {
    if (!isEnabled) return

    track('page_view', {
      page: name,
      ...properties
    })
  }, [track])

  const sendEvent = async (event: AnalyticsEvent) => {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(event)
      })
    } catch (error) {
      console.warn('Failed to send analytics event:', error)
      // Store in localStorage for retry later
      const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]')
      storedEvents.push(event)
      localStorage.setItem('analytics_events', JSON.stringify(storedEvents.slice(-100))) // Keep last 100
    }
  }

  const flush = useCallback(async () => {
    if (!isEnabled || events.length === 0) return

    try {
      await Promise.all(events.map(sendEvent))
      setEvents([])
      
      // Also flush any stored events
      const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]')
      if (storedEvents.length > 0) {
        await Promise.all(storedEvents.map(sendEvent))
        localStorage.removeItem('analytics_events')
      }
    } catch (error) {
      console.warn('Failed to flush analytics events:', error)
    }
  }, [events, isEnabled, sendEvent])

  // Auto-flush every 30 seconds
  useEffect(() => {
    if (!isEnabled) return

    const interval = setInterval(flush, 30000)
    return () => clearInterval(interval)
  }, [flush, isEnabled])

  // Flush on page unload
  useEffect(() => {
    if (!isEnabled) return

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery on page unload
      if (events.length > 0 && 'sendBeacon' in navigator) {
        const data = JSON.stringify(events)
        navigator.sendBeacon('/api/analytics/track', data)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [events, isEnabled])

  const value: AnalyticsContextType = {
    track,
    identify,
    page,
    flush,
    isEnabled
  }

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}

// Helper functions
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

function getXPath(element: HTMLElement): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`
  }

  if (element === document.body) {
    return '/html/body'
  }

  let ix = 0
  const siblings = element.parentNode?.childNodes || []
  
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i] as HTMLElement
    if (sibling === element) {
      return `${getXPath(element.parentNode as HTMLElement)}/${element.tagName.toLowerCase()}[${ix + 1}]`
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++
    }
  }

  return ''
}

// HOC for automatic page tracking
export function withAnalytics<P extends object>(
  Component: React.ComponentType<P>,
  pageName?: string
) {
  const WrappedComponent = (props: P) => {
    const { page } = useAnalytics()

    useEffect(() => {
      if (pageName) {
        page(pageName)
      }
    }, [page])

    return <Component {...props} />
  }

  WrappedComponent.displayName = `withAnalytics(${Component.displayName || Component.name})`
  
  return WrappedComponent
}
