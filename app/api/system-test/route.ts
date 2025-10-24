import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const testResults: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: {}
  }

  try {
    // Test 1: Environment Variables
    testResults.tests.environment = {
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      telnyx: !!process.env.TELNYX_API_KEY,
      resend: !!process.env.RESEND_API_KEY
    }

    // Test 2: Database Connection
    try {
      const { data, error } = await supabaseAdmin
        .from('businesses')
        .select('count')
        .limit(1)
      
      testResults.tests.database = {
        connected: !error,
        error: error?.message || null
      }
    } catch (dbError) {
      testResults.tests.database = {
        connected: false,
        error: dbError instanceof Error ? dbError.message : 'Unknown error'
      }
    }

    // Test 3: OpenAI API
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        }
      })
      
      testResults.tests.openai = {
        connected: openaiResponse.ok,
        status: openaiResponse.status,
        error: openaiResponse.ok ? null : await openaiResponse.text()
      }
    } catch (openaiError) {
      testResults.tests.openai = {
        connected: false,
        error: openaiError instanceof Error ? openaiError.message : 'Unknown error'
      }
    }

    // Test 4: Stripe API
    try {
      const stripeResponse = await fetch('https://api.stripe.com/v1/charges', {
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        }
      })
      
      testResults.tests.stripe = {
        connected: stripeResponse.ok,
        status: stripeResponse.status
      }
    } catch (stripeError) {
      testResults.tests.stripe = {
        connected: false,
        error: stripeError instanceof Error ? stripeError.message : 'Unknown error'
      }
    }

    // Test 5: Telnyx API
    try {
      const telnyxResponse = await fetch('https://api.telnyx.com/v2/phone_numbers', {
        headers: {
          'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        }
      })
      
      testResults.tests.telnyx = {
        connected: telnyxResponse.ok,
        status: telnyxResponse.status
      }
    } catch (telnyxError) {
      testResults.tests.telnyx = {
        connected: false,
        error: telnyxError instanceof Error ? telnyxError.message : 'Unknown error'
      }
    }

    // Calculate overall health
    const allTests = Object.values(testResults.tests)
    const passedTests = allTests.filter((test: any) => test.connected || test.status === 200).length
    const totalTests = allTests.length
    
    testResults.overall = {
      health: passedTests === totalTests ? 'healthy' : 'degraded',
      score: `${passedTests}/${totalTests}`,
      ready: passedTests >= 3 // Need at least database, openai, and one other
    }

    return NextResponse.json(testResults, { 
      status: testResults.overall.ready ? 200 : 503 
    })

  } catch (error: any) {
    testResults.error = error.message
    testResults.overall = {
      health: 'unhealthy',
      ready: false
    }
    
    return NextResponse.json(testResults, { status: 500 })
  }
}
