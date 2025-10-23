// Authentication utilities for CloudGreet

import jwt from 'jsonwebtoken'
import { logger } from '@/lib/monitoring'

export interface AuthUser {
  id: string
  email: string
  businessId?: string
  role?: string
}

export interface AuthToken {
  userId: string
  businessId?: string
  role?: string
  iat?: number
  exp?: number
}

/**
 * Generate JWT token for user authentication
 */
export function generateAuthToken(user: AuthUser): string {
  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    const payload: AuthToken = {
      userId: user.id,
      businessId: user.businessId,
      role: user.role || 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }

    return jwt.sign(payload, jwtSecret)
  } catch (error) {
    logger.error('Failed to generate auth token', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: user.id 
    })
    throw new Error('Token generation failed')
  }
}

/**
 * Verify JWT token and extract user information
 */
export function verifyAuthToken(token: string): AuthToken | null {
  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured')
      return null
    }

    const decoded = jwt.verify(token, jwtSecret) as AuthToken
    
    // Check if token is expired
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      logger.warn('Auth token expired', { userId: decoded.userId })
      return null
    }

    return decoded
  } catch (error) {
    logger.error('Failed to verify auth token', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return null
  }
}

/**
 * Extract user information from request headers
 */
export function getUserFromRequest(request: Request): AuthUser | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyAuthToken(token)
    
    if (!decoded) {
      return null
    }

    return {
      id: decoded.userId,
      email: '', // Email would need to be fetched from database
      businessId: decoded.businessId,
      role: decoded.role
    }
  } catch (error) {
    logger.error('Failed to get user from request', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return null
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser | null, requiredRole: string): boolean {
  if (!user || !user.role) {
    return false
  }

  const roleHierarchy = {
    'admin': 3,
    'manager': 2,
    'user': 1
  }

  const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

  return userLevel >= requiredLevel
}

/**
 * Check if user belongs to business
 */
export function belongsToBusiness(user: AuthUser | null, businessId: string): boolean {
  if (!user || !user.businessId) {
    return false
  }

  return user.businessId === businessId
}

/**
 * Generate secure random token for password reset, etc.
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return token
}

/**
 * Hash password (for user registration)
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const bcrypt = await import('bcryptjs')
    const saltRounds = 12
    return await bcrypt.hash(password, saltRounds)
  } catch (error) {
    logger.error('Failed to hash password', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    throw new Error('Password hashing failed')
  }
}

/**
 * Verify password (for user login)
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const bcrypt = await import('bcryptjs')
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    logger.error('Failed to verify password', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return false
  }
}



