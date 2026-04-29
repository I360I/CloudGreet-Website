#!/usr/bin/env node

// Script to add authentication to all API routes that need it
const fs = require('fs')
const path = require('path')

// Routes that should be PUBLIC (no auth required)
const PUBLIC_ROUTES = [
  // Auth routes
  'auth/login',
  'auth/register',
  'auth/forgot-password',
  'auth/reset-password',
  'auth/validate-reset-token',
  'auth/login-simple',
  'auth/register-simple',
  'auth/register-simple-working',
  
  // Webhooks (external services)
  'stripe/webhook',
  'telnyx/voice-webhook',
  'telnyx/sms-webhook',
  'retell/webhook',
  'webrtc/webhook',
  
  // Health checks
  'health',
  'health/database',
  'health/detailed',
  
  // Public pages
  'contact/submit',
  'pricing/plans',
  'promo/validate',
  'promo/apply',
  
  // Test routes (should be removed in production)
  'test',
  'test-simple',
  'test-register',
  'test-realtime',
  'test-real-analytics',
  'test-openai',
  'test-jwt',
  'test-db',
  'test-business-table',
  'test/voice-test',
  'test/call-flow',
  'test/realtime-call',
  'test-full-registration',
  'test-tenant-isolation',
  'test-supabase',
  'system-test',
  'check-tables',
  'diagnose-db',
  
  // Public API endpoints
  'notifications/send', // Used by webhooks
  'telnyx/initiate-call', // Public call initiation
]

// Routes that should be ADMIN ONLY
const ADMIN_ROUTES = [
  'admin',
]

function shouldRequireAuth(routePath) {
  // Check if it's a public route
  for (const publicRoute of PUBLIC_ROUTES) {
    if (routePath.includes(publicRoute)) {
      return false
    }
  }
  
  // Check if it's an admin route
  for (const adminRoute of ADMIN_ROUTES) {
    if (routePath.includes(adminRoute)) {
      return 'admin'
    }
  }
  
  // Everything else needs auth
  return true
}

function addAuthToRoute(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Skip if already has requireAuth
    if (content.includes('requireAuth')) {
      console.log(`✅ ${filePath} - Already has auth`)
      return
    }
    
    // Skip if it's a public route
    const routePath = filePath.replace('app/api/', '').replace('/route.ts', '')
    const authType = shouldRequireAuth(routePath)
    
    if (authType === false) {
      console.log(`🔓 ${filePath} - Public route (no auth needed)`)
      return
    }
    
    console.log(`🔒 ${filePath} - Adding auth (${authType === 'admin' ? 'admin' : 'user'})`)
    
    // Add import
    let newContent = content
    if (!content.includes("import { requireAuth }")) {
      const importMatch = content.match(/import.*from.*['"]@\/lib\/monitoring['"]/)
      if (importMatch) {
        newContent = content.replace(
          importMatch[0],
          `${importMatch[0]}\nimport { requireAuth } from '@/lib/auth-middleware'`
        )
      } else {
        // Add after first import
        const firstImport = content.match(/import.*from.*['"].*['"];?\n/)
        if (firstImport) {
          newContent = content.replace(
            firstImport[0],
            `${firstImport[0]}import { requireAuth } from '@/lib/auth-middleware'\n`
          )
        }
      }
    }
    
    // Add auth check to GET method
    if (newContent.includes('export async function GET')) {
      const getMatch = newContent.match(/export async function GET\([^)]*\)\s*{([^}]*)/)
      if (getMatch) {
        const authCheck = authType === 'admin' 
          ? `    // Require admin authentication\n    const authResult = await requireAdmin(request)\n    if (!authResult.success) {\n      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })\n    }\n\n    // Use businessId from auth\n    const businessId = authResult.businessId\n\n`
          : `    // Require authentication\n    const authResult = await requireAuth(request)\n    if (!authResult.success) {\n      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n    }\n\n    // Use businessId from auth\n    const businessId = authResult.businessId\n\n`
        
        newContent = newContent.replace(
          /export async function GET\([^)]*\)\s*{/,
          `export async function GET(request: NextRequest) {\n${authCheck}`
        )
      }
    }
    
    // Add auth check to POST method
    if (newContent.includes('export async function POST')) {
      const postMatch = newContent.match(/export async function POST\([^)]*\)\s*{([^}]*)/)
      if (postMatch) {
        const authCheck = authType === 'admin' 
          ? `    // Require admin authentication\n    const authResult = await requireAdmin(request)\n    if (!authResult.success) {\n      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })\n    }\n\n    // Use businessId from auth\n    const businessId = authResult.businessId\n\n`
          : `    // Require authentication\n    const authResult = await requireAuth(request)\n    if (!authResult.success) {\n      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n    }\n\n    // Use businessId from auth\n    const businessId = authResult.businessId\n\n`
        
        newContent = newContent.replace(
          /export async function POST\([^)]*\)\s*{/,
          `export async function POST(request: NextRequest) {\n${authCheck}`
        )
      }
    }
    
    // Write back to file
    fs.writeFileSync(filePath, newContent)
    console.log(`✅ ${filePath} - Auth added`)
    
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

console.log('🔒 Adding authentication to API routes...\n')

const routes = scanApiRoutes()
console.log(`Found ${routes.length} API routes\n`)

for (const route of routes) {
  addAuthToRoute(route)
}

console.log('\n✅ Authentication audit complete!')
console.log('\n📋 Next steps:')
console.log('1. Review the changes')
console.log('2. Test authentication on protected routes')
console.log('3. Ensure public routes still work')
console.log('4. Add tenant isolation checks where needed')

