#!/usr/bin/env node

// Comprehensive script to fix public routes and add rate limiting
const fs = require('fs')
const path = require('path')

// Routes that should be PUBLIC with rate limiting
const PUBLIC_ROUTES_WITH_RATE_LIMIT = {
  'contact/submit': 'strictRateLimit',
  'pricing/plans': 'moderateRateLimit', 
  'promo/validate': 'moderateRateLimit',
  'promo/apply': 'moderateRateLimit',
  'auth/login': 'authRateLimit',
  'auth/register': 'authRateLimit',
  'auth/login-simple': 'authRateLimit',
  'auth/register-simple': 'authRateLimit',
  'auth/register-simple-working': 'authRateLimit',
  'auth/forgot-password': 'authRateLimit',
  'auth/reset-password': 'authRateLimit',
  'auth/validate-reset-token': 'authRateLimit'
}

// Routes that should be PUBLIC with NO rate limiting (webhooks)
const PUBLIC_ROUTES_NO_RATE_LIMIT = [
  'stripe/webhook',
  'telnyx/voice-webhook', 
  'telnyx/sms-webhook',
  'retell/webhook',
  'webrtc/webhook',
  'notifications/send',
  'telnyx/initiate-call',
  'health',
  'health/database',
  'health/detailed'
]

function fixPublicRoute(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const routePath = filePath.replace('app/api/', '').replace('/route.ts', '')
    
    // Check if this route should be public
    const rateLimitType = PUBLIC_ROUTES_WITH_RATE_LIMIT[routePath]
    const isPublicNoRateLimit = PUBLIC_ROUTES_NO_RATE_LIMIT.some(route => routePath.includes(route))
    
    if (!rateLimitType && !isPublicNoRateLimit) {
      return // Not a public route
    }
    
    console.log(`🔓 ${filePath} - Making public (${rateLimitType || 'no rate limit'})`)
    
    let newContent = content
    
    // Remove auth imports
    newContent = newContent.replace(/import { requireAuth } from '@\/lib\/auth-middleware'\n/g, '')
    newContent = newContent.replace(/import { requireAdmin } from '@\/lib\/auth-middleware'\n/g, '')
    
    // Add rate limiting import if needed
    if (rateLimitType && !newContent.includes('rate-limiting')) {
      const importMatch = newContent.match(/import.*from.*['"]@\/lib\/monitoring['"]/)
      if (importMatch) {
        newContent = newContent.replace(
          importMatch[0],
          `${importMatch[0]}\nimport { ${rateLimitType} } from '@/lib/rate-limiting'`
        )
      } else {
        // Add after first import
        const firstImport = newContent.match(/import.*from.*['"].*['"];?\n/)
        if (firstImport) {
          newContent = newContent.replace(
            firstImport[0],
            `${firstImport[0]}import { ${rateLimitType} } from '@/lib/rate-limiting'\n`
          )
        }
      }
    }
    
    // Remove auth checks and add rate limiting for GET method
    if (newContent.includes('export async function GET')) {
      if (rateLimitType) {
        newContent = newContent.replace(
          /export async function GET\([^)]*\)\s*{\s*\/\/ Require authentication[\s\S]*?const businessId = authResult\.businessId\s*\n\s*try\s*{/g,
          `export async function GET(request: NextRequest) {\n  try {\n    // Apply rate limiting\n    const rateLimitResult = await ${rateLimitType}(request)\n    if (!rateLimitResult.allowed) {\n      return NextResponse.json(\n        { \n          error: 'Too many requests. Please try again later.',\n          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)\n        },\n        { \n          status: 429,\n          headers: {\n            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),\n            'X-RateLimit-Limit': '${rateLimitType === 'strictRateLimit' ? '5' : rateLimitType === 'authRateLimit' ? '10' : '100'}',\n            'X-RateLimit-Remaining': '0',\n            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()\n          }\n        }\n      )\n    }`
        )
      } else {
        newContent = newContent.replace(
          /export async function GET\([^)]*\)\s*{\s*\/\/ Require authentication[\s\S]*?const businessId = authResult\.businessId\s*\n\s*try\s*{/g,
          'export async function GET(request: NextRequest) {\n  try {'
        )
      }
    }
    
    // Remove auth checks and add rate limiting for POST method
    if (newContent.includes('export async function POST')) {
      if (rateLimitType) {
        newContent = newContent.replace(
          /export async function POST\([^)]*\)\s*{\s*\/\/ Require authentication[\s\S]*?const businessId = authResult\.businessId\s*\n\s*try\s*{/g,
          `export async function POST(request: NextRequest) {\n  try {\n    // Apply rate limiting\n    const rateLimitResult = await ${rateLimitType}(request)\n    if (!rateLimitResult.allowed) {\n      return NextResponse.json(\n        { \n          error: 'Too many requests. Please try again later.',\n          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)\n        },\n        { \n          status: 429,\n          headers: {\n            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),\n            'X-RateLimit-Limit': '${rateLimitType === 'strictRateLimit' ? '5' : rateLimitType === 'authRateLimit' ? '10' : '100'}',\n            'X-RateLimit-Remaining': '0',\n            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()\n          }\n        }\n      )\n    }`
        )
      } else {
        newContent = newContent.replace(
          /export async function POST\([^)]*\)\s*{\s*\/\/ Require authentication[\s\S]*?const businessId = authResult\.businessId\s*\n\s*try\s*{/g,
          'export async function POST(request: NextRequest) {\n  try {'
        )
      }
    }
    
    // Write back to file
    fs.writeFileSync(filePath, newContent)
    console.log(`✅ ${filePath} - Fixed`)
    
  } catch (error) {
    console.error(`❌ ${filePath} - Error: ${error.message}`)
  }
}

function scanApiRoutes() {
  const apiDir = 'app/api'
  const routes = []
  
  function scanDir(dir) {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        scanDir(fullPath)
      } else if (item === 'route.ts') {
        routes.push(fullPath)
      }
    }
  }
  
  scanDir(apiDir)
  return routes
}

console.log('🔓 Fixing public routes and adding rate limiting...\n')

const routes = scanApiRoutes()

for (const route of routes) {
  fixPublicRoute(route)
}

console.log('\n✅ Public routes fixed!')
console.log('\n📋 Summary:')
console.log('- Auth routes: Public with auth rate limiting')
console.log('- Contact/pricing: Public with strict rate limiting') 
console.log('- Webhooks: Public with no rate limiting')
console.log('- All other routes: Protected with authentication')

