import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Security status check',
    timestamp: new Date().toISOString(),
    security: {
      ssl: request.url.startsWith('https://'),
      headers: {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.telnyx.com https://api.stripe.com https://xpyrovyhktapbvzdxaho.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
        'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
        'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()'
      }
    }
  })

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.telnyx.com https://api.stripe.com https://xpyrovyhktapbvzdxaho.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';")
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  
  return response
}
