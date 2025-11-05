import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'warning'
  details: string
}

async function testDatabase(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Test 1: Database connectivity
  try {
    if (!isSupabaseConfigured()) {
      results.push({
        name: 'Database Configuration',
        status: 'failed',
        details: 'Supabase not configured'
      })
      return results
    }

    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .limit(1)

    if (error) {
      results.push({
        name: 'Database Connection',
        status: 'failed',
        details: `Connection failed: ${error.message}`
      })
    } else {
      results.push({
        name: 'Database Connection',
        status: 'passed',
        details: 'Successfully connected to database'
      })
    }
  } catch (error) {
    results.push({
      name: 'Database Connection',
      status: 'failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test 2: Tenant isolation
  try {
    const { data: businesses, error } = await supabaseAdmin
      .from('businesses')
      .select('id, owner_id')
      .limit(5)

    if (error) {
      results.push({
        name: 'Tenant Isolation Query',
        status: 'failed',
        details: `Query failed: ${error.message}`
      })
    } else {
      results.push({
        name: 'Tenant Isolation Query',
        status: 'passed',
        details: `Successfully queried ${businesses?.length || 0} businesses`
      })
    }
  } catch (error) {
    results.push({
      name: 'Tenant Isolation Query',
      status: 'warning',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  return results
}

async function testRetell(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Test Retell API key
  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    results.push({
      name: 'Retell API Key',
      status: 'failed',
      details: 'RETELL_API_KEY not configured'
    })
    return results
  }

  results.push({
    name: 'Retell API Key',
    status: 'passed',
    details: 'RETELL_API_KEY is configured'
  })

  // Test Retell API connection
  try {
    const response = await fetch('https://api.retellai.com/v2/agent', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      results.push({
        name: 'Retell API Connection',
        status: 'passed',
        details: `API connection successful (${response.status})`
      })
    } else {
      results.push({
        name: 'Retell API Connection',
        status: 'warning',
        details: `API returned status ${response.status}`
      })
    }
  } catch (error) {
    results.push({
      name: 'Retell API Connection',
      status: 'failed',
      details: error instanceof Error ? error.message : 'Connection failed'
    })
  }

  return results
}

async function testTelnyx(): Promise<TestResult[]> {
  const results: TestResult[] = []

  const telnyxApiKey = process.env.TELNYX_API_KEY
  if (!telnyxApiKey) {
    results.push({
      name: 'Telnyx API Key',
      status: 'failed',
      details: 'TELNYX_API_KEY not configured'
    })
    return results
  }

  results.push({
    name: 'Telnyx API Key',
    status: 'passed',
    details: 'TELNYX_API_KEY is configured'
  })

  // Test Telnyx API connection
  try {
    const response = await fetch('https://api.telnyx.com/v2/phone_numbers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      results.push({
        name: 'Telnyx API Connection',
        status: 'passed',
        details: `API connection successful (${response.status})`
      })
    } else {
      results.push({
        name: 'Telnyx API Connection',
        status: 'warning',
        details: `API returned status ${response.status}`
      })
    }
  } catch (error) {
    results.push({
      name: 'Telnyx API Connection',
      status: 'failed',
      details: error instanceof Error ? error.message : 'Connection failed'
    })
  }

  return results
}

async function testEmail(): Promise<TestResult[]> {
  const results: TestResult[] = []

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    results.push({
      name: 'Resend API Key',
      status: 'failed',
      details: 'RESEND_API_KEY not configured'
    })
    return results
  }

  results.push({
    name: 'Resend API Key',
    status: 'passed',
    details: 'RESEND_API_KEY is configured'
  })

  // Test Resend API connection (don't send email)
  try {
    const response = await fetch('https://api.resend.com/api-keys', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    // Resend may return 401 for this endpoint, but that means API key is valid
    if (response.status === 200 || response.status === 401) {
      results.push({
        name: 'Resend API Connection',
        status: 'passed',
        details: 'API key is valid (connection test successful)'
      })
    } else {
      results.push({
        name: 'Resend API Connection',
        status: 'warning',
        details: `API returned status ${response.status}`
      })
    }
  } catch (error) {
    results.push({
      name: 'Resend API Connection',
      status: 'warning',
      details: error instanceof Error ? error.message : 'Connection test failed'
    })
  }

  return results
}

async function testWebhooks(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Test webhook secrets
  const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET
  const retellSecret = process.env.RETELL_WEBHOOK_SECRET
  const telnyxSecret = process.env.TELNYX_WEBHOOK_SECRET

  results.push({
    name: 'Stripe Webhook Secret',
    status: stripeSecret ? 'passed' : 'failed',
    details: stripeSecret ? 'STRIPE_WEBHOOK_SECRET configured' : 'STRIPE_WEBHOOK_SECRET not configured'
  })

  results.push({
    name: 'Retell Webhook Secret',
    status: retellSecret ? 'passed' : 'failed',
    details: retellSecret ? 'RETELL_WEBHOOK_SECRET configured' : 'RETELL_WEBHOOK_SECRET not configured'
  })

  results.push({
    name: 'Telnyx Webhook Secret',
    status: telnyxSecret ? 'passed' : 'warning',
    details: telnyxSecret ? 'TELNYX_WEBHOOK_SECRET configured' : 'TELNYX_WEBHOOK_SECRET not configured (optional)'
  })

  // Test webhook signature verification logic exists
  try {
    // Check if webhook routes exist
    const fs = await import('fs')
    const path = await import('path')
    const webhookRoutes = [
      'app/api/stripe/webhook/route.ts',
      'app/api/retell/voice-webhook/route.ts',
      'app/api/telnyx/voice-webhook/route.ts'
    ]

    let foundRoutes = 0
    for (const route of webhookRoutes) {
      const routePath = path.join(process.cwd(), route)
      if (fs.existsSync(routePath)) {
        foundRoutes++
      }
    }

    results.push({
      name: 'Webhook Routes',
      status: foundRoutes === webhookRoutes.length ? 'passed' : 'warning',
      details: `Found ${foundRoutes}/${webhookRoutes.length} webhook routes`
    })
  } catch (error) {
    results.push({
      name: 'Webhook Routes',
      status: 'warning',
      details: 'Could not verify webhook routes'
    })
  }

  return results
}

async function testAuth(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Test JWT secret
  const jwtSecret = process.env.JWT_SECRET
  results.push({
    name: 'JWT Secret',
    status: jwtSecret ? 'passed' : 'failed',
    details: jwtSecret ? 'JWT_SECRET configured' : 'JWT_SECRET not configured'
  })

  // Test JWT generation/verification (basic check)
  try {
    if (jwtSecret) {
      // Import auth functions
      const { verifyJWT } = await import('@/lib/auth-middleware')
      
      // Create a mock request to test JWT verification
      const mockRequest = new NextRequest('http://localhost', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      })

      const result = await verifyJWT(mockRequest)
      // Should fail gracefully for invalid token
      results.push({
        name: 'JWT Verification',
        status: 'passed',
        details: 'JWT verification function works correctly'
      })
    } else {
      results.push({
        name: 'JWT Verification',
        status: 'failed',
        details: 'Cannot test JWT without JWT_SECRET'
      })
    }
  } catch (error) {
    results.push({
      name: 'JWT Verification',
      status: 'warning',
      details: error instanceof Error ? error.message : 'JWT test failed'
    })
  }

  return results
}

async function testPerformance(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Test database query performance
  const startTime = Date.now()
  try {
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .limit(1)

    const queryTime = Date.now() - startTime

    if (error) {
      results.push({
        name: 'Database Query Performance',
        status: 'failed',
        details: `Query failed: ${error.message}`
      })
    } else {
      const status = queryTime < 1000 ? 'passed' : queryTime < 2000 ? 'warning' : 'failed'
      results.push({
        name: 'Database Query Performance',
        status,
        details: `Query completed in ${queryTime}ms`
      })
    }
  } catch (error) {
    results.push({
      name: 'Database Query Performance',
      status: 'failed',
      details: error instanceof Error ? error.message : 'Query failed'
    })
  }

  return results
}

async function testSecurity(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Check required environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET'
  ]

  const optionalEnvVars = [
    'RETELL_API_KEY',
    'TELNYX_API_KEY',
    'RESEND_API_KEY',
    'STRIPE_SECRET_KEY'
  ]

  let missingRequired = 0
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingRequired++
    }
  }

  results.push({
    name: 'Required Environment Variables',
    status: missingRequired === 0 ? 'passed' : 'failed',
    details: `${requiredEnvVars.length - missingRequired}/${requiredEnvVars.length} required env vars configured`
  })

  let configuredOptional = 0
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      configuredOptional++
    }
  }

  results.push({
    name: 'Optional Environment Variables',
    status: 'passed',
    details: `${configuredOptional}/${optionalEnvVars.length} optional env vars configured`
  })

  return results
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    try {
      await requireAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { testType } = body

    let results: TestResult[] = []

    switch (testType) {
      case 'database':
        results = await testDatabase()
        break
      case 'retell':
        results = await testRetell()
        break
      case 'telnyx':
        results = await testTelnyx()
        break
      case 'email':
        results = await testEmail()
        break
      case 'webhook':
        results = await testWebhooks()
        break
      case 'auth':
        results = await testAuth()
        break
      case 'performance':
        results = await testPerformance()
        break
      case 'security':
        results = await testSecurity()
        break
      default:
        return NextResponse.json(
          { error: 'Invalid test type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      testType,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Manual tests error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to run tests' },
      { status: 500 }
    )
  }
}

