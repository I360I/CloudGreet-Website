import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { sanitizeString, sanitizeUrlParams } from '@/lib/security'
import crypto from 'crypto'

// Rate limiting store (in production, use Redis)
const rateLimitMap = new Map()

// Webhook signature verification
function verifyWebhookSignature(pathname: string, body: string, signature: string): boolean {
  try {
    // Get the appropriate webhook secret based on the path
    let secret = ''
    if (pathname.includes('stripe')) {
      secret = process.env.STRIPE_WEBHOOK_SECRET || ''
    } else if (pathname.includes('retell')) {
      secret = process.env.RETELL_WEBHOOK_SECRET || ''
    } else if (pathname.includes('telnyx')) {
      secret = process.env.TELNYX_WEBHOOK_SECRET || ''
    }
    
    if (!secret) return false
    
    // Verify signature based on webhook type
    if (pathname.includes('stripe')) {
      // Stripe uses HMAC SHA256
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('hex')
      return signature === `sha256=${expectedSignature}`
    } else {
      // Other webhooks use HMAC SHA256
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('hex')
      return signature === expectedSignature || signature === `sha256=${expectedSignature}`
    }
  } catch (error) {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Sanitize pathname to prevent path traversal attacks
  const sanitizedPathname = sanitizeString(pathname)
  if (sanitizedPathname !== pathname) {
    return new NextResponse('Invalid path', { status: 400 })
  }

  // Sanitize URL parameters
  const sanitizedParams = sanitizeUrlParams(request.nextUrl.searchParams)

  // CSRF Protection for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const host = request.headers.get('host')
    
    // Check if request is from same origin
    if (origin && !origin.includes(host || '')) {
      return new NextResponse('CSRF token mismatch', { status: 403 })
    }
    
    // Additional CSRF check for API routes
    if (pathname.startsWith('/api/')) {
      const csrfToken = request.headers.get('x-csrf-token')
      const expectedToken = request.cookies.get('csrf-token')?.value
      
      if (csrfToken && expectedToken && csrfToken !== expectedToken) {
        return new NextResponse('CSRF token mismatch', { status: 403 })
      }
    }
  }

  // Request signature verification for webhooks
  if (pathname.startsWith('/api/webhooks/') || pathname.includes('webhook')) {
    const signature = request.headers.get('x-signature') || request.headers.get('x-hub-signature-256')
    const body = await request.text()
    
    if (signature && body) {
      // Verify signature based on the webhook type
      const isValidSignature = verifyWebhookSignature(pathname, body, signature)
      if (!isValidSignature) {
        return new NextResponse('Invalid signature', { status: 401 })
      }
    }
  }
  
  // Rate limiting
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const sanitizedIp = sanitizeString(ip)
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxRequests = 100 // Max requests per window

  if (!rateLimitMap.has(sanitizedIp)) {
    rateLimitMap.set(sanitizedIp, { count: 1, resetTime: now + windowMs })
  } else {
    const userLimit = rateLimitMap.get(sanitizedIp)
    if (now > userLimit.resetTime) {
      rateLimitMap.set(sanitizedIp, { count: 1, resetTime: now + windowMs })
    } else if (userLimit.count >= maxRequests) {
      return new NextResponse('Too Many Requests', { status: 429 })
    } else {
      userLimit.count++
    }
  }

  // Skip middleware for public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||  // Allow all API routes
    pathname === '/landing' ||
    pathname === '/login' ||
    pathname === '/login-simple' ||
    pathname === '/register' ||
    pathname === '/register-simple' ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Get token from cookies or Authorization header
  const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  
  // If no token and trying to access protected route, redirect to login
  if (!token && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login-simple', request.url))
  }

  // If token exists, set headers for API routes (let API routes handle JWT verification)
  if (token && pathname.startsWith('/api/')) {
    // Create response with authentication headers
    const response = NextResponse.next()
    
    // Pass token to API routes via header
    response.headers.set('x-auth-token', token)
    
    // Decode JWT and set user/business headers for API routes that need them
    try {
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        // No JWT secret configured - skip token decoding
        return response
      }
      const decoded = jwt.verify(token, jwtSecret) as any
      
      // JWT authentication is handled by individual API routes
      // No need to set deprecated headers
    } catch (error) {
      // If JWT is invalid, let the API route handle it
      // Silent fail - API routes will handle auth validation
    }
    
    // Enhanced security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()')
    response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none')
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
    
    // CORS headers for API routes
    response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://cloudgreet.com' : '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
    
    return response
  }

  // For non-API routes, just add security headers
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()')
  response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  
  return response
}

export const config = {
  matcher: [
    /*
    * Match all request paths except for the ones starting with:
    * - _next/static (static files)
    * - _next/image (image optimization files)
    * - favicon.ico (favicon file)
    */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
