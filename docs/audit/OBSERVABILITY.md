# CloudGreet Observability Audit

## 📊 Current State Assessment

### ✅ Implemented
- Basic health check endpoint (`/api/health`)
- Structured logging with `lib/monitoring.ts`
- Error tracking in some API routes
- Database connection monitoring

### ❌ Missing Critical Components
- Centralized error tracking (Sentry)
- Performance monitoring
- Real-time alerting
- Log aggregation and analysis
- User behavior tracking
- Business metrics monitoring

## 🎯 Observability Requirements

### Error Tracking & Logging

#### Current Implementation
```typescript
// lib/monitoring.ts - Basic logger
export const logger = {
  info: (message: string, context?: any) => console.log(message, context),
  error: (message: string, error: Error, context?: any) => console.error(message, error, context),
  warn: (message: string, context?: any) => console.warn(message, context)
}
```

#### Required Enhancements
1. **Structured Logging**
   - JSON format for all logs
   - Correlation IDs for request tracing
   - Log levels (DEBUG, INFO, WARN, ERROR, FATAL)
   - Contextual information (user_id, business_id, request_id)

2. **Error Tracking**
   - Sentry integration for error collection
   - Error grouping and deduplication
   - Error context and stack traces
   - Performance impact tracking

3. **Log Aggregation**
   - Centralized log storage
   - Log search and filtering
   - Log retention policies
   - Log-based alerting

### Performance Monitoring

#### Core Web Vitals
- **LCP (Largest Contentful Paint)**: <2.5s
- **CLS (Cumulative Layout Shift)**: <0.1
- **INP (Interaction to Next Paint)**: <200ms
- **FID (First Input Delay)**: <100ms

#### Application Performance
- **API Response Times**: <500ms (95th percentile)
- **Database Query Times**: <100ms (95th percentile)
- **Page Load Times**: <3s (95th percentile)
- **Bundle Size**: <500KB (gzipped)

#### Infrastructure Metrics
- **CPU Usage**: <70% average
- **Memory Usage**: <80% average
- **Database Connections**: <80% of pool
- **CDN Hit Rate**: >90%

### Business Metrics

#### Revenue Metrics
- **Monthly Recurring Revenue (MRR)**
- **Customer Acquisition Cost (CAC)**
- **Customer Lifetime Value (CLV)**
- **Churn Rate**
- **Average Revenue Per User (ARPU)**

#### Product Metrics
- **User Registration Rate**
- **Onboarding Completion Rate**
- **Feature Adoption Rate**
- **User Engagement Score**
- **Support Ticket Volume**

#### Technical Metrics
- **System Uptime**: >99.9%
- **Error Rate**: <0.1%
- **API Success Rate**: >99.5%
- **Database Uptime**: >99.9%
- **External Service Uptime**: >99.5%

## 🔧 Implementation Plan

### Phase 1: Error Tracking (Day 1-2)

#### 1.1 Sentry Integration
```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter out sensitive data
    if (event.user) {
      delete event.user.email
    }
    return event
  }
})

export { Sentry }
```

#### 1.2 Enhanced Logging
```typescript
// lib/logger.ts
import { logger } from './monitoring'
import { Sentry } from './sentry'

export class Logger {
  private correlationId: string

  constructor(correlationId?: string) {
    this.correlationId = correlationId || this.generateId()
  }

  info(message: string, context?: any) {
    const logEntry = {
      level: 'INFO',
      message,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      context
    }
    console.log(JSON.stringify(logEntry))
  }

  error(message: string, error: Error, context?: any) {
    const logEntry = {
      level: 'ERROR',
      message,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    }
    console.error(JSON.stringify(logEntry))
    Sentry.captureException(error, { extra: context })
  }
}
```

### Phase 2: Performance Monitoring (Day 3-4)

#### 2.1 Web Vitals Tracking
```typescript
// lib/analytics.ts
export function trackWebVitals() {
  if (typeof window !== 'undefined') {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(metric => sendToAnalytics('CLS', metric))
      getFID(metric => sendToAnalytics('FID', metric))
      getFCP(metric => sendToAnalytics('FCP', metric))
      getLCP(metric => sendToAnalytics('LCP', metric))
      getTTFB(metric => sendToAnalytics('TTFB', metric))
    })
  }
}

function sendToAnalytics(name: string, metric: any) {
  // Send to analytics service
  console.log(`${name}:`, metric.value)
}
```

#### 2.2 API Performance Monitoring
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { Logger } from './lib/logger'

export function middleware(request: NextRequest) {
  const start = Date.now()
  const correlationId = request.headers.get('x-correlation-id') || generateId()
  const logger = new Logger(correlationId)

  // Add correlation ID to headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-correlation-id', correlationId)

  const response = NextResponse.next({
    request: { headers: requestHeaders }
  })

  // Log request
  logger.info('API Request', {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent')
  })

  // Log response time
  response.headers.set('x-response-time', `${Date.now() - start}ms`)

  return response
}
```

### Phase 3: Business Metrics (Day 5-6)

#### 3.1 Revenue Tracking
```typescript
// lib/metrics.ts
export class MetricsCollector {
  static async trackRevenue(amount: number, currency: string, businessId: string) {
    // Track revenue metrics
    console.log('Revenue tracked:', { amount, currency, businessId })
  }

