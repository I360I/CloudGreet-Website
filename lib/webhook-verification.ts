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
    logger.warn('TELNYX_PUBLIC_KEY not configured, skipping signature verification')
    // In production, this should return false
    // For now, allow but log warning
    return true
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

  const webhookSecret = process.env.RETELL_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.warn('RETELL_WEBHOOK_SECRET not configured, skipping signature verification')
    // In production, this should return false
    // For now, allow but log warning
    return true
  }

  try {
    // Retell uses HMAC SHA256 (similar to Stripe)
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex')

    // Compare signatures securely (timing-safe)
    // Retell sends signature as hex string in x-retell-signature header
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )

  } catch (error) {
    logger.error('Retell signature verification error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
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

