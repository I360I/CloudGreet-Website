import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { securitySchemas, sanitizeInput, sanitizePhoneNumber, securityHeaders } from '@/lib/security';

export const dynamic = 'force-dynamic'

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, areaCode = '555' } = body

    // Validate and sanitize input
    const sanitizedAreaCode = sanitizePhoneNumber(areaCode.toString())
    if (!/^\d{3}$/.test(sanitizedAreaCode)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid area code format'
      }, { status: 400 })
    }

    if (action === 'test-phone-provision') {
      // Test phone provisioning logic
      const demoNumber = `+1${sanitizedAreaCode}${Math.floor(Math.random() * 9000000) + 1000000}`
      
      // Log audit event
      await supabaseAdmin.from('audit_logs').insert({
        user_id: null,
        business_id: null,
        action_type: 'test_phone_provision',
        action_details: {
          demoNumber,
          areaCode: sanitizedAreaCode,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        },
        created_at: new Date().toISOString()
      }).catch(console.error)
      
      const response = NextResponse.json({
        success: true,
        message: 'Phone provisioning test successful',
        demoNumber: demoNumber,
        timestamp: new Date().toISOString()
      })

      // Add security headers
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    }

    if (action === 'provision-phone') {
      // Get token from Authorization header
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')
      const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
      
      // Decode JWT token
      const jwt = require('jsonwebtoken')
      const decoded = jwt.verify(token, jwtSecret)
      const userId = decoded.userId
      const userBusinessId = decoded.businessId

      if (!userId || !userBusinessId) {
        return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
      }

      // Check if Telnyx is configured
      if (!process.env.TELYNX_API_KEY) {
        // Generate a demo phone number for development
        const demoNumber = `+1${areaCode}${Math.floor(Math.random() * 9000000) + 1000000}`
        
        // Store the demo number
        const { data: phoneRecord, error: phoneError } = await supabaseAdmin
          .from('toll_free_numbers')
          .insert({
            number: demoNumber,
            business_id: userBusinessId,
            status: 'assigned',
            provider: 'demo',
            monthly_cost: 200,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (phoneError) {
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to store demo phone number',
            details: phoneError.message 
          }, { status: 500 })
        }

        // Update business with phone number
        const { error: businessError } = await supabaseAdmin
          .from('businesses')
          .update({ 
            phone_number: demoNumber,
            updated_at: new Date().toISOString()
          })
          .eq('id', userBusinessId)

        if (businessError) {
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to update business with phone number',
            details: businessError.message 
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Demo phone number provisioned successfully',
          phoneNumber: demoNumber,
          businessId: userBusinessId,
          timestamp: new Date().toISOString()
        })
      }

      // Real Telnyx integration would go here
      // For now, return demo mode message
      return NextResponse.json({
        success: false,
        message: 'Telnyx integration requires production API keys'
      }, { status: 503 })
    }

    if (action === 'activate-agent') {
      // Get token from Authorization header
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')
      const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
      
      // Decode JWT token
      const jwt = require('jsonwebtoken')
      const decoded = jwt.verify(token, jwtSecret)
      const userId = decoded.userId
      const userBusinessId = decoded.businessId

      if (!userId || !userBusinessId) {
        return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
      }

      // Activate AI agent
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('ai_agents')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('business_id', userBusinessId)
        .select()
        .single()

      if (agentError) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to activate AI agent',
          details: agentError.message 
        }, { status: 500 })
      }

      // Update business onboarding status
      const { error: businessError } = await supabaseAdmin
        .from('businesses')
        .update({ 
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userBusinessId)

      if (businessError) {
        console.warn('Failed to update business onboarding status:', businessError)
      }

      return NextResponse.json({
        success: true,
        message: 'AI agent activated successfully',
        agentId: agent?.id,
        businessId: userBusinessId,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid action'
    }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Basic health check
    const healthStatus: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    };

    // Test database connection
    try {
      const { data, error } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .limit(1);
      
      if (error) {
        healthStatus.status = 'degraded';
        healthStatus.database = 'error';
      } else {
        healthStatus.database = 'connected';
      }
    } catch (dbError) {
      healthStatus.status = 'degraded';
      healthStatus.database = 'error';
    }

    // Test external services
    const services = {
      resend: !!process.env.RESEND_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      telnyx: !!process.env.TELYNX_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    };

    healthStatus.services = services;

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log client-side errors
    if (body.error) {
      console.error('Client error:', body.error);
      
      // Store error in database for monitoring
      try {
        await supabaseAdmin.from('audit_logs').insert({
          action: 'client_error',
          details: {
            error: body.error,
            url: body.url,
            userAgent: request.headers.get('user-agent'),
            timestamp: new Date().toISOString(),
          },
        });
      } catch (dbError) {
        console.error('Failed to log client error to database:', dbError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling client error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process error log' },
      { status: 500 }
    );
  }
}