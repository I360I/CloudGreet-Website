/**
 * Standardized Authentication Utilities
 * Centralized JWT authentication for all API routes
 */

import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/monitoring'

export interface AuthUser {
  userId: string
  email: string
  businessId: string
  role: string
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

/**
 * Extract and validate JWT token from request
 * Supports both Authorization header and cookie
 */
export function extractAuthToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '')
  }

  // Fallback to cookie
  const token = request.cookies.get('token')?.value
  return token || null
}

/**
 * Verify JWT token and extract user information
 */
export function verifyAuthToken(token: string): AuthResult {
  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured')
      return { success: false, error: 'Authentication not configured' }
    }

    const decoded = jwt.verify(token, jwtSecret) as any
    
    // Validate required fields
    if (!decoded.userId || !decoded.email || !decoded.businessId) {
      return { success: false, error: 'Invalid token structure' }
    }

    return {
      success: true,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        businessId: decoded.businessId,
        role: decoded.role || 'owner'
      }
    }
  } catch (error) {
    logger.error('JWT verification failed', { error })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid token' 
    }
  }
}

/**
 * Authenticate request and return user information
 * This is the main function to use in API routes
 */
export function authenticateRequest(request: NextRequest): AuthResult {
  const token = extractAuthToken(request)
  
  if (!token) {
    return { success: false, error: 'No authentication token provided' }
  }

  return verifyAuthToken(token)
}

// Removed deprecated getLegacyAuth function - use authenticateRequest instead

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser, requiredRole: string): boolean {
  const roleHierarchy = ['owner', 'admin', 'user']
  const userRoleIndex = roleHierarchy.indexOf(user.role)
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)
  
  return userRoleIndex <= requiredRoleIndex
}

/**
 * Check if user belongs to business
 */
export function belongsToBusiness(user: AuthUser, businessId: string): boolean {
  return user.businessId === businessId
}