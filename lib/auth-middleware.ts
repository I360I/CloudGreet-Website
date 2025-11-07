import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { JWTPayload } from './types'
import { logger } from './monitoring'

export interface AuthResult {
  success: boolean
  userId?: string
  businessId?: string
  error?: string
}

/**
 * requireAuth - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await requireAuth(param1, param2)
 * ```
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { success: false, error: 'Missing auth header' }
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured')
      return { success: false, error: 'Authentication not configured' }
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload
    
    return { success: true, userId: decoded.userId, businessId: decoded.businessId }
  } catch (error) {
    // Handle JWT errors gracefully - these should return 401, not 500
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('JWT verification failed', { error: error.message })
      return { success: false, error: 'Invalid token' }
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn('JWT token expired', { error: error.message })
      return { success: false, error: 'Token expired' }
    } else if (error instanceof jwt.NotBeforeError) {
      logger.warn('JWT token not active', { error: error.message })
      return { success: false, error: 'Token not active' }
    } else {
      logger.error('Auth verification failed', { error: error instanceof Error ? error.message : 'Unknown' })
      return { success: false, error: 'Authentication failed' }
    }
  }
}

/**
 * requireAdmin - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await requireAdmin(param1, param2)
 * ```
 */
/**
 * verifyJWT - Wrapper around requireAuth that returns expected format
 * Used by endpoints that expect { user: { id: string } } format
 * 
 * @param request - NextRequest with authorization header
 * @returns Promise with auth result in { user: { id: string } } format or null
 */
export async function verifyJWT(request: NextRequest): Promise<{ user: { id: string } } | { user: null }> {
  const authResult = await requireAuth(request)
  
  if (!authResult.success || !authResult.userId) {
    return { user: null }
  }
  
  return { user: { id: authResult.userId } }
}

export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const auth = await requireAuth(request)
  if (!auth.success) return auth
  
  try {
    // Check if user has admin role
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
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
    
    if (!token || !process.env.JWT_SECRET) {
      return { success: false, error: 'Authentication not configured' }
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload
    
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
    
    if (decoded.role !== 'admin') {
      return { success: false, error: 'Admin access required' }
    }
    
    return auth
  } catch (error) {
    logger.error('Admin auth verification failed', { error: error instanceof Error ? error.message : 'Unknown' })
    return { success: false, error: 'Admin authentication failed' }
  }
}