import { NextResponse } from 'next/server'

// Environment variable definitions for health check endpoint
const envVarDefinitions = {
  CRITICAL: [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      description: 'Supabase project URL',
      validation: (val: string) => val && val.startsWith('https://') && val.includes('.supabase.co'),
      whatBreaks: 'User registration, login, dashboard, all data storage'
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      description: 'Supabase anonymous key',
      validation: (val: string) => val && val.length > 50,
      whatBreaks: 'Client-side database access, authentication'
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      description: 'Supabase service role key',
      validation: (val: string) => val && val.length > 50,
      whatBreaks: 'Server-side database operations'
    },
    {
      name: 'JWT_SECRET',
      description: 'JWT signing secret',
      validation: (val: string) => val && val.length >= 32,
      whatBreaks: 'User authentication, protected routes'
    }
  ],
  REQUIRED: [
    {
      name: 'TELNYX_API_KEY',
      altNames: ['TELYNX_API_KEY'],
      description: 'Telnyx API key',
      validation: (val: string) => val && val.length > 20,
      whatBreaks: 'Phone provisioning, SMS, voice calls'
    },
    {
      name: 'RETELL_API_KEY',
      altNames: ['NEXT_PUBLIC_RETELL_API_KEY'],
      description: 'Retell AI API key',
      validation: (val: string) => val && val.length > 20,
      whatBreaks: 'Voice AI conversations, call handling'
    },
    {
      name: 'OPENAI_API_KEY',
      description: 'OpenAI API key',
      validation: (val: string) => val && val.startsWith('sk-'),
      whatBreaks: 'AI conversations, GPT-4 functionality'
    },
    {
      name: 'STRIPE_SECRET_KEY',
      description: 'Stripe secret key',
      validation: (val: string) => val && val.startsWith('sk_'),
      whatBreaks: 'Subscriptions, payments, billing'
    },
    {
      name: 'NEXT_PUBLIC_APP_URL',
      description: 'Application base URL',
      validation: (val: string) => val && (val.startsWith('http://') || val.startsWith('https://')),
      whatBreaks: 'Webhooks, OAuth callbacks'
    }
  ],
  OPTIONAL: [] // Optional environment variables
}

/**
 * Environment Variables Health Check Endpoint
 * 
 * This endpoint checks which environment variables are set/valid
 * without exposing their actual values for security.
 * 
 * Returns a JSON response with:
 * - Status of critical, required, and optional variables
 * - What breaks if variables are missing
 * - Recommendations for setup
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface EnvVarStatus {
  name: string
  status: 'present' | 'missing' | 'invalid'
  description: string
  whatBreaks?: string
  fallback?: string
}

export async function GET() {
  try {
    const status: {
      critical: EnvVarStatus[]
      required: EnvVarStatus[]
      optional: EnvVarStatus[]
      summary: {
        criticalPassed: number
        criticalTotal: number
        requiredPassed: number
        requiredTotal: number
        optionalSet: number
        optionalTotal: number
      }
      healthy: boolean
    } = {
      critical: [],
      required: [],
      optional: [],
      summary: {
        criticalPassed: 0,
        criticalTotal: envVarDefinitions.CRITICAL.length,
        requiredPassed: 0,
        requiredTotal: envVarDefinitions.REQUIRED.length,
        optionalSet: 0,
        optionalTotal: envVarDefinitions.OPTIONAL.length
      },
      healthy: false
    }

    // Check CRITICAL variables
    for (const envVar of envVarDefinitions.CRITICAL) {
      const value = process.env[envVar.name]
      const isValid = value && envVar.validation(value)
      
      status.critical.push({
        name: envVar.name,
        status: isValid ? 'present' : 'missing',
        description: envVar.description,
        whatBreaks: envVar.whatBreaks
      })

      if (isValid) {
        status.summary.criticalPassed++
      }
    }

    // Check REQUIRED variables
    for (const envVar of envVarDefinitions.REQUIRED) {
      const value = process.env[envVar.name] || 
                   (envVar.altNames && envVar.altNames.map(n => process.env[n]).find(v => v))
      const isValid = value && envVar.validation(value)
      
      status.required.push({
        name: envVar.name,
        status: isValid ? 'present' : 'missing',
        description: envVar.description,
        whatBreaks: envVar.whatBreaks
      })

      if (isValid) {
        status.summary.requiredPassed++
      }
    }

    // Check OPTIONAL variables
    for (const envVar of envVarDefinitions.OPTIONAL) {
      const value = process.env[envVar.name] || 
                   (envVar.altNames && envVar.altNames.map(n => process.env[n]).find(v => v))
      const isValid = value && envVar.validation(value)
      
      status.optional.push({
        name: envVar.name,
        status: !value ? 'missing' : (isValid ? 'present' : 'invalid'),
        description: envVar.description,
        whatBreaks: envVar.whatBreaks,
        fallback: envVar.fallback
      })

      if (value && isValid) {
        status.summary.optionalSet++
      }
    }

    // Determine overall health
    status.healthy = 
      status.summary.criticalPassed === status.summary.criticalTotal &&
      status.summary.requiredPassed === status.summary.requiredTotal

    return NextResponse.json(status, {
      status: status.healthy ? 200 : 503, // 503 if not healthy (service unavailable)
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check environment variables',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

