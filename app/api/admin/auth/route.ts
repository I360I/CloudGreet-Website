import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminPassword, generateAdminToken } from '@/lib/admin-auth'
import { authRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    // Rate limiting to prevent brute force attacks
    const rateLimitResult = await authRateLimit.check(request)
    if (!rateLimitResult.allowed) {
      logger.warn('Admin login rate limit exceeded', {
        requestId,
        ip: request.ip || 'unknown',
        remaining: rateLimitResult.remaining
      })
      
      return NextResponse.json({ 
        success: false, 
        error: 'Too many login attempts',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }, { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
        }
      })
    }
    
    const { password, email } = await request.json()
    
    // Validate input
    if (!password) {
      return NextResponse.json({ 
        success: false,
        error: 'Validation error', 
        message: 'Password is required' 
      }, { status: 400 })
    }
    
    // Verify admin password (server-side only, never exposed to client)
    if (!verifyAdminPassword(password)) {
      logger.warn('Failed admin login attempt', {
        requestId,
        ip: request.ip || 'unknown',
        email: email || 'not_provided'
      })
      
      return NextResponse.json({ 
        success: false,
        error: 'Authentication failed', 
        message: 'Invalid admin credentials' 
      }, { status: 401 })
    }
    
    // Generate secure JWT token
    const adminEmail = email || 'admin@cloudgreet.com'
    const adminId = 'admin_' + Date.now() // In production, use actual admin user ID from database
    const token = generateAdminToken(adminId, adminEmail)
    
    logger.info('Admin login successful', {
      requestId,
      adminId,
      email: adminEmail
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Admin access granted',
      token,
      admin: {
        id: adminId,
        email: adminEmail,
        role: 'admin'
      }
    })
    
  } catch (error) {
    logger.error('Admin authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    })
    
    return NextResponse.json({ 
      success: false,
      error: 'Server error', 
      message: 'Authentication failed. Please try again.' 
    }, { status: 500 })
  }
}

