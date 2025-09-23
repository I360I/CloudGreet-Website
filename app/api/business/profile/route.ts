import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

const updateBusinessSchema = z.object({
  businessId: z.string().uuid('Valid business ID is required'),
  businessName: z.string().min(1, 'Business name is required').optional(),
  businessType: z.string().min(1, 'Business type is required').optional(),
  ownerName: z.string().min(1, 'Owner name is required').optional(),
  email: z.string().email('Valid email is required').optional(),
  phone: z.string().min(10, 'Valid phone number is required').optional(),
  website: z.string().url('Valid website URL is required').optional(),
  address: z.string().optional(),
  services: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  businessHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }),
    tuesday: z.object({ open: z.string(), close: z.string() }),
    wednesday: z.object({ open: z.string(), close: z.string() }),
    thursday: z.object({ open: z.string(), close: z.string() }),
    friday: z.object({ open: z.string(), close: z.string() }),
    saturday: z.object({ open: z.string(), close: z.string() }),
    sunday: z.object({ open: z.string(), close: z.string() })
  }).optional(),
  timezone: z.string().optional(),
  aiTone: z.enum(['professional', 'friendly', 'casual', 'formal']).optional(),
  greetingMessage: z.string().min(10, 'Greeting message must be at least 10 characters').optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }

    // Get business profile data
    const { data: business, error } = await supabaseAdmin()
      .from('businesses')
      .select(`
        id,
        business_name,
        business_type,
        owner_name,
        email,
        phone,
        website,
        address,
        services,
        service_areas,
        business_hours,
        timezone,
        ai_tone,
        greeting_message,
        phone_number,
        onboarding_completed,
        subscription_status,
        created_at,
        updated_at
      `)
      .eq('id', businessId)
      .single()

    if (error || !business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        business: business
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Business profile GET API error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Fallback logging
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch business profile'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validatedData = updateBusinessSchema.parse(body)
    
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (validatedData.businessName) updateData.business_name = validatedData.businessName
    if (validatedData.businessType) updateData.business_type = validatedData.businessType
    if (validatedData.ownerName) updateData.owner_name = validatedData.ownerName
    if (validatedData.email) updateData.email = validatedData.email
    if (validatedData.phone) updateData.phone = validatedData.phone
    if (validatedData.website) updateData.website = validatedData.website
    if (validatedData.address) updateData.address = validatedData.address
    if (validatedData.services) updateData.services = validatedData.services
    if (validatedData.serviceAreas) updateData.service_areas = validatedData.serviceAreas
    if (validatedData.businessHours) updateData.business_hours = validatedData.businessHours
    if (validatedData.timezone) updateData.timezone = validatedData.timezone
    if (validatedData.aiTone) updateData.ai_tone = validatedData.aiTone
    if (validatedData.greetingMessage) updateData.greeting_message = validatedData.greetingMessage

    // Update business profile
    const { data: business, error } = await (supabaseAdmin() as any)
      .from('businesses')
      .update(updateData)
      .eq('id', validatedData.businessId)
      .select()
      .single()

    if (error || !business) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update business profile'
      }, { status: 500 })
    }

    // Update AI agent if greeting message or tone changed
    if (validatedData.greetingMessage || validatedData.aiTone) {
      try {
        const agentUpdateData: any = {
          updated_at: new Date().toISOString()
        }
        if (validatedData.greetingMessage) agentUpdateData.greeting_message = validatedData.greetingMessage
        if (validatedData.aiTone) agentUpdateData.tone = validatedData.aiTone

        await (supabaseAdmin() as any)
          .from('ai_agents')
          .update(agentUpdateData)
          .eq('business_id', validatedData.businessId)
      } catch (agentError) {
        // Log agent update error but don't fail the business update
        try {
          await supabaseAdmin().from('error_logs').insert({
            error_type: 'api_warning',
            error_message: 'Failed to update AI agent after business profile update',
            details: agentError instanceof Error ? agentError.message : 'Unknown error',
            business_id: validatedData.businessId,
            created_at: new Date().toISOString()
          } as any)
        } catch (logError) {
          // Fallback logging
        }
      }
    }

    return NextResponse.json({
      success: true,
      error_message: 'Business profile updated successfully',
      data: {
        business: business
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Business profile POST API error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Fallback logging
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update business profile. Please try again.'
    }, { status: 500 })
  }
}
