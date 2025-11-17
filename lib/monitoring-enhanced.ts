import { logger } from './monitoring'

/**
 * Enhanced Monitoring with Sentry and Alerting
 * 
 * To enable Sentry:
 * 1. Install: npm install @sentry/nextjs
 * 2. Set NEXT_PUBLIC_SENTRY_DSN environment variable
 * 3. Initialize in next.config.js (see docs)
 * 
 * To enable Slack alerts:
 * 1. Set SLACK_WEBHOOK_URL environment variable
 * 2. Create webhook at https://api.slack.com/apps
 */

export interface AlertOptions {
  severity?: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, any>
  tags?: string[]
  userId?: string
  businessId?: string
}

/**
 * Send alert to Slack (if configured)
 */
async function sendSlackAlert(
  title: string,
  message: string,
  options?: AlertOptions
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    return // Slack not configured
  }

  try {
    const severity = options?.severity || 'medium'
    const colorMap: Record<string, string> = {
      low: '#36a64f',      // Green
      medium: '#ffa500',   // Orange
      high: '#ff0000',     // Red
      critical: '#8b0000'  // Dark red
    }

    const payload = {
      text: title,
      attachments: [
        {
          color: colorMap[severity],
          fields: [
            {
              title: 'Message',
              value: message,
              short: false
            },
            ...(options?.context ? Object.entries(options.context).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true
            })) : []),
            ...(options?.tags ? [{
              title: 'Tags',
              value: options.tags.join(', '),
              short: true
            }] : []),
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true
            }
          ],
          footer: 'CloudGreet Monitoring',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (error) {
    logger.error('Failed to send Slack alert', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Send error to Sentry (if configured)
 */
function sendToSentry(error: Error, options?: AlertOptions): void {
  try {
    // Dynamic import to avoid errors if Sentry not installed
    if (typeof window !== 'undefined') {
      // Client-side Sentry
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, {
          level: options?.severity === 'critical' ? 'fatal' : 'error',
          tags: options?.tags,
          user: options?.userId ? { id: options.userId } : undefined,
          contexts: {
            business: options?.businessId ? { id: options.businessId } : undefined,
            custom: options?.context
          }
        })
      }).catch(() => {
        // Sentry not installed or not configured
      })
    } else {
      // Server-side Sentry
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, {
          level: options?.severity === 'critical' ? 'fatal' : 'error',
          tags: options?.tags,
          user: options?.userId ? { id: options.userId } : undefined,
          contexts: {
            business: options?.businessId ? { id: options.businessId } : undefined,
            custom: options?.context
          }
        })
      }).catch(() => {
        // Sentry not installed or not configured
      })
    }
  } catch (error) {
    // Sentry not available
    logger.debug('Sentry not available', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Enhanced error reporting with Sentry and Slack
 */
export function reportError(
  error: Error | string,
  options?: AlertOptions
): void {
  const errorObj = error instanceof Error ? error : new Error(error)
  const message = errorObj.message

  // Log to console (always)
  logger.error(message, {
    ...options?.context,
    severity: options?.severity,
    tags: options?.tags,
    stack: errorObj.stack
  })

  // Send to Sentry (if configured)
  if (options?.severity === 'high' || options?.severity === 'critical') {
    sendToSentry(errorObj, options)
  }

  // Send to Slack (if configured and severity is medium+)
  if (options?.severity !== 'low') {
    sendSlackAlert(
      `Error Alert: ${message}`,
      errorObj.stack || message,
      options
    ).catch(() => {
      // Slack alert failed, but don't throw
    })
  }
}

/**
 * Report critical system error
 */
export function reportCriticalError(
  error: Error | string,
  context?: Record<string, any>
): void {
  reportError(error, {
    severity: 'critical',
    context,
    tags: ['critical', 'system']
  })
}

/**
 * Report business-critical error (affects customer experience)
 */
export function reportBusinessError(
  error: Error | string,
  businessId: string,
  context?: Record<string, any>
): void {
  reportError(error, {
    severity: 'high',
    businessId,
    context,
    tags: ['business', 'customer-impact']
  })
}

/**
 * Report performance issue
 */
export function reportPerformanceIssue(
  metric: string,
  value: number,
  threshold: number,
  context?: Record<string, any>
): void {
  const message = `Performance threshold exceeded: ${metric} = ${value} (threshold: ${threshold})`
  
  logger.warn(message, {
    metric,
    value,
    threshold,
    ...context
  })

  // Only alert if significantly over threshold
  if (value > threshold * 1.5) {
    sendSlackAlert(
      `Performance Alert: ${metric}`,
      message,
      {
        severity: 'medium',
        context: { metric, value, threshold, ...context },
        tags: ['performance']
      }
    ).catch(() => {
      // Slack alert failed
    })
  }
}

/**
 * Report security event
 */
export function reportSecurityEvent(
  event: string,
  details: Record<string, any>
): void {
  logger.warn(`Security Event: ${event}`, details)

  // Always send security events to Slack (if configured)
  sendSlackAlert(
    `Security Alert: ${event}`,
    JSON.stringify(details, null, 2),
    {
      severity: 'high',
      context: details,
      tags: ['security']
    }
  ).catch(() => {
    // Slack alert failed
  })

  // Send to Sentry with security tag
  if (typeof window === 'undefined') {
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureMessage(event, {
        level: 'warning',
        tags: { security: true },
        contexts: { security: details }
      })
    }).catch(() => {
      // Sentry not available
    })
  }
}

