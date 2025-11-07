import { logger } from '@/lib/monitoring'
// Notification helper functions for CloudGreet

export interface NotificationData {
  type: 'client_booking' | 'client_acquisition' | 'system_error' | 'client_support' | 'payment_received' | 'payment_failed'
  message: string
  businessId?: string
  clientId?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

/**
 * sendNotification - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await sendNotification(param1, param2)
 * ```
 */
export async function sendNotification(data: NotificationData): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    return response.ok
  } catch (error) {
    logger.error('Error sending notification:', { error: error instanceof Error ? error.message : 'Unknown error' })
    return false
  }
}

// Convenience functions for common notifications
/**
 * notifyNewBooking - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await notifyNewBooking(param1, param2)
 * ```
 */
export async function notifyNewBooking(bookingDetails: string, businessId: string): Promise<boolean> {
  return sendNotification({
    type: 'client_booking',
    message: `New appointment booked: ${bookingDetails}`,
    businessId,
    priority: 'normal'
  })
}

/**
 * notifyNewClient - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await notifyNewClient(param1, param2)
 * ```
 */
export async function notifyNewClient(clientName: string, businessId: string): Promise<boolean> {
  return sendNotification({
    type: 'client_acquisition',
    message: `New client signed up: ${clientName}`,
    businessId,
    priority: 'high'
  })
}

/**
 * notifySystemError - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await notifySystemError(param1, param2)
 * ```
 */
export async function notifySystemError(errorMessage: string, businessId?: string): Promise<boolean> {
  return sendNotification({
    type: 'system_error',
    message: errorMessage,
    businessId,
    priority: 'urgent'
  })
}

/**
 * notifyClientSupport - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await notifyClientSupport(param1, param2)
 * ```
 */
export async function notifyClientSupport(supportMessage: string, businessId: string, clientId?: string): Promise<boolean> {
  return sendNotification({
    type: 'client_support',
    message: supportMessage,
    businessId,
    clientId,
    priority: 'high'
  })
}

/**
 * notifyPaymentReceived - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await notifyPaymentReceived(param1, param2)
 * ```
 */
export async function notifyPaymentReceived(amount: string, businessId: string): Promise<boolean> {
  return sendNotification({
    type: 'payment_received',
    message: `Payment received: $${amount}`,
    businessId,
    priority: 'normal'
  })
}

/**
 * notifyPaymentFailed - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await notifyPaymentFailed(param1, param2)
 * ```
 */
export async function notifyPaymentFailed(amount: string, businessId: string, clientId?: string): Promise<boolean> {
  return sendNotification({
    type: 'payment_failed',
    message: `Payment failed: $${amount}`,
    businessId,
    clientId,
    priority: 'high'
  })
}
