#!/usr/bin/env node

// Script to fix routes that shouldn't require authentication
const fs = require('fs')
const path = require('path')

// Routes that should NOT require auth (remove auth from these)
const NO_AUTH_ROUTES = [
  'auth/login',
  'auth/register', 
  'auth/forgot-password',
  'auth/reset-password',
  'auth/validate-reset-token',
  'auth/login-simple',
  'auth/register-simple',
  'auth/register-simple-working',
  'stripe/webhook',
  'telnyx/voice-webhook',
  'telnyx/sms-webhook',
  'retell/webhook',
  'webrtc/webhook',
  'notifications/send', // Used by webhooks
  'telnyx/initiate-call', // Public call initiation
  'contact/submit', // Public contact form
  'pricing/plans', // Public pricing
  'promo/validate',
  'promo/apply'
]

function removeAuthFromRoute(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Check if this route should not have auth
    const routePath = filePath.replace('app/api/', '').replace('/route.ts', '')
    const shouldRemoveAuth = NO_AUTH_ROUTES.some(route => routePath.includes(route))
    
    if (!shouldRemoveAuth) {
      return // Keep auth
    }
    
    console.log(`🔓 ${filePath} - Removing auth (should be public)`)
    
    // Remove requireAuth import
    let newContent = content.replace(/import { requireAuth } from '@\/lib\/auth-middleware'\n/g, '')
    newContent = newContent.replace(/import { requireAdmin } from '@\/lib\/auth-middleware'\n/g, '')
    
    // Remove auth checks from GET method
    newContent = newContent.replace(
      /export async function GET\(request: NextRequest\) \{\n\s*\/\/ Require authentication\n\s*const authResult = await requireAuth\(request\)\n\s*if \(!authResult\.success\) \{\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\n\s*\}\n\n\s*\/\/ Use businessId from auth\n\s*const businessId = authResult\.businessId\n\n/g,
      'export async function GET(request: NextRequest) {\n'
    )
    
    // Remove auth checks from POST method
    newContent = newContent.replace(
      /export async function POST\(request: NextRequest\) \{\n\s*\/\/ Require authentication\n\s*const authResult = await requireAuth\(request\)\n\s*if \(!authResult\.success\) \{\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\n\s*\}\n\n\s*\/\/ Use businessId from auth\n\s*const businessId = authResult\.businessId\n\n/g,
      'export async function POST(request: NextRequest) {\n'
    )
    
    // Remove admin auth checks
    newContent = newContent.replace(
      /export async function GET\(request: NextRequest\) \{\n\s*\/\/ Require admin authentication\n\s*const authResult = await requireAdmin\(request\)\n\s*if \(!authResult\.success\) \{\n\s*return NextResponse\.json\(\{ error: 'Admin access required' \}, \{ status: 403 \}\)\n\s*\}\n\n\s*\/\/ Use businessId from auth\n\s*const businessId = authResult\.businessId\n\n/g,
      'export async function GET(request: NextRequest) {\n'
    )
    
    newContent = newContent.replace(
      /export async function POST\(request: NextRequest\) \{\n\s*\/\/ Require admin authentication\n\s*const authResult = await requireAdmin\(request\)\n\s*if \(!authResult\.success\) \{\n\s*return NextResponse\.json\(\{ error: 'Admin access required' \}, \{ status: 403 \}\)\n\s*\}\n\n\s*\/\/ Use businessId from auth\n\s*const businessId = authResult\.businessId\n\n/g,
      'export async function POST(request: NextRequest) {\n'
    )
    
    // Write back to file
    fs.writeFileSync(filePath, newContent)
    console.log(`✅ ${filePath} - Auth removed`)
    
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

console.log('🔓 Removing authentication from public routes...\n')

const routes = scanApiRoutes()

for (const route of routes) {
  removeAuthFromRoute(route)
}

console.log('\n✅ Public route authentication cleanup complete!')
console.log('\n📋 Fixed routes:')
console.log('- Auth routes (login/register) - No auth required')
console.log('- Webhook routes - No auth required') 
console.log('- Public API endpoints - No auth required')
console.log('- Contact/pricing pages - No auth required')
