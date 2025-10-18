import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const businessProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  businessType: z.enum(['HVAC', 'Paint', 'Roofing']).optional(),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone number is required'),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  services: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  businessHours: z.record(z.string(), z.any()).optional(),
  greetingMessage: z.string().min(1, 'Greeting message is required'),
  tone: z.enum(['professional', 'friendly', 'casual']).optional()
})

export async function GET(request: NextRequest) {
  try {
    // Ensure Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 500 })
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Decode JWT token
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

    // Get business profile
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .eq('owner_id', userId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get AI agent configuration
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('greeting_message, tone')
      .eq('business_id', businessId)
      .single()

    const profileData = {
      businessName: business.business_name,
      businessType: business.business_type,
      email: business.email,
      phone: business.phone,
      website: business.website,
      address: business.address,
      services: business.services || [],
      serviceAreas: business.service_areas || [],
      businessHours: business.business_hours || {},
      greetingMessage: agent?.greeting_message || business.greeting_message || '',
      tone: agent?.tone || business.ai_tone || 'professional'
    }

    return NextResponse.json(profileData)

  } catch (error) {
    logger.error('Error fetching business profile', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      userId: request.headers.get('x-user-id'),
      businessId: request.headers.get('x-business-id')
    })
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = businessProfileSchema.parse(body)

    // Update business record
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .update({
        business_name: validatedData.businessName,
        business_type: validatedData.businessType,
        email: validatedData.email,
        phone: validatedData.phone,
        website: validatedData.website,
        address: validatedData.address,
        services: validatedData.services,
        service_areas: validatedData.serviceAreas,
        business_hours: validatedData.businessHours,
        greeting_message: validatedData.greetingMessage,
        ai_tone: validatedData.tone,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .eq('owner_id', userId)
      .select()
      .single()

    if (businessError) {
      logger.error('Error updating business', { 
        error: businessError,  
        businessId, 
        userId 
      })
      return NextResponse.json({ error: 'Failed to update business' }, { status: 500 })
    }

    // Update AI agent configuration
    const { error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .update({
        greeting_message: validatedData.greetingMessage,
        tone: validatedData.tone,
        updated_at: new Date().toISOString()
      })
      .eq('business_id', businessId)

    if (agentError) {
      logger.error('Error updating AI agent', { 
        error: agentError,  
        businessId 
      })
    }

    logger.info('Business profile updated successfully', {
      businessId,
      userId,
      businessName: validatedData.businessName
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: business
    })

  } catch (error) {
    logger.error('Error updating business profile', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      userId: request.headers.get('x-user-id'),
      businessId: request.headers.get('x-business-id')
    })
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
