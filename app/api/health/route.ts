import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { securitySchemas, sanitizeInput, sanitizePhoneNumber, securityHeaders } from '@/lib/validation';

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

    // Removed test-phone-provision - was generating fake demo numbers

    if (action === 'provision-phone') {
      // Get token from Authorization header
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')
      const jwtSecret = process.env.JWT_SECRET
      
      // Decode JWT token
      const jwt = (await import('jsonwebtoken')).default
      const decoded = jwt.verify(token, jwtSecret) as any
      const userId = decoded.userId
      const userBusinessId = decoded.businessId

      if (!userId || !userBusinessId) {
        return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
      }

      // Check if Telnyx is configured
      if (!process.env.TELNYX_API_KEY) {
        return NextResponse.json({
          success: false,
          message: 'Telnyx not configured - phone provisioning unavailable'
        }, { status: 503 })
      }

      // Real Telnyx phone number purchasing
      try {
        const telnyxResponse = await fetch('https://api.telnyx.com/v2/phone_numbers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone_number: `+1${areaCode}${Math.floor(Math.random() * 9000000) + 1000000}`,
            connection_id: process.env.TELYNX_CONNECTION_ID
          })
        })

        if (!telnyxResponse.ok) {
          const errorData = await telnyxResponse.text()
          return NextResponse.json({
            success: false,
            message: 'Failed to purchase phone number from Telnyx',
            details: errorData
          }, { status: 500 })
        }

        const phoneData = await telnyxResponse.json()
        const phoneNumber = phoneData.data.phone_number

        // Store the real phone number in database
        const { data: phoneRecord, error: phoneError } = await supabaseAdmin
          .from('toll_free_numbers')
          .insert({
            number: phoneNumber,
            business_id: userBusinessId,
            status: 'assigned',
            provider: 'telnyx',
            monthly_cost: 200,
            telnyx_phone_id: phoneData.data.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (phoneError) {
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to store phone number',
            details: phoneError.message 
          }, { status: 500 })
        }

        // Update business with real phone number
        const { error: businessError } = await supabaseAdmin
          .from('businesses')
          .update({ 
            phone_number: phoneNumber,
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
          message: 'Real phone number purchased and assigned successfully',
          phoneNumber: phoneNumber,
          businessId: userBusinessId,
          telnyxId: phoneData.data.id,
          timestamp: new Date().toISOString()
        })

      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'Phone number purchase failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    if (action === 'activate-agent') {
      // Get token from Authorization header
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')
      const jwtSecret = process.env.JWT_SECRET
      
      // Decode JWT token
      const jwt = (await import('jsonwebtoken')).default
      const decoded = jwt.verify(token, jwtSecret) as any
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
        // Business update warning is non-critical, skip logging
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
      telnyx: !!process.env.TELNYX_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    };

    healthStatus.services = services;

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error) {
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


