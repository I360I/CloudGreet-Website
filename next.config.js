/** @type {import('next').NextConfig} */

// Skip env validation during build - Vercel handles env vars separately
// Only validate in runtime, not during build phase
if (process.env.NODE_ENV === 'production' && 
    !process.env.SKIP_ENV_VALIDATION && 
    !process.env.NEXT_PHASE && 
    !process.env.VERCEL && 
    !process.env.VERCEL_ENV &&
    process.env.NEXT_RUNTIME !== 'nodejs') {
  try {
    require('./lib/env-validation.js').validateEnv()
  } catch (error) {
    console.error('Environment validation failed:', error.message)
    // Don't exit during build - Vercel will handle env vars
    if (!process.env.VERCEL && !process.env.VERCEL_ENV) {
      process.exit(1)
    }
  }
}

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
    // The /admin/quality eval reads its scenario + business fixtures
    // and the rubric.md off disk at runtime in the API route. Tell
    // Vercel's file tracer to bundle them with the serverless function
    // or it'll 500 with ENOENT in prod.
    outputFileTracingIncludes: {
      '/api/admin/quality/**': [
        './scripts/prompt-research/banks/**/*',
        // The Failure-Reading Agent reads these three files off disk
        // to feed the analyst as context. Without explicit tracing
        // Vercel doesn't bundle them and analyze 500s with ENOENT.
        './lib/agent-builder/v21-system-prompt.ts',
        './lib/agent-builder/universal-layer.ts',
        './lib/agent-builder/generate.ts',
      ],
    },
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    // Landing-page photography is served from Unsplash (free, commercial
    // license). Curated in the PHOTOS array in app/page.tsx - swap to /public
    // files later without touching this config.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
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
  async redirects() {
    return [
      { source: '/landing', destination: '/', permanent: true },
      { source: '/start', destination: '/contact', permanent: true },
      { source: '/onboarding', destination: '/contact', permanent: true },
      { source: '/register-simple', destination: '/contact', permanent: true },
      { source: '/test-agent-simple', destination: '/contact', permanent: true },
      { source: '/demo', destination: '/contact', permanent: true },
    ]
  },
  // Security headers (production-grade)
  async headers() {
    return [
      {
        // CRITICAL: never let the edge cache API responses by URL alone.
        // We had `public, s-maxage=60` here previously, which caused
        // Vercel's CDN to serve User A's cached response (including
        // their auth token + dashboard data) to User B if User B hit
        // the same URL within 60 seconds. The cache key is URL-only;
        // httpOnly cookies are NOT part of it. Cross-tenant data leak.
        //
        // `private, no-store, must-revalidate` = browser may keep a
        // copy for the same user, no shared cache, always revalidate.
        // Routes that genuinely benefit from edge caching (public
        // content, e.g. health checks) can override per-route.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, must-revalidate' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' }
        ]
      },
      {
        // Embeddable widget surfaces must load on customer websites: the /embed
        // iframe needs to be framable cross-origin, and widget.js is loaded
        // cross-origin as a <script>. These get frame-ancestors * + a
        // cross-origin resource policy instead of the global DENY below.
        source: '/embed/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Per-business, dynamic page: never let any CDN/browser cache it, so a
          // copy rendered mid-deploy (or for another business) can't be reused.
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
      {
        source: '/widget.js',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          // Short cache while we're iterating on the widget so changes show fast.
          { key: 'Cache-Control', value: 'public, max-age=60' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        // Everything EXCEPT the embed surfaces above (negative lookahead) gets
        // the strict security headers, including X-Frame-Options: DENY.
        source: '/((?!embed/|widget\\.js).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://app.cal.com https://cal.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://app.cal.com https://cal.com; font-src 'self' https://fonts.gstatic.com https://app.cal.com https://cal.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://api.openai.com https://api.retellai.com wss://api.retellai.com https://*.livekit.cloud wss://*.livekit.cloud https://api.telnyx.com https://api.resend.com https://app.cal.com https://cal.com wss://*.supabase.co https://*.supabase.co wss://*.telnyx.com https://*.telnyx.com; frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://app.cal.com https://cal.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';"
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
            value: 'geolocation=(), microphone=(self), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
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