  static async trackUserRegistration(userId: string, businessId: string) {
    // Track user registration
    console.log('User registered:', { userId, businessId })
  }

  static async trackFeatureUsage(feature: string, userId: string) {
    // Track feature usage
    console.log('Feature used:', { feature, userId })
  }
}
```

#### 3.2 User Behavior Tracking
```typescript
// lib/analytics.ts
export function trackEvent(eventName: string, properties?: any) {
  if (typeof window !== 'undefined') {
    // Send to analytics service
    console.log('Event tracked:', { eventName, properties })
  }
}

export function trackPageView(page: string) {
  trackEvent('page_view', { page })
}

export function trackUserAction(action: string, context?: any) {
  trackEvent('user_action', { action, ...context })
}
```

### Phase 4: Alerting & Dashboards (Day 7)

#### 4.1 Alert Configuration
```typescript
// lib/alerts.ts
export const AlertConfig = {
  errorRate: {
    threshold: 0.01, // 1%
    window: '5m',
    action: 'page_team'
  },
  responseTime: {
    threshold: 1000, // 1s
    window: '5m',
    action: 'page_team'
  },
  uptime: {
    threshold: 0.99, // 99%
    window: '1h',
    action: 'page_team'
  }
}
```

#### 4.2 Dashboard Configuration
```typescript
// lib/dashboard.ts
export const DashboardConfig = {
  overview: {
    metrics: ['uptime', 'error_rate', 'response_time', 'throughput'],
    timeRange: '24h'
  },
  performance: {
    metrics: ['lcp', 'cls', 'fid', 'ttfb'],
    timeRange: '7d'
  },
  business: {
    metrics: ['mrr', 'cac', 'clv', 'churn_rate'],
    timeRange: '30d'
  }
}
```

## 📈 SLIs and SLOs

### Service Level Indicators (SLIs)

#### Availability SLI
- **Target**: 99.9% uptime
- **Measurement**: HTTP 200 responses / Total requests
- **Window**: 30 days

#### Performance SLI
- **Target**: 95% of requests <500ms
- **Measurement**: Response time percentiles
- **Window**: 7 days

#### Error Rate SLI
- **Target**: <0.1% error rate
- **Measurement**: 5xx responses / Total requests
- **Window**: 7 days

### Service Level Objectives (SLOs)

#### Availability SLO
- **Target**: 99.9% uptime
- **Consequence**: If missed, reduce feature velocity for 1 week

#### Performance SLO
- **Target**: 95% of requests <500ms
- **Consequence**: If missed, optimize performance for 1 week

#### Error Rate SLO
- **Target**: <0.1% error rate
- **Consequence**: If missed, focus on stability for 1 week

## 🚨 Alerting Strategy

### Critical Alerts (Immediate Response)
- **System Down**: Uptime <95%
- **High Error Rate**: Error rate >1%
- **Database Down**: Database connectivity lost
- **Payment Processing Down**: Stripe API failures

### Warning Alerts (Response within 1 hour)
- **High Response Time**: 95th percentile >1s
- **High Memory Usage**: Memory usage >80%
- **High CPU Usage**: CPU usage >80%
- **Low Disk Space**: Disk usage >90%

### Info Alerts (Monitor trends)
- **Unusual Traffic**: Traffic >200% of normal
- **New Error Types**: New error patterns detected
- **Performance Degradation**: Gradual performance decline

## 📊 Monitoring Tools

### Recommended Stack
1. **Error Tracking**: Sentry
2. **Performance Monitoring**: Vercel Analytics + Custom
3. **Log Aggregation**: Vercel Logs + External service
4. **Uptime Monitoring**: UptimeRobot
5. **Business Metrics**: Custom dashboard

### Implementation Timeline
- **Week 1**: Sentry integration, basic logging
- **Week 2**: Performance monitoring, Web Vitals
- **Week 3**: Business metrics, user tracking
- **Week 4**: Alerting, dashboards, SLOs

## 🔍 Troubleshooting Guide

### Common Issues
1. **High Error Rate**: Check logs for error patterns
2. **Slow Response Times**: Check database queries, external APIs
3. **Memory Leaks**: Check for unclosed connections, event listeners
4. **Database Issues**: Check connection pool, query performance

### Debugging Steps
1. Check correlation IDs in logs
2. Review error context and stack traces
3. Analyze performance metrics
4. Check external service status
5. Review recent deployments

## 📞 Escalation Procedures

### Level 1: Automated Response
- Auto-scaling triggered
- Error rate alerts sent
- Performance degradation detected

### Level 2: Team Notification
- Slack alerts sent
- On-call engineer notified
- Incident channel created

### Level 3: Management Escalation
- CTO notified
- Customer communication
- Post-mortem scheduled
