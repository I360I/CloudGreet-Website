export class Metrics {
  static track(event: string, properties?: Record<string, unknown>) {
    // Track with Google Analytics if available
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, {
        event_category: 'CloudGreet',
        ...properties
      })
    }
    
    // Track with custom metrics endpoint
    fetch('/api/metrics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        event, 
        properties, 
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    }).catch(() => {
      // Silently fail if metrics tracking fails
    })
  }
  
  static timing(metric: string, duration: number) {
    this.track('performance_metric', { 
      metric, 
      duration,
      category: 'performance'
    })
  }

  static pageView(page: string) {
    this.track('page_view', { 
      page,
      category: 'navigation'
    })
  }

  static userAction(action: string, context?: Record<string, unknown>) {
    this.track('user_action', { 
      action,
      ...context,
      category: 'engagement'
    })
  }

  static error(error: string, context?: Record<string, unknown>) {
    this.track('error', { 
      error,
      ...context,
      category: 'error'
    })
  }

  static callEvent(event: string, callData?: Record<string, unknown>) {
    this.track('call_event', { 
      event,
      ...callData,
      category: 'calls'
    })
  }

  static businessEvent(event: string, businessData?: Record<string, unknown>) {
    this.track('business_event', { 
      event,
      ...businessData,
      category: 'business'
    })
  }

  static performanceMetric(metric: string, value: number, context?: Record<string, unknown>) {
    this.track('performance_metric', { 
      metric,
      value,
      ...context,
      category: 'performance'
    })
  }

  static conversionEvent(event: string, value?: number, context?: Record<string, unknown>) {
    this.track('conversion', { 
      event,
      value,
      ...context,
      category: 'conversion'
    })
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static marks = new Map<string, number>()

  static mark(name: string) {
    this.marks.set(name, performance.now())
  }

  static measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark)
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (!start) return

    const end = endMark ? this.marks.get(endMark) : performance.now()
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (!end) return

    const duration = end - start
    Metrics.timing(name, duration)
    return duration
  }

  static measurePageLoad() {
    /**
     * if - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.if(param1, param2)
     * ```
     */
    if (typeof window === 'undefined') return

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      Metrics.performanceMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart)
      Metrics.performanceMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart)
      Metrics.performanceMetric('first_paint', navigation.responseEnd - navigation.fetchStart)
    })
  }

  static measureAPIResponse(endpoint: string, duration: number) {
    Metrics.performanceMetric('api_response_time', duration, { endpoint })
  }

  static measureComponentRender(component: string, duration: number) {
    Metrics.performanceMetric('component_render_time', duration, { component })
  }
}

// Business metrics
export class BusinessMetrics {
  static trackCallInitiated(phoneNumber: string, businessId: string) {
    Metrics.callEvent('call_initiated', { phoneNumber, businessId })
  }

  static trackCallAnswered(callId: string, duration: number) {
    Metrics.callEvent('call_answered', { callId, duration })
  }

  static trackCallCompleted(callId: string, duration: number, sentiment?: string) {
    Metrics.callEvent('call_completed', { callId, duration, sentiment })
  }

  static trackAppointmentBooked(appointmentId: string, businessId: string) {
    Metrics.businessEvent('appointment_booked', { appointmentId, businessId })
    Metrics.conversionEvent('appointment_booking', undefined, { businessId })
  }

  static trackLeadConverted(leadId: string, businessId: string) {
    Metrics.businessEvent('lead_converted', { leadId, businessId })
    Metrics.conversionEvent('lead_conversion', undefined, { businessId })
  }

  static trackRevenueGenerated(businessId: string, amount: number) {
    Metrics.businessEvent('revenue_generated', { businessId, amount })
    Metrics.conversionEvent('revenue', amount, { businessId })
  }

  static trackDashboardView(businessId: string, section: string) {
    Metrics.businessEvent('dashboard_view', { businessId, section })
  }

  static trackSettingsUpdate(businessId: string, setting: string) {
    Metrics.businessEvent('settings_update', { businessId, setting })
  }
}

// User engagement metrics
export class EngagementMetrics {
  static trackLogin(userId: string, method: string = 'email') {
    Metrics.userAction('login', { userId, method })
  }

  static trackLogout(userId: string) {
    Metrics.userAction('logout', { userId })
  }

  static trackFeatureUsage(feature: string, userId: string, context?: Record<string, unknown>) {
    Metrics.userAction('feature_usage', { feature, userId, ...context })
  }

  static trackSearch(query: string, results: number) {
    Metrics.userAction('search', { query, results })
  }

  static trackExport(type: string, format: string) {
    Metrics.userAction('export', { type, format })
  }

  static trackShare(content: string, method: string) {
    Metrics.userAction('share', { content, method })
  }
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  PerformanceMonitor.measurePageLoad()
}

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
  }
}