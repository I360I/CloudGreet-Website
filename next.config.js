/** @type {import('next').NextConfig} */

// Validate environment variables in production (but skip during build for type checking)
// Skip validation during Vercel build (NEXT_PHASE is set during build)
if (process.env.NODE_ENV === 'production' && !process.env.SKIP_ENV_VALIDATION && !process.env.NEXT_PHASE && !process.env.VERCEL) {
  try {
    require('./lib/env-validation.js').validateEnv()
  } catch (error) {
    console.error('Environment validation failed:', error.message)
    process.exit(1)
  }
}

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs']
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Performance optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // Static file optimization
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  // Cache optimization
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Security headers (production-grade)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://api.openai.com https://api.retellai.com https://api.telnyx.com https://api.resend.com; frame-src 'self' https://js.stripe.com https://checkout.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self';"
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin'
          }
        ],
      },
    ]
  },
}

module.exports = nextConfig
