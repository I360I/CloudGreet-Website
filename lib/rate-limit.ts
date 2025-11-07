import { NextRequest, NextResponse } from 'next/server'

export const rateLimits = {
  auth: { max: 5, window: 15 * 60 * 1000 },
  api: { max: 100, window: 60 * 1000 },
  webhooks: { max: 1000, window: 60 * 1000 }
}

// Simple in-memory rate limiter (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

/**
 * rateLimit - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await rateLimit(param1, param2)
 * ```
 */
export function rateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now()
  const key = identifier
  const record = rateLimitMap.get(key)

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

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
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

  if (record.count >= limit) {
    return false // Rate limit exceeded
  }

  record.count++
  return true
}

/**
 * createRateLimitMiddleware - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await createRateLimitMiddleware(param1, param2)
 * ```
 */
export function createRateLimitMiddleware(
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000
) {
  /**
   * return - Add description here
   * 
   * @param {...any} args - Method parameters
   * @returns {Promise<any>} Method return value
   * @throws {Error} When operation fails
   * 
   * @example
   * ```typescript
   * await this.return(param1, param2)
   * ```
   */
  return (request: NextRequest): NextResponse | null => {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const identifier = `${ip}:${request.nextUrl.pathname}`

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

    if (!rateLimit(identifier, limit, windowMs)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    return null // Allow request to proceed
  }
}

// Pre-configured rate limiters for common use cases
export const authRateLimit = createRateLimitMiddleware(5, 15 * 60 * 1000) // 5 attempts per 15 minutes
export const apiRateLimit = createRateLimitMiddleware(100, 15 * 60 * 1000) // 100 requests per 15 minutes
export const strictRateLimit = createRateLimitMiddleware(10, 15 * 60 * 1000) // 10 requests per 15 minutes