/**
 * Health check monitoring
 */
export async function reportHealthCheck(
  service: string,
  status: 'healthy' | 'degraded' | 'down',
  details?: Record<string, any>
): Promise<void> {
  if (status === 'down') {
    await sendSlackAlert(
      `Service Down: ${service}`,
      `The ${service} service is currently down.`,
      {
        severity: 'critical',
        context: details,
        tags: ['health-check', 'service-down']
      }
    )
  } else if (status === 'degraded') {
    await sendSlackAlert(
      `Service Degraded: ${service}`,
      `The ${service} service is experiencing issues.`,
      {
        severity: 'high',
        context: details,
        tags: ['health-check', 'service-degraded']
      }
    )
  }

  logger.info(`Health check: ${service} - ${status}`, details)
}




/**
 * Enhanced Monitoring with Sentry and Alerting
 * 
 * To enable Sentry:
 * 1. Install: npm install @sentry/nextjs
 * 2. Set NEXT_PUBLIC_SENTRY_DSN environment variable
 * 3. Initialize in next.config.js (see docs)
 * 
 * To enable Slack alerts:
 * 1. Set SLACK_WEBHOOK_URL environment variable
 * 2. Create webhook at https://api.slack.com/apps
 */

export interface AlertOptions {
  severity?: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, any>
  tags?: string[]
  userId?: string
  businessId?: string
}

/**
 * Send alert to Slack (if configured)
 */
