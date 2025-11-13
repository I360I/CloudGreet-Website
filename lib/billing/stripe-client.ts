import Stripe from 'stripe'
import { logger } from '@/lib/monitoring'

let stripeInstance: Stripe | null = null

export function getStripeClient(): Stripe {
  if (stripeInstance) {
    return stripeInstance
  }

  const apiKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || ''
  if (!apiKey) {
    throw new Error('Stripe API key not configured')
  }

  stripeInstance = new Stripe(apiKey, {
    apiVersion: '2023-10-16'
  })

  logger.info('Stripe client initialised', { hasLiveKey: apiKey.startsWith('sk_live') })
  return stripeInstance
}

export function setStripeClientForTests(client: Stripe | null) {
  if (process.env.NODE_ENV === 'test') {
    stripeInstance = client
  }
}


