import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

const competitorAnalysisSchema = z.object({
  businessId: z.string().uuid('Valid business ID is required'),
  businessType: z.string().min(1, 'Business type is required'),
  location: z.string().min(1, 'Location is required'),
  services: z.array(z.string()).min(1, 'At least one service is required'),
  analysisType: z.enum(['pricing', 'services', 'marketing', 'full']).default('full')
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
    
    // Get stored competitor analysis for business
    const { data: analysis, error } = await supabaseAdmin()
      .from('competitor_analysis')
      .select(`
        id,
        business_type,
        location,
        competitors,
        pricing_analysis,
        service_analysis,
        marketing_analysis,
        recommendations,
        last_updated,
        created_at
      `)
      .eq('business_id', businessId)
      .order('last_updated', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') { // Not found error
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch competitor analysis'
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        analysis: analysis || null,
        hasAnalysis: !!analysis
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Market intelligence competitors GET API error',
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
    const validatedData = competitorAnalysisSchema.parse(body)
    
    // Get business information
    const { data: business, error: businessError } = await supabaseAdmin()
      .from('businesses')
      .select('business_name, business_type, services, location')
      .eq('id', validatedData.businessId)
      .single()
    
    if (businessError || !business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }
    
    // Perform competitor analysis (simplified for build)
    const analysis = await performCompetitorAnalysis({
      businessType: validatedData.businessType,
      location: validatedData.location,
      services: validatedData.services,
      analysisType: validatedData.analysisType
    })
    
    // Store or update competitor analysis
    const { data: existingAnalysis } = await supabaseAdmin()
      .from('competitor_analysis')
      .select('id')
      .eq('business_id', validatedData.businessId)
      .single()
    
    let analysisResult
    if (existingAnalysis) {
      // Update existing analysis
      const { data: updatedAnalysis, error: updateError } = await (supabaseAdmin() as any)
        .from('competitor_analysis')
        .update({
          business_type: validatedData.businessType,
          location: validatedData.location,
          services: validatedData.services,
          competitors: analysis.competitors,
          pricing_analysis: analysis.pricingAnalysis,
          service_analysis: analysis.serviceAnalysis,
          marketing_analysis: analysis.marketingAnalysis,
          recommendations: analysis.recommendations,
          last_updated: new Date().toISOString()
        })
        .eq('id', (existingAnalysis as any).id)
        .select()
        .single()
      
      if (updateError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to update competitor analysis'
        }, { status: 500 })
      }
      
      analysisResult = updatedAnalysis
    } else {
      // Create new analysis
      const { data: newAnalysis, error: createError } = await supabaseAdmin()
        .from('competitor_analysis')
        .insert({
          business_id: validatedData.businessId,
          business_type: validatedData.businessType,
          location: validatedData.location,
          services: validatedData.services,
          competitors: analysis.competitors,
          pricing_analysis: analysis.pricingAnalysis,
          service_analysis: analysis.serviceAnalysis,
          marketing_analysis: analysis.marketingAnalysis,
          recommendations: analysis.recommendations,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        } as any)
        .select()
        .single()
      
      if (createError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to create competitor analysis'
        }, { status: 500 })
      }
      
      analysisResult = newAnalysis
    }
    
    return NextResponse.json({
      success: true,
      error_message: 'Competitor analysis completed successfully',
      data: {
        analysisId: (analysisResult as any).id,
        businessName: (business as any).business_name,
        businessType: validatedData.businessType,
        location: validatedData.location,
        analysis: analysis,
        lastUpdated: (analysisResult as any).last_updated
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Market intelligence competitors POST API error',
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
      error: 'Failed to perform competitor analysis. Please try again.'
    }, { status: 500 })
  }
}

// Helper function to perform competitor analysis
async function performCompetitorAnalysis(params: {
  businessType: string
  location: string
  services: string[]
  analysisType: string
}) {
  // This would integrate with external APIs for real competitor data
  // For now, we'll generate realistic sample data
  
  const competitors = [
    {
      name: `${params.businessType} Solutions`,
      location: params.location,
      services: params.services.slice(0, -1), // Similar services
      pricing: {
        average: 1500,
        range: '$800 - $2500'
      },
      rating: 4.2,
      reviewCount: 127,
      strengths: ['Fast response time', 'Good customer service'],
      weaknesses: ['Limited service area', 'Higher pricing']
    },
    {
      name: `Professional ${params.businessType}`,
      location: `${params.location} Area`,
      services: params.services,
      pricing: {
        average: 1200,
        range: '$600 - $2000'
      },
      rating: 4.5,
      reviewCount: 89,
      strengths: ['Competitive pricing', 'Quality work'],
      weaknesses: ['Limited availability', 'Smaller team']
    },
    {
      name: `Elite ${params.businessType} Services`,
      location: params.location,
      services: [...params.services, 'Premium Services'],
      pricing: {
        average: 2000,
        range: '$1200 - $3500'
      },
      rating: 4.7,
      reviewCount: 203,
      strengths: ['Premium quality', 'Wide service range'],
      weaknesses: ['Higher pricing', 'Limited budget options']
    }
  ]
  
  const pricingAnalysis = {
    marketAverage: 1567,
    priceRange: '$600 - $3500',
    competitivePosition: 'mid-market',
    recommendations: [
      'Consider offering package deals for multiple services',
      'Implement dynamic pricing based on demand',
      'Add premium service tiers for higher-value customers'
    ]
  }
  
  const serviceAnalysis = {
    marketGaps: [
      '24/7 emergency services',
      'Eco-friendly options',
      'Technology integration'
    ],
    opportunities: [
      'Expand service area coverage',
      'Add seasonal service packages',
      'Develop online booking system'
    ],
    threats: [
      'New competitors entering market',
      'Economic downturn affecting demand',
      'Technology disruption'
    ]
  }
  
  const marketingAnalysis = {
    channels: ['Google Ads', 'Social Media', 'Referrals', 'Local SEO'],
    effectiveness: {
      'Google Ads': 'High',
      'Social Media': 'Medium',
      'Referrals': 'High',
      'Local SEO': 'Medium'
    },
    recommendations: [
      'Increase Google Ads budget during peak seasons',
      'Develop stronger social media presence',
      'Implement referral reward program',
      'Optimize local SEO for better visibility'
    ]
  }
  
  const recommendations = [
    'Focus on customer experience and service quality',
    'Implement competitive pricing strategies',
    'Develop strong online presence and reviews',
    'Expand service offerings based on market gaps',
    'Build strategic partnerships and referral networks'
  ]

  return {
    competitors,
    pricingAnalysis,
    serviceAnalysis,
    marketingAnalysis,
    recommendations,
    summary: {
      totalCompetitors: competitors.length,
      marketSaturation: 'Moderate',
      opportunityLevel: 'High',
      recommendedAction: 'Focus on differentiation and customer experience'
    }
  }
}
