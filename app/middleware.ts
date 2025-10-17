import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// In-memory rate limiting store (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  // Skip middleware for static assets and internal Next.js requests
  if (
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.startsWith('/robots.txt') ||
    request.nextUrl.pathname.startsWith('/sitemap.xml') ||
    request.nextUrl.pathname.startsWith('/manifest.json')
  ) {
    return NextResponse.next()
  }

  // Admin route protection
  if (request.nextUrl.pathname.startsWith('/admin/') && request.nextUrl.pathname !== '/admin/login') {
    const adminToken = request.cookies.get('adminToken')?.value
    
    if (!adminToken) {
      // Redirect to admin login
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Verify token (in production, verify JWT signature)
    try {
      // For now, just check if token exists and has basic format
      if (!adminToken || adminToken.length < 10) {
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      }
    } catch (error) {
      // Invalid token
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Rate limiting (simplified for performance)
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxRequests = 100 // Max requests per window

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
  } else {
    const userLimit = rateLimitMap.get(ip)!
    if (now > userLimit.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    } else if (userLimit.count >= maxRequests) {
      return new NextResponse('Too Many Requests', { status: 429 })
    } else {
      userLimit.count++
    }
  }

  // Create response with security headers
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Performance headers
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
  // CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://cloudgreet.ai' : '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  // Add performance timing header
  const duration = Date.now() - startTime
  response.headers.set('X-Response-Time', `${duration}ms`)

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
