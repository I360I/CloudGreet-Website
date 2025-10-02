import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    
    const body = await request.json()
    // Test database connection first
    const { data: testData, error: testError } = await supabase
      .from('businesses')
      .select('count')
      .limit(1)
    
    if (testError) {
      
      // If table doesn't exist, return a specific error
      if (testError.message.includes('relation "businesses" does not exist')) {
        return NextResponse.json({
          success: false,
          message: 'Database tables not set up. Please run the database setup first.',
          error: 'Tables not found',
          setup_required: true
        }, { status: 503 })
      }
      
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        error: testError.message
      }, { status: 500 })
    }
    
    
    // Create a simple business record
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        business_name: body.business_name || 'Test Business',
        business_type: body.business_type || 'Service',
        email: body.email || 'test@example.com',
        phone: body.phone || '1234567890',
        address: body.address || '123 Test St',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (businessError) {
      return NextResponse.json({
        success: false,
        message: 'Business creation failed',
        error: businessError.message,
        details: businessError
      }, { status: 500 })
    }
    
    
    return NextResponse.json({
      success: true,
      message: 'Simple registration successful',
      data: {
        business: {
          id: business.id,
          business_name: business.business_name,
          email: business.email
        }
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Registration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}