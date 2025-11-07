import { supabaseAdmin } from './supabase'
import { logger } from './monitoring'

/**
 * checkWebhookIdempotency - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await checkWebhookIdempotency(param1, param2)
 * ```
 */
export async function checkWebhookIdempotency(
  eventId: string,
  provider: 'stripe' | 'telnyx' | 'retell',
  eventType: string
): Promise<{ isDuplicate: boolean; error?: string }> {
  try {
    // Check if event already processed
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .single()

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

    if (existing) {
      logger.info('Duplicate webhook ignored', { eventId, provider, eventType })
      return { isDuplicate: true }
    }

    // Store event ID
    const { error: insertError } = await supabaseAdmin
      .from('webhook_events')
      .insert({
        event_id: eventId,
        provider,
        event_type: eventType,
        processed_at: new Date().toISOString()
      })

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

    if (insertError) {
      logger.error('Failed to store webhook event', { error: insertError.message, eventId })
      return { isDuplicate: false, error: insertError.message }
    }

    return { isDuplicate: false }
  } catch (error) {
    logger.error('Webhook idempotency check failed', { error: error instanceof Error ? error.message : 'Unknown error', eventId })
    return { isDuplicate: false, error: 'Idempotency check failed' }
  }
}