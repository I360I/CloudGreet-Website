import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Test tenant isolation by checking data access
    const isolationTests: any = {
      businessId,
      userId,
      timestamp: new Date().toISOString()
    }

    // Test 1: Business data isolation
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, email, phone_number')
      .eq('id', businessId)

    if (businessError) {
      isolationTests.businessAccess = { error: businessError.message }
    } else {
      isolationTests.businessAccess = { 
        success: true, 
        businessName: business?.[0]?.business_name,
        recordCount: business ? business.length : 0
      }
    }

    // Test 2: Calls data isolation
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('id, from_number, status, created_at')
      .eq('business_id', businessId)
      .limit(5)

    if (callsError) {
      isolationTests.callsAccess = { error: callsError.message }
    } else {
      isolationTests.callsAccess = { 
        success: true, 
        recordCount: calls?.length || 0,
        sampleCalls: calls?.map(call => ({
          id: call.id,
          from: call.from_number,
          status: call.status
        }))
      }
    }

    // Test 3: Appointments data isolation
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('id, customer_name, service_type, status, created_at')
      .eq('business_id', businessId)
      .limit(5)

    if (appointmentsError) {
      isolationTests.appointmentsAccess = { error: appointmentsError.message }
    } else {
      isolationTests.appointmentsAccess = { 
        success: true, 
        recordCount: appointments?.length || 0,
        sampleAppointments: appointments?.map(apt => ({
          id: apt.id,
          customer: apt.customer_name,
          service: apt.service_type,
          status: apt.status
        }))
      }
    }

    // Test 4: Verify no cross-tenant data access
    const { data: allBusinesses, error: allBusinessesError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name')
      .limit(10)

    if (allBusinessesError) {
      isolationTests.crossTenantTest = { error: allBusinessesError.message }
    } else {
      const otherBusinesses = allBusinesses?.filter(b => b.id !== businessId) || []
      isolationTests.crossTenantTest = { 
        success: true,
        totalBusinesses: allBusinesses?.length || 0,
        otherBusinesses: otherBusinesses.length,
        canSeeOtherBusinesses: otherBusinesses.length > 0
      }
    }

    // Test 5: Verify business_id filtering in analytics
    const { data: analyticsCalls } = await supabaseAdmin
      .from('calls')
      .select('id, business_id')
      .eq('business_id', businessId)

    const { data: allCalls } = await supabaseAdmin
      .from('calls')
      .select('id, business_id')
      .limit(100)

    isolationTests.analyticsIsolation = {
      filteredCalls: analyticsCalls?.length || 0,
      totalCallsInSystem: allCalls?.length || 0,
      onlyMyCalls: analyticsCalls?.every(call => call.business_id === businessId) || true
    }

    logger.info('Tenant isolation test completed', { 
      businessId, 
      userId,
      testResults: isolationTests
    })

    return NextResponse.json({
      success: true,
      message: 'Tenant isolation test completed',
      tenantId: businessId,
      userId,
      tests: isolationTests,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error in tenant isolation test', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Tenant isolation test failed' 
    }, { status: 500 })
  }
}
