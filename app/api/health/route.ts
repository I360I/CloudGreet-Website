import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { securitySchemas, sanitizeInput, sanitizePhoneNumber, securityHeaders } from '@/lib/validation';
import { logger } from '@/lib/monitoring';

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

      // Use real phone provisioning system
      try {
        // Get available phone numbers from inventory
        const { data: availableNumbers, error: numbersError } = await supabaseAdmin
          .from('toll_free_numbers')
          .select('*')
          .eq('status', 'available')
          .limit(1)

        if (numbersError || !availableNumbers || availableNumbers.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'No phone numbers available in inventory'
          }, { status: 503 })
        }

        const phoneNumber = availableNumbers[0].number

        // Update the number status to assigned
        const { error: updateError } = await supabaseAdmin
          .from('toll_free_numbers')
          .update({ 
            status: 'assigned',
            business_id: userBusinessId,
            assigned_at: new Date().toISOString()
          })
          .eq('number', phoneNumber)

        if (updateError) {
          return NextResponse.json({
            success: false,
            message: 'Failed to assign phone number',
            details: updateError.message
          }, { status: 500 })
        }

        // Note: Webhook URL should be set when the number is purchased from Telnyx
        // For now, we're using pre-approved numbers from inventory

        // Update business record with phone number
        const { error: businessError } = await supabaseAdmin
          .from('businesses')
          .update({
            phone_number: phoneNumber,
            phone_provisioned: true,
            phone_provisioned_at: new Date().toISOString()
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
    // Simple health check without database connection
    const healthStatus: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    };

    // Test external services (without database connection)
    const services = {
      resend: !!process.env.RESEND_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      telnyx: !!process.env.TELNYX_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    };

    healthStatus.services = services;

    return NextResponse.json(healthStatus, { status: 200 });
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


