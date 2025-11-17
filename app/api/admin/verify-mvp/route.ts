import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Verify MVP Status
 * Checks if all critical components are in place
 */
export async function GET(request: NextRequest) {
  try {
    // Admin only
    const authResult = await requireAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const checks: Record<string, { status: 'ok' | 'missing' | 'error'; message?: string }> = {}

    // Check environment variables
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'TELNYX_API_KEY',
      'RETELL_API_KEY',
      'JWT_SECRET'
    ]

    requiredEnvVars.forEach(envVar => {
      checks[`env_${envVar}`] = {
        status: process.env[envVar] ? 'ok' : 'missing',
        message: process.env[envVar] ? undefined : `${envVar} not set`
      }
    })

    // Check critical database tables
    const criticalTables = [
      'businesses',
      'appointments',
      'calls',
      'ai_agents',
      'sms_messages',
      'background_jobs'
    ]

    for (const table of criticalTables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .select('id')
          .limit(1)

        if (error && error.code === '42P01') {
          checks[`table_${table}`] = {
            status: 'missing',
            message: `Table ${table} does not exist`
          }
        } else if (error) {
          checks[`table_${table}`] = {
            status: 'error',
            message: error.message
          }
        } else {
          checks[`table_${table}`] = {
            status: 'ok'
          }
        }
      } catch (err) {
        checks[`table_${table}`] = {
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error'
        }
      }
    }

    // Check database functions (try calling them - will error if missing)
    const criticalFunctions = [
      'create_appointment_safe',
      'complete_onboarding_safe'
    ]

    for (const funcName of criticalFunctions) {
      try {
        // Try calling function - if it doesn't exist, we'll get a specific error
        const { error } = await supabaseAdmin.rpc(funcName, {
          p_business_id: '00000000-0000-0000-0000-000000000000',
          p_customer_name: 'test',
          p_customer_phone: 'test',
          p_service_type: 'test',
          p_scheduled_date: new Date().toISOString()
        })

        // If function doesn't exist, error message will contain "does not exist"
        if (error) {
          const errorMsg = error.message.toLowerCase()
          if (errorMsg.includes('does not exist') || 
              errorMsg.includes('function') && errorMsg.includes('not found') ||
              errorMsg.includes('no function matches')) {
            checks[`function_${funcName}`] = {
              status: 'missing',
              message: `Function ${funcName} does not exist - run ADD_TRANSACTION_FUNCTIONS.sql migration`
            }
          } else {
            // Function exists but call failed (likely due to invalid params or constraints)
            checks[`function_${funcName}`] = {
              status: 'ok'
            }
          }
        } else {
          checks[`function_${funcName}`] = {
            status: 'ok'
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message.toLowerCase() : ''
        if (errMsg.includes('does not exist') || errMsg.includes('function') && errMsg.includes('not found')) {
          checks[`function_${funcName}`] = {
            status: 'missing',
            message: `Function ${funcName} does not exist`
          }
        } else {
          checks[`function_${funcName}`] = {
            status: 'error',
            message: `Could not verify: ${err instanceof Error ? err.message : 'Unknown error'}`
          }
        }
      }
    }

    // Calculate overall status
    const allChecks = Object.values(checks)
    const okCount = allChecks.filter(c => c.status === 'ok').length
    const missingCount = allChecks.filter(c => c.status === 'missing').length
    const errorCount = allChecks.filter(c => c.status === 'error').length

    const isReady = missingCount === 0 && errorCount === 0

    return NextResponse.json({
      ready: isReady,
      summary: {
        total: allChecks.length,
        ok: okCount,
        missing: missingCount,
        errors: errorCount
      },
      checks,
      message: isReady
        ? 'MVP is ready! All critical components are in place.'
        : `${missingCount} component(s) missing, ${errorCount} error(s) found.`
    })
  } catch (error) {
    return NextResponse.json(
      {
        ready: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Verification failed'
      },
      { status: 500 }
    )
  }
}

