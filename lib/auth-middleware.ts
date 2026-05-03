import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { JWTPayload } from './types'
import { logger } from './monitoring'
import { supabaseAdmin } from './supabase'

export interface AuthResult {
  success: boolean
  userId?: string
  businessId?: string
  role?: string
  error?: string
}

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Accept either the Authorization: Bearer header (used by fetchWithAuth)
    // or the httpOnly `token` cookie set by /api/auth/set-token. Falling back
    // to the cookie matters because client-side token retrieval has a brief
    // race after login where the cache hasn't refreshed yet — without the
    // fallback, the dashboard 401s and bounces back to /login.
    const authHeader = request.headers.get('authorization')
    let token: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '')
    } else {
      token = request.cookies.get('token')?.value || null
    }
    if (!token) {
      return { success: false, error: 'Missing auth token' }
    }
    
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured')
      return { success: false, error: 'Authentication not configured' }
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload
    
    return {
      success: true,
      userId: decoded.userId,
      businessId: decoded.businessId,
      role: decoded.role ?? 'user'
    }
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

  if (auth.role === 'admin' || auth.role === 'owner') {
    return auth
  }

  return { success: false, error: 'Admin access required' }
}

export async function requireEmployee(
  request: NextRequest,
  options: { allowManager?: boolean } = {}
): Promise<AuthResult> {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId) return auth

  const { data: user, error } = await supabaseAdmin
    .from('custom_users')
    .select('id, business_id, is_active, role')
    .eq('id', auth.userId)
    .single()

  if (error || !user) {
    logger.warn('Employee verification failed', { error })
    return { success: false, error: 'User not found' }
  }

  if (!user.is_active) {
    return { success: false, error: 'Account disabled' }
  }

  const effectiveRole = user.role ?? auth.role ?? 'user'
  const allowedRoles = new Set<string>(['sales'])
  if (options.allowManager) {
    allowedRoles.add('owner')
    allowedRoles.add('admin')
  }

  if (!allowedRoles.has(effectiveRole)) {
    return { success: false, error: 'Employee access required' }
  }

  return {
    success: true,
    userId: user.id,
    businessId: user.business_id ?? auth.businessId,
    role: effectiveRole
  }
}