import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'CHANGE_THIS_IN_PRODUCTION'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface AdminTokenPayload {
  isAdmin: true
  userId: string
  email: string
  iat: number
  exp: number
}

/**
 * Verifies admin password (server-side only)
 * DO NOT expose this password to the client
 */
export function verifyAdminPassword(password: string): boolean {
  // Use environment variable for admin password
  // NEVER hardcode passwords in the codebase
  const correctPassword = process.env.ADMIN_PASSWORD
  
  if (!correctPassword) {
    console.error('❌ ADMIN_PASSWORD not set in environment variables!')
    return false
  }
  
  return password === correctPassword
}

/**
 * Generates a secure JWT token for admin access
 */
export function generateAdminToken(userId: string, email: string): string {
  const payload: Omit<AdminTokenPayload, 'iat' | 'exp'> = {
    isAdmin: true,
    userId,
    email
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h', // Admin sessions expire after 24 hours
    issuer: 'cloudgreet-admin'
  })
}

/**
 * Verifies admin JWT token from request
 * Returns decoded payload if valid, null if invalid
 */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'cloudgreet-admin'
    }) as AdminTokenPayload
    
    // Ensure the token claims admin access
    if (!decoded.isAdmin) {
      return null
    }
    
    return decoded
  } catch (error) {
    console.error('Admin token verification failed:', error)
    return null
  }
}

/**
 * Extracts and verifies admin token from request headers
 * Returns decoded payload if valid, null if invalid
 */
export function verifyAdminRequest(request: NextRequest): AdminTokenPayload | null {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.replace('Bearer ', '')
  return verifyAdminToken(token)
}

/**
 * Middleware helper to require admin authentication
 * Returns error response if not authenticated, null if authenticated
 */
export function requireAdmin(request: NextRequest) {
  const admin = verifyAdminRequest(request)
  
  if (!admin) {
    return {
      error: true,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: 'Admin authentication required'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
  
  return { error: false, admin }
}

