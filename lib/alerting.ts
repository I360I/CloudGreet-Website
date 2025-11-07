import { logger } from '@/lib/monitoring'
export interface Alert {
  severity: 'critical' | 'warning' | 'info'
  message: string
  context?: unknown
  timestamp: string
  resolved?: boolean
}

export interface AlertConfig {
  slackWebhookUrl?: string
  emailRecipients?: string[]
  smsRecipients?: string[]
  thresholds: {
    errorRate: number
    responseTime: number
    uptime: number
  }
}

class AlertManager {
  private config: AlertConfig
  private alertHistory: Alert[] = []
  private cooldowns = new Map<string, number>()

  constructor(config: AlertConfig) {
    this.config = config
  }

  async sendAlert(severity: 'critical' | 'warning' | 'info', message: string, context?: unknown) {
    const alert: Alert = {
      severity,
      message,
      context,
      timestamp: new Date().toISOString()
    }

    // Check cooldown to prevent spam
    const cooldownKey = `${severity}-${message}`
    const lastSent = this.cooldowns.get(cooldownKey)
    const cooldownMs = severity === 'critical' ? 5 * 60 * 1000 : 15 * 60 * 1000 // 5min for critical, 15min for others

    if (lastSent && Date.now() - lastSent < cooldownMs) {
      return // Skip if within cooldown period
    }

    this.alertHistory.push(alert)
    this.cooldowns.set(cooldownKey, Date.now())

    // Send to Slack
    if (this.config.slackWebhookUrl) {
      await this.sendSlackAlert(alert)
    }

    // Send email for critical alerts
    if (severity === 'critical' && this.config.emailRecipients?.length) {
      await this.sendEmailAlert(alert)
    }

    // Log the alert
    logger.info(`[${severity.toUpperCase()}] ${message}`, context as any)
  }

  private async sendSlackAlert(alert: Alert) {
    try {
      const color = alert.severity === 'critical' ? '#ff0000' : 
                   alert.severity === 'warning' ? '#ffaa00' : '#00ff00'

      const payload = {
        text: `[${alert.severity.toUpperCase()}] CloudGreet Alert`,
        attachments: [{
          color,
          fields: [
            {
              title: 'Message',
              value: alert.message,
              short: false
            },
            {
              title: 'Timestamp',
              value: alert.timestamp,
              short: true
            },
            {
              title: 'Environment',
              value: process.env.NODE_ENV || 'development',
              short: true
            }
          ]
        }]
      }

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

      if (alert.context) {
        payload.attachments[0].fields.push({
          title: 'Context',
          value: '```' + JSON.stringify(alert.context, null, 2) + '```',
          short: false
        })
      }

      await fetch(this.config.slackWebhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      logger.error('Failed to send Slack alert:', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  private async sendEmailAlert(alert: Alert) {
    try {
      // This would integrate with your email service (SendGrid, Mailgun, etc.)
      const emailData = {
        to: this.config.emailRecipients,
        subject: `[CRITICAL] CloudGreet Alert: ${alert.message}`,
        html: `
          <h2>Critical Alert</h2>
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          ${alert.context ? `<pre>${JSON.stringify(alert.context, null, 2)}</pre>` : ''}
        `
      }

      // Send via your email service
      logger.info('Email alert would be sent:', { 
        to: emailData.to?.join(', '), 
        subject: emailData.subject,
        htmlLength: emailData.html.length 
      })
    } catch (error) {
      logger.error('Failed to send email alert:', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  getAlertHistory(limit: number = 50): Alert[] {
    return this.alertHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  resolveAlert(alertIndex: number) {
    if (this.alertHistory[alertIndex]) {
      this.alertHistory[alertIndex].resolved = true
    }
  }
}

// Create global alert manager instance
const alertManager = new AlertManager({
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  emailRecipients: process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL] : [],
  thresholds: {
    errorRate: 0.05, // 5%
    responseTime: 5000, // 5 seconds
    uptime: 0.99 // 99%
  }
})

// Export convenience functions
/**
 * sendAlert - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await sendAlert(param1, param2)
 * ```
 */
export async function sendAlert(severity: 'critical' | 'warning' | 'info', message: string, context?: unknown) {
  await alertManager.sendAlert(severity, message, context)
}

/**
 * sendCriticalAlert - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await sendCriticalAlert(param1, param2)
 * ```
 */
export async function sendCriticalAlert(message: string, context?: unknown) {
  await alertManager.sendAlert('critical', message, context)
}

/**
 * sendWarningAlert - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await sendWarningAlert(param1, param2)
 * ```
 */
export async function sendWarningAlert(message: string, context?: unknown) {
  await alertManager.sendAlert('warning', message, context)
}

/**
 * sendInfoAlert - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await sendInfoAlert(param1, param2)
 * ```
 */
export async function sendInfoAlert(message: string, context?: unknown) {
  await alertManager.sendAlert('info', message, context)
}

// Specific alert functions for common scenarios
/**
 * alertHighErrorRate - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await alertHighErrorRate(param1, param2)
 * ```
 */
export async function alertHighErrorRate(errorRate: number, context?: unknown) {
  await sendCriticalAlert(`High error rate detected: ${(errorRate * 100).toFixed(2)}%`, {
    errorRate,
    threshold: 0.05,
    ...(context as any || {})
  })
}

/**
 * alertSlowResponse - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await alertSlowResponse(param1, param2)
 * ```
 */
export async function alertSlowResponse(responseTime: number, endpoint: string) {
  await sendWarningAlert(`Slow response time: ${responseTime}ms for ${endpoint}`, {
    responseTime,
    endpoint,
    threshold: 5000
  })
}

/**
 * alertServiceDown - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await alertServiceDown(param1, param2)
 * ```
 */
export async function alertServiceDown(service: string, error: string) {
  await sendCriticalAlert(`${service} service is down`, {
    service,
    error,
    timestamp: new Date().toISOString()
  })
}

/**
 * alertDatabaseIssue - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await alertDatabaseIssue(param1, param2)
 * ```
 */
export async function alertDatabaseIssue(error: string) {
  await sendCriticalAlert('Database connectivity issue', {
    error,
    timestamp: new Date().toISOString()
  })
}

/**
 * alertWebhookFailure - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await alertWebhookFailure(param1, param2)
 * ```
 */
export async function alertWebhookFailure(webhook: string, error: string) {
  await sendWarningAlert(`${webhook} webhook failed`, {
    webhook,
    error,
    timestamp: new Date().toISOString()
  })
}

/**
 * alertCallFailure - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await alertCallFailure(param1, param2)
 * ```
 */
export async function alertCallFailure(callId: string, error: string) {
  await sendWarningAlert(`Call ${callId} failed`, {
    callId,
    error,
    timestamp: new Date().toISOString()
  })
}

/**
 * alertRetellIssue - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await alertRetellIssue(param1, param2)
 * ```
 */
export async function alertRetellIssue(error: string) {
  await sendCriticalAlert('Retell AI service issue', {
    error,
    timestamp: new Date().toISOString()
  })
}

/**
 * alertTelnyxIssue - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await alertTelnyxIssue(param1, param2)
 * ```
 */
export async function alertTelnyxIssue(error: string) {
  await sendCriticalAlert('Telnyx service issue', {
    error,
    timestamp: new Date().toISOString()
  })
}

// Export alert manager for advanced usage
export { alertManager }