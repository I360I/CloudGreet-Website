// Advanced AI Revenue Optimization API
// This will make you and your clients significantly more money

import { NextRequest, NextResponse } from 'next/server'
import { advancedAIFeatures } from '@/lib/advanced-ai-features'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const leadScoringSchema = z.object({
  businessId: z.string().uuid(),
  customerPhone: z.string(),
  urgency: z.enum(['high', 'medium', 'low']),
  budget: z.enum(['high', 'medium', 'low']),
  decisionMaker: z.boolean(),
  timeFrame: z.enum(['immediate', 'this_week', 'this_month', 'future']),
  previousCustomer: z.boolean(),
  referralSource: z.string(),
  serviceRequested: z.string()
})

const upsellAnalysisSchema = z.object({
  businessId: z.string().uuid(),
  customerId: z.string()
})

const pricingOptimizationSchema = z.object({
  businessId: z.string().uuid(),
  service: z.string(),
  customerProfile: z.object({
    budget: z.enum(['high', 'medium', 'low']),
    urgency: z.enum(['high', 'medium', 'low']),
    previousCustomer: z.boolean()
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'score_lead':
        const leadData = leadScoringSchema.parse(body)
        const scoringResult = await advancedAIFeatures.scoreLead(leadData)
        
        return NextResponse.json({
          success: true,
          data: scoringResult,
          recommendations: generateLeadRecommendations(scoringResult)
        })

      case 'analyze_upsells':
        const upsellData = upsellAnalysisSchema.parse(body)
        const upsellResult = await advancedAIFeatures.identifyUpsellOpportunities(
          upsellData.customerId, 
          upsellData.businessId
        )
        
        return NextResponse.json({
          success: true,
          data: upsellResult,
          recommendations: generateUpsellRecommendations(upsellResult)
        })

      case 'optimize_pricing':
        const pricingData = pricingOptimizationSchema.parse(body)
        const optimizedPrice = await advancedAIFeatures.optimizePricing(
          pricingData.businessId,
          pricingData.service,
          pricingData.customerProfile
        )
        
        return NextResponse.json({
          success: true,
          optimizedPrice,
          recommendations: generatePricingRecommendations(optimizedPrice, pricingData.customerProfile)
        })

      case 'analyze_competitors':
        const competitorData = z.object({
          businessId: z.string().uuid(),
          service: z.string()
        }).parse(body)
        
        const competitorResult = await advancedAIFeatures.analyzeCompetitors(
          competitorData.businessId,
          competitorData.service
        )
        
        return NextResponse.json({
          success: true,
          data: competitorResult
        })

      case 'retention_analysis':
        const retentionData = z.object({
          businessId: z.string().uuid()
        }).parse(body)
        
        const retentionResult = await advancedAIFeatures.analyzeCustomerRetention(
          retentionData.businessId
        )
        
        return NextResponse.json({
          success: true,
          data: retentionResult
        })

      case 'revenue_forecast':
        const forecastData = z.object({
          businessId: z.string().uuid(),
          months: z.number().min(1).max(12).default(3)
        }).parse(body)
        
        const forecastResult = await advancedAIFeatures.forecastRevenue(
          forecastData.businessId,
          forecastData.months
        )
        
        return NextResponse.json({
          success: true,
          data: forecastResult
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action specified'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Revenue optimization API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Revenue optimization failed'
    }, { status: 500 })
  }
}

// Helper functions for generating recommendations
function generateLeadRecommendations(scoring: any): string[] {
  const recommendations = []
  
  if (scoring.score >= 80) {
    recommendations.push('🔥 HIGH PRIORITY LEAD - Call immediately!')
    recommendations.push('Offer premium service options')
    recommendations.push('Schedule appointment within 24 hours')
  } else if (scoring.score >= 60) {
    recommendations.push('⚡ MEDIUM PRIORITY LEAD - Follow up today')
    recommendations.push('Present value-focused options')
    recommendations.push('Schedule appointment within 48 hours')
  } else {
    recommendations.push('📋 STANDARD LEAD - Follow up within 24 hours')
    recommendations.push('Focus on relationship building')
    recommendations.push('Provide educational content')
  }
  
  if (scoring.urgency === 'high') {
    recommendations.push('🚨 EMERGENCY - Quote emergency rates')
  }
  
  if (scoring.budget === 'high') {
    recommendations.push('💰 HIGH BUDGET - Present premium options first')
  }
  
  if (scoring.previousCustomer) {
    recommendations.push('🔄 REPEAT CUSTOMER - Offer loyalty discount')
  }
  
  return recommendations
}

function generateUpsellRecommendations(upsells: any): string[] {
  const recommendations = []
  
  if (upsells.totalUpsellValue > 500) {
    recommendations.push('💎 HIGH UPSELL POTENTIAL - Focus on premium services')
  }
  
  upsells.suggestedUpsells.forEach((upsell: any) => {
    if (upsell.conversionProbability > 0.7) {
      recommendations.push(`🎯 HIGH CONVERSION: ${upsell.service} (${Math.round(upsell.conversionProbability * 100)}% chance)`)
    }
  })
  
  return recommendations
}

function generatePricingRecommendations(price: number, profile: any): string[] {
  const recommendations = []
  
  if (profile.urgency === 'high') {
    recommendations.push('⚡ EMERGENCY PRICING APPLIED - 25% premium for urgent service')
  }
  
  if (profile.budget === 'high') {
    recommendations.push('💰 PREMIUM PRICING - Customer can afford higher rates')
  }
  
  if (profile.previousCustomer) {
    recommendations.push('🔄 LOYALTY DISCOUNT - 5% discount for repeat customer')
  }
  
  return recommendations
}