async function sendSlackAlert(
  title: string,
  message: string,
  options?: AlertOptions
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    return // Slack not configured
  }

  try {
    const severity = options?.severity || 'medium'
    const colorMap: Record<string, string> = {
      low: '#36a64f',      // Green
      medium: '#ffa500',   // Orange
      high: '#ff0000',     // Red
      critical: '#8b0000'  // Dark red
    }

    const payload = {
      text: title,
      attachments: [
        {
          color: colorMap[severity],
          fields: [
            {
              title: 'Message',
              value: message,
              short: false
            },
            ...(options?.context ? Object.entries(options.context).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true
            })) : []),
            ...(options?.tags ? [{
              title: 'Tags',
              value: options.tags.join(', '),
              short: true
            }] : []),
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true
            }
          ],
          footer: 'CloudGreet Monitoring',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (error) {
    logger.error('Failed to send Slack alert', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Send error to Sentry (if configured)
 */
function sendToSentry(error: Error, options?: AlertOptions): void {
  try {
    // Dynamic import to avoid errors if Sentry not installed
    if (typeof window !== 'undefined') {
      // Client-side Sentry
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, {
          level: options?.severity === 'critical' ? 'fatal' : 'error',
          tags: options?.tags,
          user: options?.userId ? { id: options.userId } : undefined,
          contexts: {
            business: options?.businessId ? { id: options.businessId } : undefined,
            custom: options?.context
          }
        })
      }).catch(() => {
        // Sentry not installed or not configured
      })
    } else {
      // Server-side Sentry
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, {
          level: options?.severity === 'critical' ? 'fatal' : 'error',
          tags: options?.tags,
          user: options?.userId ? { id: options.userId } : undefined,
          contexts: {
            business: options?.businessId ? { id: options.businessId } : undefined,
            custom: options?.context
          }
        })
      }).catch(() => {
        // Sentry not installed or not configured
      })
    }
  } catch (error) {
    // Sentry not available
    logger.debug('Sentry not available', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Enhanced error reporting with Sentry and Slack
 */
export function reportError(
  error: Error | string,
  options?: AlertOptions
): void {
  const errorObj = error instanceof Error ? error : new Error(error)
  const message = errorObj.message

  // Log to console (always)
  logger.error(message, {
    ...options?.context,
    severity: options?.severity,
    tags: options?.tags,
    stack: errorObj.stack
  })

  // Send to Sentry (if configured)
  if (options?.severity === 'high' || options?.severity === 'critical') {
    sendToSentry(errorObj, options)
  }

  // Send to Slack (if configured and severity is medium+)
  if (options?.severity !== 'low') {
    sendSlackAlert(
      `Error Alert: ${message}`,
      errorObj.stack || message,
      options
    ).catch(() => {
      // Slack alert failed, but don't throw
    })
  }
}

/**
 * Report critical system error
 */
export function reportCriticalError(
  error: Error | string,
  context?: Record<string, any>
): void {
  reportError(error, {
    severity: 'critical',
    context,
    tags: ['critical', 'system']
  })
}

/**
 * Report business-critical error (affects customer experience)
 */
export function reportBusinessError(
  error: Error | string,
  businessId: string,
  context?: Record<string, any>
): void {
  reportError(error, {
    severity: 'high',
    businessId,
    context,
    tags: ['business', 'customer-impact']
  })
}

/**
 * Report performance issue
 */
export function reportPerformanceIssue(
  metric: string,
  value: number,
  threshold: number,
  context?: Record<string, any>
): void {
  const message = `Performance threshold exceeded: ${metric} = ${value} (threshold: ${threshold})`
  
  logger.warn(message, {
    metric,
    value,
    threshold,
    ...context
  })

  // Only alert if significantly over threshold
  if (value > threshold * 1.5) {
    sendSlackAlert(
      `Performance Alert: ${metric}`,
      message,
      {
        severity: 'medium',
        context: { metric, value, threshold, ...context },
        tags: ['performance']
      }
    ).catch(() => {
      // Slack alert failed
    })
  }
}

/**
 * Report security event
 */
export function reportSecurityEvent(
  event: string,
  details: Record<string, any>
): void {
  logger.warn(`Security Event: ${event}`, details)

  // Always send security events to Slack (if configured)
  sendSlackAlert(
    `Security Alert: ${event}`,
    JSON.stringify(details, null, 2),
    {
      severity: 'high',
      context: details,
      tags: ['security']
    }
  ).catch(() => {
    // Slack alert failed
  })

  // Send to Sentry with security tag
  if (typeof window === 'undefined') {
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureMessage(event, {
        level: 'warning',
        tags: { security: true },
        contexts: { security: details }
      })
    }).catch(() => {
      // Sentry not available
    })
  }
}

/**
 * Health check monitoring
 */
export async function reportHealthCheck(
  service: string,
  status: 'healthy' | 'degraded' | 'down',
  details?: Record<string, any>
): Promise<void> {
  if (status === 'down') {
    await sendSlackAlert(
      `Service Down: ${service}`,
      `The ${service} service is currently down.`,
      {
        severity: 'critical',
        context: details,
        tags: ['health-check', 'service-down']
      }
    )
  } else if (status === 'degraded') {
    await sendSlackAlert(
      `Service Degraded: ${service}`,
      `The ${service} service is experiencing issues.`,
      {
        severity: 'high',
        context: details,
        tags: ['health-check', 'service-degraded']
      }
    )
  }

  logger.info(`Health check: ${service} - ${status}`, details)
}


