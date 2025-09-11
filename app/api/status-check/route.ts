import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        stripe: {
          status: 'checking',
          error: null,
          details: null
        },
        retell: {
          status: 'checking',
          error: null,
          details: null
        },
        resend: {
          status: 'checking',
          error: null,
          details: null
        },
        supabase: {
          status: 'checking',
          error: null,
          details: null
        }
      }
    }

    // Check Stripe
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY
      if (!stripeKey || stripeKey.includes('your-') || stripeKey.includes('demo-')) {
        status.services.stripe = {
          status: 'error',
          error: 'API key not configured',
          details: 'STRIPE_SECRET_KEY is missing or not properly configured'
        }
      } else {
        status.services.stripe = {
          status: 'ok',
          error: null,
          details: 'API key configured'
        }
      }
    } catch (error) {
      status.services.stripe = {
        status: 'error',
        error: 'Configuration error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Check Retell AI
    try {
      const retellKey = process.env.RETELL_API_KEY
      if (!retellKey || retellKey.includes('your-') || retellKey.includes('demo-')) {
        status.services.retell = {
          status: 'error',
          error: 'API key not configured',
          details: 'RETELL_API_KEY is missing or not properly configured'
        }
      } else {
        // Test the API key with a simple request
        const testResponse = await fetch('https://api.retellai.com/v2/list-agents?limit=1', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${retellKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (testResponse.ok) {
          status.services.retell = {
            status: 'ok',
            error: null,
            details: 'API key valid and working'
          }
        } else {
          const errorText = await testResponse.text()
          status.services.retell = {
            status: 'error',
            error: `API request failed (${testResponse.status})`,
            details: errorText
          }
        }
      }
    } catch (error) {
      status.services.retell = {
        status: 'error',
        error: 'Network or configuration error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Check Resend
    try {
      const resendKey = process.env.RESEND_API_KEY
      if (!resendKey || resendKey.includes('your-') || resendKey.includes('demo-')) {
        status.services.resend = {
          status: 'error',
          error: 'API key not configured',
          details: 'RESEND_API_KEY is missing or not properly configured'
        }
      } else {
        status.services.resend = {
          status: 'warning',
          error: 'Domain verification required',
          details: 'cloudgreet.com domain needs to be verified in Resend dashboard'
        }
      }
    } catch (error) {
      status.services.resend = {
        status: 'error',
        error: 'Configuration error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Check Supabase
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        status.services.supabase = {
          status: 'error',
          error: 'Configuration missing',
          details: 'Supabase URL or key not configured'
        }
      } else {
        status.services.supabase = {
          status: 'ok',
          error: null,
          details: 'Configuration present'
        }
      }
    } catch (error) {
      status.services.supabase = {
        status: 'error',
        error: 'Configuration error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Calculate overall status
    const serviceStatuses = Object.values(status.services).map(s => s.status)
    const hasErrors = serviceStatuses.includes('error')
    const hasWarnings = serviceStatuses.includes('warning')
    
    const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok'

    return NextResponse.json({
      overall: overallStatus,
      ...status,
      recommendations: generateRecommendations(status.services)
    })

  } catch (error) {
    return NextResponse.json({
      overall: 'error',
      error: 'Failed to check service status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateRecommendations(services: any) {
  const recommendations = []

  if (services.stripe.status === 'error') {
    recommendations.push({
      service: 'Stripe',
      action: 'Add STRIPE_SECRET_KEY to .env.local',
      priority: 'high',
      description: 'Required for payment processing and subscriptions'
    })
  }

  if (services.retell.status === 'error') {
    recommendations.push({
      service: 'Retell AI',
      action: 'Add RETELL_API_KEY to .env.local',
      priority: 'high',
      description: 'Required for AI agent creation and call handling'
    })
  }

  if (services.resend.status === 'warning') {
    recommendations.push({
      service: 'Resend',
      action: 'Verify cloudgreet.com domain in Resend dashboard',
      priority: 'medium',
      description: 'Required for sending emails from your domain'
    })
  }

  if (services.supabase.status === 'error') {
    recommendations.push({
      service: 'Supabase',
      action: 'Add Supabase URL and keys to .env.local',
      priority: 'high',
      description: 'Required for user authentication and data storage'
    })
  }

  return recommendations
}

