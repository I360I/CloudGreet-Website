/**
 * Type definitions for Stripe-related structures
 */

export const STRIPE_API_VERSION = '2023-10-16' as const

export interface StripeCustomer {
  id: string
  email?: string | null
  name?: string | null
  phone?: string | null
  metadata?: Record<string, string>
  [key: string]: unknown
}

export interface StripeProduct {
  id: string
  name: string
  description?: string | null
  metadata?: Record<string, string>
  [key: string]: unknown
}




