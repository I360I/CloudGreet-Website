import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

const quoteSchema = z.object({
  business_id: z.string().uuid(),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_email: z.string().email('Valid email is required'),
  customer_phone: z.string().min(10, 'Valid phone number is required'),
  service_type: z.string().min(1, 'Service type is required'),
  description: z.string().min(10, 'Description is required'),
  estimated_value: z.number().min(0, 'Estimated value must be positive'),
  address: z.string().optional(),
  preferred_date: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const businessId = url.searchParams.get('business_id')
    
    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }
    
    // Get quotes for business
    const { data: quotes, error } = await supabaseAdmin()
      .from('quotes')
      .select(`
        id, customer_name, customer_email, customer_phone,
        service_type, description, estimated_value, status,
        created_at, updated_at, address, preferred_date
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch quotes'
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      quotes: quotes || [],
      count: quotes?.length || 0,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validatedData = quoteSchema.parse(body)
    
    // Create quote in database
    const { data: quote, error } = await supabaseAdmin()
      .from('quotes')
      .insert({
        business_id: validatedData.business_id,
        customer_name: validatedData.customer_name,
        customer_email: validatedData.customer_email,
        customer_phone: validatedData.customer_phone,
        service_type: validatedData.service_type,
        description: validatedData.description,
        estimated_value: validatedData.estimated_value,
        status: 'pending',
        address: validatedData.address || null,
        preferred_date: validatedData.preferred_date || null,
        created_at: new Date().toISOString()
      } as any)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create quote'
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      error_message: 'Quote created successfully',
      quote,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create quote'
    }, { status: 500 })
  }
}
