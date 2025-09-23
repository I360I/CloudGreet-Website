import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

const scoreLeadSchema = z.object({
  businessId: z.string().uuid('Valid business ID is required'),
  leadData: z.object({
    source: z.enum(['phone_call', 'website_form', 'referral', 'social_media', 'advertisement', 'other']),
    urgency: z.enum(['immediate', 'within_week', 'within_month', 'future']),
    budget: z.enum(['under_500', '500_1000', '1000_2500', '2500_5000', 'over_5000']).optional(),
    serviceType: z.string().min(1, 'Service type is required'),
    customerInfo: z.object({
      name: z.string().min(1, 'Customer name is required'),
      phone: z.string().min(10, 'Valid phone number is required'),
      email: z.string().email('Valid email is required').optional(),
      address: z.string().optional(),
      preferredContact: z.enum(['phone', 'email', 'sms']).default('phone')
    }),
    conversationNotes: z.string().optional(),
    appointmentRequested: z.boolean().default(false),
    followUpNeeded: z.boolean().default(true)
  })
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
    
    // Get scored leads for business
    const { data: leads, error } = await supabaseAdmin()
      .from('lead_scores')
      .select(`
        id,
        customer_name,
        customer_phone,
        customer_email,
        source,
        service_type,
        urgency,
        budget,
        score,
        status,
        created_at,
        updated_at
      `)
      .eq('business_id', businessId)
      .order('score', { ascending: false })
      .limit(50)
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch leads'
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        leads: leads || []
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Leads scoring GET API error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Fallback logging
    }
    
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
    const validatedData = scoreLeadSchema.parse(body)
    
    // Get business information
    const { data: business, error: businessError } = await supabaseAdmin()
      .from('businesses')
      .select('business_name, business_type, services')
      .eq('id', validatedData.businessId)
      .single()
    
    if (businessError || !business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }
    
    // Calculate lead score based on multiple factors
    let score = 0
    const factors = []
    
    // Source scoring (0-25 points)
    const sourceScores = {
      'phone_call': 25,
      'website_form': 20,
      'referral': 22,
      'social_media': 15,
      'advertisement': 18,
      'other': 10
    }
    score += sourceScores[validatedData.leadData.source] || 10
    factors.push(`Source: ${validatedData.leadData.source} (+${sourceScores[validatedData.leadData.source]})`)
    
    // Urgency scoring (0-30 points)
    const urgencyScores = {
      'immediate': 30,
      'within_week': 25,
      'within_month': 15,
      'future': 5
    }
    score += urgencyScores[validatedData.leadData.urgency] || 5
    factors.push(`Urgency: ${validatedData.leadData.urgency} (+${urgencyScores[validatedData.leadData.urgency]})`)
    
    // Budget scoring (0-20 points)
    if (validatedData.leadData.budget) {
      const budgetScores = {
        'under_500': 5,
        '500_1000': 10,
        '1000_2500': 15,
        '2500_5000': 20,
        'over_5000': 25
      }
      score += budgetScores[validatedData.leadData.budget] || 5
      factors.push(`Budget: ${validatedData.leadData.budget} (+${budgetScores[validatedData.leadData.budget]})`)
    }
    
    // Service type relevance (0-15 points)
    const businessServices = (business as any).services || []
    if (businessServices.includes(validatedData.leadData.serviceType)) {
      score += 15
      factors.push('Service match (+15)')
    } else {
      score += 5
      factors.push('Service partial match (+5)')
    }
    
    // Contact method bonus (0-10 points)
    if (validatedData.leadData.customerInfo.preferredContact === 'phone') {
      score += 10
      factors.push('Phone preference (+10)')
    } else if (validatedData.leadData.customerInfo.preferredContact === 'email') {
      score += 8
      factors.push('Email preference (+8)')
    } else {
      score += 6
      factors.push('SMS preference (+6)')
    }
    
    // Appointment request bonus (0-15 points)
    if (validatedData.leadData.appointmentRequested) {
      score += 15
      factors.push('Appointment requested (+15)')
    }
    
    // Follow-up needed penalty (-5 points)
    if (validatedData.leadData.followUpNeeded) {
      score -= 5
      factors.push('Follow-up needed (-5)')
    }
    
    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score))
    
    // Determine lead status based on score
    let status = 'cold'
    if (score >= 80) status = 'hot'
    else if (score >= 60) status = 'warm'
    else if (score >= 40) status = 'lukewarm'
    
    // Store lead score in database
    const { data: leadScore, error: leadError } = await supabaseAdmin()
      .from('lead_scores')
      .insert({
        business_id: validatedData.businessId,
        customer_name: validatedData.leadData.customerInfo.name,
        customer_phone: validatedData.leadData.customerInfo.phone,
        customer_email: validatedData.leadData.customerInfo.email || null,
        customer_address: validatedData.leadData.customerInfo.address || null,
        source: validatedData.leadData.source,
        service_type: validatedData.leadData.serviceType,
        urgency: validatedData.leadData.urgency,
        budget: validatedData.leadData.budget || null,
        preferred_contact: validatedData.leadData.customerInfo.preferredContact,
        conversation_notes: validatedData.leadData.conversationNotes || null,
        appointment_requested: validatedData.leadData.appointmentRequested,
        follow_up_needed: validatedData.leadData.followUpNeeded,
        score: score,
        status: status,
        scoring_factors: factors,
        created_at: new Date().toISOString()
      } as any)
      .select()
      .single()
    
    if (leadError || !leadScore) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save lead score'
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      error_message: 'Lead scored successfully',
      data: {
        leadId: (leadScore as any).id,
        score: score,
        status: status,
        factors: factors,
        customerName: validatedData.leadData.customerInfo.name,
        businessName: (business as any).business_name,
        recommendedAction: getRecommendedAction(score, status)
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Leads scoring POST API error',
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
      error: 'Failed to score lead. Please try again.'
    }, { status: 500 })
  }
}

function getRecommendedAction(score: number, status: string): string {
  if (score >= 80) {
    return 'Call immediately - Hot lead ready to close'
  } else if (score >= 60) {
    return 'Call within 2 hours - Warm lead with high potential'
  } else if (score >= 40) {
    return 'Follow up within 24 hours - Nurture relationship'
  } else {
    return 'Add to nurture sequence - Long-term potential'
  }
}
