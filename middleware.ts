import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

// Force Node.js runtime to avoid Edge Runtime JWT issues
export const runtime = 'nodejs'

// Rate limiting store (in production, use Redis)
const rateLimitMap = new Map()

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limiting
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxRequests = 100 // Max requests per window

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
  } else {
    const userLimit = rateLimitMap.get(ip)
    if (now > userLimit.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    } else if (userLimit.count >= maxRequests) {
      return new NextResponse('Too Many Requests', { status: 429 })
    } else {
      userLimit.count++
    }
  }

  // Skip middleware for public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/dashboard') ||
    pathname.startsWith('/api/telynyx/voice-webhook') ||
    pathname.startsWith('/api/telynyx/sms-webhook') ||
    pathname.startsWith('/api/stripe/webhook') ||
    pathname.startsWith('/api/admin') ||
    pathname === '/landing' ||
    pathname === '/login' ||
    pathname === '/register' ||
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
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If token exists, validate it and set headers for API routes
  if (token && pathname.startsWith('/api/')) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Create response with authentication headers
      const response = NextResponse.next()
      
      // Set user and business IDs for API routes
      if (decoded.userId) {
        response.headers.set('x-user-id', decoded.userId)
      }
      if (decoded.businessId) {
        response.headers.set('x-business-id', decoded.businessId)
      }
      if (decoded.email) {
        response.headers.set('x-user-email', decoded.email)
      }
      
      // Security headers
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
      response.headers.set('X-XSS-Protection', '1; mode=block')
      
      // CORS headers for API routes
      response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://cloudgreet.com' : '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      
      return response
      
    } catch (error) {
      // Invalid token - redirect to login for protected routes
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      
      // For API routes, return 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    }
  }

  // For non-API routes, just add security headers
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
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
