import crypto from 'crypto'
import { logger } from './monitoring'

/**
 * Verify Telnyx webhook signature for security
 * Protects against replay attacks and unauthorized webhook calls
 */
export function verifyTelynyxSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  // In development, allow webhooks without signature
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

  if (process.env.NODE_ENV === 'development') {
    logger.debug('Skipping webhook verification in development')
    return true
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


  if (!signature || !timestamp) {
    logger.warn('Webhook missing signature or timestamp')
    return false
  }

  // Check timestamp freshness (prevent replay attacks)
  const webhookTime = parseInt(timestamp)
  const currentTime = Math.floor(Date.now() / 1000)
  const timeDifference = Math.abs(currentTime - webhookTime)
  
  // Reject webhooks older than 5 minutes
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

  if (timeDifference > 300) {
    logger.warn('Webhook timestamp too old', {
      timeDifference,
      webhookTime,
      currentTime
    })
    return false
  }

  // Get Telnyx public key from environment
  const publicKey = process.env.TELNYX_PUBLIC_KEY
  
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

  
  if (!publicKey) {
    // Fail closed in production. If TELNYX_PUBLIC_KEY isn't set, anyone
    // can hit the webhook URL with arbitrary payloads (call events,
    // SMS deliveries, etc.) and corrupt our state. In dev we already
    // short-circuit above; in prod, refuse the request and log loud.
    logger.error('TELNYX_PUBLIC_KEY not configured - rejecting webhook')
    return false
  }

  try {
    // Verify Ed25519 signature
    const signedPayload = `${timestamp}|${payload}`
    
    const verify = crypto.createVerify('sha256')
    verify.update(signedPayload)
    verify.end()
    
    const isValid = verify.verify(publicKey, signature, 'base64')
    
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

    
    if (!isValid) {
      logger.error('Invalid webhook signature', {
        timestamp,
        payloadLength: payload.length
      })
    }
    
    return isValid
    
  } catch (error) {
    logger.error('Webhook signature verification error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return false
  }
}

/**
 * Verify Retell AI webhook signature
 * Retell uses HMAC-SHA256 with x-retell-signature header
 */
export function verifyRetellSignature(
  payload: string,
  signature: string | null
): boolean {
  // In development, allow webhooks without signature
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Skipping Retell webhook verification in development')
    return true
  }

  if (!signature) {
    logger.warn('Retell webhook missing signature')
    return false
  }

  // Retell's signing key has shifted around between deployments and
  // docs. They've used:
  //   - a dedicated webhook secret (older)
  //   - the workspace API key (current as of 2026)
  // We try BOTH so a misconfigured RETELL_WEBHOOK_SECRET env doesn't
  // break every call. And we try both hex and base64 encodings since
  // some Retell builds emit the signature as base64.
  const candidates = [
    process.env.RETELL_WEBHOOK_SECRET,
    process.env.RETELL_API_KEY,
    process.env.NEXT_PUBLIC_RETELL_API_KEY,
  ].filter((s): s is string => typeof s === 'string' && s.length > 0)

  if (candidates.length === 0) {
    logger.error(
      'No Retell signing secret configured (set RETELL_API_KEY or RETELL_WEBHOOK_SECRET) - rejecting webhook',
    )
    return false
  }

  // Strip any prefix like "sha256=" some signers prepend.
  const sigRaw = signature.startsWith('sha256=') ? signature.slice(7) : signature

  for (const secret of candidates) {
    try {
      const hmac = crypto.createHmac('sha256', secret).update(payload)
      const hex = hmac.digest('hex')
      // Recompute for base64 - .digest() consumes the HMAC, need a fresh one.
      const base64 = crypto.createHmac('sha256', secret).update(payload).digest('base64')

      if (safeEqual(sigRaw, hex)) return true
      if (safeEqual(sigRaw, base64)) return true
    } catch (e) {
      logger.warn('Retell signature attempt threw', {
        error: e instanceof Error ? e.message : 'Unknown',
      })
    }
  }

  logger.error('Retell webhook signature did not match any configured secret', {
    signaturePreview: sigRaw.slice(0, 16) + '…',
    triedKeys: candidates.length,
  })
  return false
}

/**
 * Constant-time string compare that tolerates different lengths.
 * crypto.timingSafeEqual throws on length mismatch which is a useful
 * timing leak vector to avoid - we treat any length difference as
 * non-match without leaking which side failed.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

/**
 * Verify Stripe webhook signature
 * 
 * NOTE: This is a simplified verification. The actual Stripe webhook handler
 * uses stripe.webhooks.constructEvent() which properly handles Stripe's
 * signature format with timestamps. This function is kept for backward
 * compatibility but the webhook route should use Stripe SDK directly.
 */
export function verifyStripeSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature) {
    logger.warn('Stripe webhook missing signature')
    return false
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured')
    return false
  }

  try {
    // Stripe uses HMAC SHA256 with specific format
    // Note: Stripe signature format is: "t=timestamp,v1=signature,v0=signature"
    // The webhook route should use stripe.webhooks.constructEvent() instead
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex')
    
    // Extract signature from Stripe format (v1=...)
    const signatureMatch = signature.match(/v1=([^,]+)/)
    const actualSignature = signatureMatch ? signatureMatch[1] : signature
    
    // Compare signatures securely (timing-safe)
    return crypto.timingSafeEqual(
      Buffer.from(actualSignature),
      Buffer.from(expectedSignature)
    )
    
  } catch (error) {
    logger.error('Stripe signature verification error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return false
  }
}

/**
 * Middleware to verify webhook authenticity
 */
export async function verifyWebhookMiddleware(
  request: Request,
  provider: 'telnyx' | 'stripe' | 'retell'
): Promise<{ verified: boolean; error?: string }> {
  try {
    const payload = await request.text()
    
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

    
    if (provider === 'telnyx') {
      const signature = request.headers.get('telnyx-signature-ed25519')
      const timestamp = request.headers.get('telnyx-timestamp')
      
      const verified = verifyTelynyxSignature(payload, signature, timestamp)
      
      return {
        verified,
        error: verified ? undefined : 'Invalid webhook signature'
      }
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

    
    if (provider === 'stripe') {
      const signature = request.headers.get('stripe-signature')
      
      const verified = verifyStripeSignature(payload, signature)
      
      return {
        verified,
        error: verified ? undefined : 'Invalid webhook signature'
      }
    }

    if (provider === 'retell') {
      const signature = request.headers.get('x-retell-signature')
      
      const verified = verifyRetellSignature(payload, signature)
      
      return {
        verified,
        error: verified ? undefined : 'Invalid webhook signature'
      }
    }
    
    return {
      verified: false,
      error: 'Unknown provider'
    }
    
  } catch (error) {
    logger.error('Webhook verification middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      provider
    })
    
    return {
      verified: false,
      error: 'Verification failed'
    }
  }
}

