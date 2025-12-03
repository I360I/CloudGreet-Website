import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import type { WebhookDiagnostics } from '@/lib/types/webhook-diagnostics'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Webhook Diagnostics Endpoint
 * Tests if webhooks are reachable and properly configured
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      baseUrl,
      webhooks: {
        retell: {
          url: `${baseUrl}/api/retell/voice-webhook`,
          status: 'unknown',
          error: null as string | null
        },
        telnyx: {
          url: `${baseUrl}/api/telnyx/voice-webhook`,
          status: 'unknown',
          error: null as string | null
        }
      },
      environment: {
        retellApiKey: !!process.env.RETELL_API_KEY,
        telnyxApiKey: !!process.env.TELNYX_API_KEY,
        telnyxConnectionId: !!process.env.TELNYX_CONNECTION_ID,
        stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
        appUrl: !!process.env.NEXT_PUBLIC_APP_URL
      }
    }

    // Test Retell webhook with ping
    try {
      const retellResponse = await fetch(`${baseUrl}/api/retell/voice-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ event: 'ping' })
      })

      const retellData = await retellResponse.json()
      
      if (retellResponse.ok && retellData.ok === true) {
        diagnostics.webhooks.retell.status = 'reachable'
      } else {
        diagnostics.webhooks.retell.status = 'error'
        diagnostics.webhooks.retell.error = `Status: ${retellResponse.status}, Response: ${JSON.stringify(retellData)}`
      }
    } catch (error) {
      diagnostics.webhooks.retell.status = 'unreachable'
      diagnostics.webhooks.retell.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test Telnyx webhook (it will fail signature verification, but we can check if it's reachable)
    try {
      const telnyxResponse = await fetch(`${baseUrl}/api/telnyx/voice-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          data: {
            event_type: 'call.initiated',
            call_control_id: 'test',
            to: '+1234567890',
            from: '+0987654321'
          }
        })
      })

      // Telnyx webhook will reject without proper signature, but 401 means it's reachable
      if (telnyxResponse.status === 401 || telnyxResponse.status === 400) {
        diagnostics.webhooks.telnyx.status = 'reachable'
        diagnostics.webhooks.telnyx.error = 'Webhook is reachable but requires proper signature (expected)'
      } else if (telnyxResponse.ok) {
        diagnostics.webhooks.telnyx.status = 'reachable'
      } else {
        diagnostics.webhooks.telnyx.status = 'error'
        diagnostics.webhooks.telnyx.error = `Status: ${telnyxResponse.status}`
      }
    } catch (error) {
      diagnostics.webhooks.telnyx.status = 'unreachable'
      diagnostics.webhooks.telnyx.error = error instanceof Error ? error.message : 'Unknown error'
    }

    logger.info('Webhook diagnostics completed', diagnostics)

    return NextResponse.json({
      success: true,
      diagnostics,
      recommendations: generateRecommendations(diagnostics)
    })

  } catch (error) {
    logger.error('Webhook diagnostics error', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

function generateRecommendations(diagnostics: WebhookDiagnostics): string[] {
  const recommendations: string[] = []

  if (diagnostics.webhooks.retell.status === 'unreachable') {
    recommendations.push('❌ Retell webhook is not reachable. Check that NEXT_PUBLIC_APP_URL is set correctly and matches your deployed URL.')
  } else if (diagnostics.webhooks.retell.status === 'reachable') {
    recommendations.push('✅ Retell webhook is reachable')
  }

  if (diagnostics.webhooks.telnyx.status === 'unreachable') {
    recommendations.push('❌ Telnyx webhook is not reachable. Check that NEXT_PUBLIC_APP_URL is set correctly and matches your deployed URL.')
  } else if (diagnostics.webhooks.telnyx.status === 'reachable') {
    recommendations.push('✅ Telnyx webhook is reachable')
  }

  if (!diagnostics.environment.retellApiKey) {
    recommendations.push('⚠️ RETELL_API_KEY is not set. Retell webhook signature verification will fail.')
  }

  if (!diagnostics.environment.telnyxApiKey) {
    recommendations.push('⚠️ TELNYX_API_KEY is not set. Phone calls will not work.')
  }

  if (!diagnostics.environment.telnyxConnectionId) {
    recommendations.push('⚠️ TELNYX_CONNECTION_ID is not set. Call bridging will fail.')
  }

  if (!diagnostics.environment.stripeSecretKey) {
    recommendations.push('⚠️ STRIPE_SECRET_KEY is not set. Per-booking charges will fail.')
  }

  if (!diagnostics.environment.appUrl) {
    recommendations.push('⚠️ NEXT_PUBLIC_APP_URL is not set. Webhook URLs may be incorrect.')
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All webhooks are reachable and environment variables are set. Ready for testing!')
  }

  return recommendations
}


