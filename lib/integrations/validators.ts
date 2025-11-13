import Stripe from 'stripe'

import { ValidatorKey } from './config'

export interface ValidationResult {
  success: boolean
  message?: string
}

const DEFAULT_TIMEOUT = 8000

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<Response> => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(id)
  }
}

const success = (): ValidationResult => ({ success: true })
const failure = (message: string): ValidationResult => ({ success: false, message })

const validators: Record<ValidatorKey, (value: string) => Promise<ValidationResult>> = {
  async stripeSecret(value) {
    try {
      const stripe = new Stripe(value, {
        apiVersion: '2022-11-15',
        maxNetworkRetries: 0
      })
      await stripe.balance.retrieve()
      return success()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect to Stripe with this key.'
      return failure(message)
    }
  },

  async telnyxApiKey(value) {
    try {
      const response = await fetchWithTimeout('https://api.telnyx.com/v2/account', {
        headers: {
          Authorization: `Bearer ${value}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        return success()
      }

      const body = await response.text()
      return failure(`Telnyx responded with ${response.status}: ${body || response.statusText}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect to Telnyx with this key.'
      return failure(message)
    }
  },

  async retellApiKey(value) {
    try {
      const response = await fetchWithTimeout('https://api.retell.ai/v2/agents?limit=1', {
        headers: {
          Authorization: `Bearer ${value}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        return success()
      }

      const body = await response.text()
      return failure(`Retell responded with ${response.status}: ${body || response.statusText}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect to Retell with this key.'
      return failure(message)
    }
  },

  async openaiApiKey(value) {
    try {
      const response = await fetchWithTimeout('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${value}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        return success()
      }

      const body = await response.text()
      return failure(`OpenAI responded with ${response.status}: ${body || response.statusText}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect to OpenAI with this key.'
      return failure(message)
    }
  },

  async resendApiKey(value) {
    try {
      const response = await fetchWithTimeout('https://api.resend.com/domains', {
        headers: {
          Authorization: `Bearer ${value}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        return success()
      }

      const body = await response.text()
      return failure(`Resend responded with ${response.status}: ${body || response.statusText}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect to Resend with this key.'
      return failure(message)
    }
  },

  async slackWebhook(value) {
    const slackPattern =
      /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+$/i
    if (!slackPattern.test(value.trim())) {
      return failure('Slack webhook URL must start with https://hooks.slack.com/services/.')
    }
    return success()
  },

  async pagerdutyKey(value) {
    const trimmed = value.trim()
    const pattern = /^[A-Z0-9]{32}$/i
    if (!pattern.test(trimmed)) {
      return failure('PagerDuty routing keys are 32 alphanumeric characters.')
    }
    return success()
  },

  async apolloApiKey(value) {
    try {
      const response = await fetchWithTimeout('https://api.apollo.io/v1/auth/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: value })
      })

      if (response.ok) {
        return success()
      }

      const body = await response.text()
      return failure(`Apollo responded with ${response.status}: ${body || response.statusText}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect to Apollo with this key.'
      return failure(message)
    }
  },

  async clearbitApiKey(value) {
    try {
      const response = await fetchWithTimeout('https://person.clearbit.com/v2/me', {
        headers: {
          Authorization: `Bearer ${value}`
        }
      })

      if (response.ok) {
        return success()
      }

      const body = await response.text()
      return failure(`Clearbit responded with ${response.status}: ${body || response.statusText}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect to Clearbit with this key.'
      return failure(message)
    }
  },

  async nonSecret() {
    return success()
  }
}

export const validateIntegrationField = async (
  validatorKey: ValidatorKey,
  value: string
): Promise<ValidationResult> => {
  const validator = validators[validatorKey]
  if (!validator) {
    return failure(`No validator configured for ${validatorKey}`)
  }

  if (!value || !value.trim()) {
    return failure('Value is required.')
  }

  return validator(value.trim())
}


