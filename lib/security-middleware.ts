import { NextRequest, NextResponse } from 'next/server'
import { 
  validateAndSanitizeInput, 
  detectSqlInjection, 
  detectXss, 
  detectPathTraversal,
  validateApiRequestBody,
  sanitizeString
} from './security'
import { logger } from './monitoring'

/**
 * Security middleware for API routes
 * Automatically sanitizes inputs and detects potential attacks
 */
export function withSecurityMiddleware(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Sanitize URL path
      const sanitizedPath = sanitizeString(request.nextUrl.pathname)
      if (sanitizedPath !== request.nextUrl.pathname) {
        logger.warn('Potential path traversal detected', { 
          originalPath: request.nextUrl.pathname,
          sanitizedPath 
        })
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
      }

      // Sanitize query parameters
      const searchParams = request.nextUrl.searchParams
      const entries = Array.from(searchParams.entries())
      for (const [key, value] of entries) {
        const sanitizedKey = sanitizeString(key)
        const sanitizedValue = sanitizeString(value)
        
        // Check for potential attacks
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

        if (detectSqlInjection(value)) {
          logger.warn('SQL injection attempt detected', { 
            key, 
            value: value.substring(0, 100),
            ip: request.ip || 'unknown'
          })
          return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
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

        
        if (detectXss(value)) {
          logger.warn('XSS attempt detected', { 
            key, 
            value: value.substring(0, 100),
            ip: request.ip || 'unknown'
          })
          return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
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

        
        if (detectPathTraversal(value)) {
          logger.warn('Path traversal attempt detected', { 
            key, 
            value: value.substring(0, 100),
            ip: request.ip || 'unknown'
          })
          return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
        }
      }

      // Sanitize request body for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json()
          const sanitizedBody = validateApiRequestBody(body)
          
          // Create a new request with sanitized body
          const sanitizedRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(sanitizedBody)
          })
          
          return await handler(sanitizedRequest)
        } catch (error) {
          logger.error('Failed to parse request body', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            ip: request.ip || 'unknown'
          })
          return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }
      }

      // For GET/DELETE requests, just pass through
      return await handler(request)
    } catch (error) {
      logger.error('Security middleware error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: request.ip || 'unknown'
      })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/**
 * Input validation decorator for specific fields
 */
export function validateInputs(validations: { [key: string]: 'string' | 'email' | 'phone' | 'number' | 'boolean' | 'url' | 'json' | 'html' | 'sql' | 'filepath' }) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (request: NextRequest) {
      try {
        const body = await request.json()
        
        // Validate each field
        for (const [field, type] of Object.entries(validations)) {
          if (body[field] !== undefined) {
            const originalValue = body[field]
            const sanitizedValue = validateAndSanitizeInput(originalValue, type)
            
            // Check for potential attacks
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

            if (typeof originalValue === 'string') {
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

              if (detectSqlInjection(originalValue)) {
                logger.warn('SQL injection attempt detected', { 
                  field, 
                  value: originalValue.substring(0, 100),
                  ip: request.ip || 'unknown'
                })
                return NextResponse.json({ error: `Invalid ${field} detected` }, { status: 400 })
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

              
              if (detectXss(originalValue)) {
                logger.warn('XSS attempt detected', { 
                  field, 
                  value: originalValue.substring(0, 100),
                  ip: request.ip || 'unknown'
                })
                return NextResponse.json({ error: `Invalid ${field} detected` }, { status: 400 })
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

              
              if (detectPathTraversal(originalValue)) {
                logger.warn('Path traversal attempt detected', { 
                  field, 
                  value: originalValue.substring(0, 100),
                  ip: request.ip || 'unknown'
                })
                return NextResponse.json({ error: `Invalid ${field} detected` }, { status: 400 })
              }
            }
            
            body[field] = sanitizedValue
          }
        }
        
        // Create new request with sanitized body
        const sanitizedRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(body)
        })
        
        return await method.call(this, sanitizedRequest)
      } catch (error) {
        logger.error('Input validation error', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          ip: request.ip || 'unknown'
        })
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
      }
    }
  }
}

/**
 * Rate limiting decorator
 */
export function withRateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>()
  
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (request: NextRequest) {
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
      const now = Date.now()
      
      if (!requests.has(ip)) {
        requests.set(ip, { count: 1, resetTime: now + windowMs })
      } else {
        const userLimit = requests.get(ip)!
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

        if (now > userLimit.resetTime) {
          requests.set(ip, { count: 1, resetTime: now + windowMs })
        } else if (userLimit.count >= maxRequests) {
          logger.warn('Rate limit exceeded', { ip, count: userLimit.count })
          return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        } else {
          userLimit.count++
        }
      }
      
      return await method.call(this, request)
    }
  }
}

/**
 * Security headers middleware
 */
export function withSecurityHeaders(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const response = await handler(request)
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    
    return response
  }
}







