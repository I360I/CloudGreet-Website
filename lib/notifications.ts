// Notification helper functions for CloudGreet

export interface NotificationData {
  type: 'client_booking' | 'client_acquisition' | 'system_error' | 'client_support' | 'payment_received' | 'payment_failed'
  message: string
  businessId?: string
  clientId?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

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
    console.error('Error sending notification:', error)
    return false
  }
}

// Convenience functions for common notifications
export async function notifyNewBooking(bookingDetails: string, businessId: string): Promise<boolean> {
  return sendNotification({
    type: 'client_booking',
    message: `New appointment booked: ${bookingDetails}`,
    businessId,
    priority: 'normal'
  })
}

export async function notifyNewClient(clientName: string, businessId: string): Promise<boolean> {
  return sendNotification({
    type: 'client_acquisition',
    message: `New client signed up: ${clientName}`,
    businessId,
    priority: 'high'
  })
}

export async function notifySystemError(errorMessage: string, businessId?: string): Promise<boolean> {
  return sendNotification({
    type: 'system_error',
    message: errorMessage,
    businessId,
    priority: 'urgent'
  })
}

export async function notifyClientSupport(supportMessage: string, businessId: string, clientId?: string): Promise<boolean> {
  return sendNotification({
    type: 'client_support',
    message: supportMessage,
    businessId,
    clientId,
    priority: 'high'
  })
}

export async function notifyPaymentReceived(amount: string, businessId: string): Promise<boolean> {
  return sendNotification({
    type: 'payment_received',
    message: `Payment received: $${amount}`,
    businessId,
    priority: 'normal'
  })
}

export async function notifyPaymentFailed(amount: string, businessId: string, clientId?: string): Promise<boolean> {
  return sendNotification({
    type: 'payment_failed',
    message: `Payment failed: $${amount}`,
    businessId,
    clientId,
    priority: 'high'
  })
}
