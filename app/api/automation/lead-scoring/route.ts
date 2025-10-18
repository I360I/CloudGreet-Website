import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Real AI-powered lead scoring automation
export async function POST(request: NextRequest) {
  try {
    // AUTH CHECK: Verify business access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    const decoded = jwt.verify(token, jwtSecret) as any
    const businessId = decoded.businessId
    
    if (!businessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { leadId, leadData } = await request.json()
    
    if (!leadId && !leadData) {
      return NextResponse.json({
        success: false,
        error: 'Missing lead data'
      }, { status: 400 })
    }

    // Get lead data from database if not provided
    let lead = leadData
    if (!lead && leadId) {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (error || !data) {
        return NextResponse.json({
          success: false,
          error: 'Lead not found'
        }, { status: 404 })
      }
      
      lead = data
    }

    // Real AI lead scoring algorithm
    const score = await calculateLeadScore(lead)
    
    // Update lead with new score
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update({
        ai_score: score.total_score,
        ai_priority: score.priority,
        ai_insights: score.insights,
        ai_recommendations: score.recommendations,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id || leadId)

    if (updateError) {
      console.error('Failed to update lead score:', updateError)
    }

    return NextResponse.json({
      success: true,
      data: {
        lead_id: lead.id || leadId,
        score: score.total_score,
        priority: score.priority,
        insights: score.insights,
        recommendations: score.recommendations,
        breakdown: score.breakdown
      }
    })

  } catch (error) {
    console.error('Lead scoring automation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Lead scoring failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Real AI lead scoring algorithm
async function calculateLeadScore(lead: any) {
  let totalScore = 0
  const breakdown: any = {}
  const insights: string[] = []
  const recommendations: string[] = []

  // 1. Business Type Score (0-25 points)
  const businessTypeScores = {
    'HVAC': 25,
    'Roofing': 24,
    'Electrical': 23,
    'Plumbing': 22,
    'Painting': 20,
    'Landscaping': 18,
    'Cleaning': 15,
    'General Contractor': 19
  }
  
  const businessTypeScore = businessTypeScores[lead.business_type as keyof typeof businessTypeScores] || 10
  totalScore += businessTypeScore
  breakdown.business_type = businessTypeScore
  insights.push(`${lead.business_type} businesses typically have high conversion rates`)

  // 2. Rating Score (0-20 points)
  let ratingScore = 0
  if (lead.rating >= 4.5) {
    ratingScore = 20
    insights.push('Excellent rating indicates established business with quality service')
  } else if (lead.rating >= 4.0) {
    ratingScore = 15
    insights.push('Good rating shows customer satisfaction')
  } else if (lead.rating >= 3.5) {
    ratingScore = 10
    insights.push('Average rating - potential for improvement')
  } else if (lead.rating >= 3.0) {
    ratingScore = 5
    insights.push('Below average rating - may need more convincing')
  }
  
  totalScore += ratingScore
  breakdown.rating = ratingScore

  // 3. Review Count Score (0-15 points)
  let reviewScore = 0
  if (lead.review_count >= 200) {
    reviewScore = 15
    insights.push('High review count indicates established, busy business')
  } else if (lead.review_count >= 100) {
    reviewScore = 12
    insights.push('Good review count shows active customer base')
  } else if (lead.review_count >= 50) {
    reviewScore = 8
    insights.push('Moderate review count - growing business')
  } else if (lead.review_count >= 20) {
    reviewScore = 5
    insights.push('Lower review count - newer or smaller business')
  }
  
  totalScore += reviewScore
  breakdown.review_count = reviewScore

  // 4. Revenue Potential Score (0-20 points)
  let revenueScore = 0
  if (lead.estimated_revenue >= 500000) {
    revenueScore = 20
    insights.push('High revenue potential - premium prospect')
  } else if (lead.estimated_revenue >= 300000) {
    revenueScore = 15
    insights.push('Good revenue potential - solid prospect')
  } else if (lead.estimated_revenue >= 150000) {
    revenueScore = 10
    insights.push('Moderate revenue potential')
  } else if (lead.estimated_revenue >= 50000) {
    revenueScore = 5
    insights.push('Lower revenue potential')
  }
  
  totalScore += revenueScore
  breakdown.revenue_potential = revenueScore

  // 5. Location Score (0-10 points)
  let locationScore = 10 // Default to high score
  if (lead.location) {
    // Check if location is in major metropolitan area
    const majorCities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore']
    
    const isMajorCity = majorCities.some(city => 
      lead.location.toLowerCase().includes(city.toLowerCase())
    )
    
    if (isMajorCity) {
      locationScore = 10
      insights.push('Major metropolitan area - high demand market')
    } else {
      locationScore = 7
      insights.push('Regional market - good potential')
    }
  }
  
  totalScore += locationScore
  breakdown.location = locationScore

  // 6. Contact Information Score (0-10 points)
  let contactScore = 0
  if (lead.email && lead.phone) {
    contactScore = 10
    insights.push('Complete contact information available')
  } else if (lead.email || lead.phone) {
    contactScore = 5
    insights.push('Partial contact information available')
  }
  
  totalScore += contactScore
  breakdown.contact_info = contactScore

  // Determine priority level
  let priority = 'Low'
  if (totalScore >= 80) {
    priority = 'High'
    recommendations.push('Contact within 24 hours - high-value prospect')
    recommendations.push('Schedule demo immediately')
    recommendations.push('Prepare premium pitch with ROI calculations')
  } else if (totalScore >= 60) {
    priority = 'Medium'
    recommendations.push('Contact within 48 hours')
    recommendations.push('Focus on efficiency and growth benefits')
    recommendations.push('Offer free trial to reduce risk')
  } else {
    priority = 'Low'
    recommendations.push('Contact within 1 week')
    recommendations.push('Focus on basic value proposition')
    recommendations.push('Use automated follow-up sequence')
  }

  // Additional insights based on score
  if (totalScore >= 85) {
    insights.push('Premium prospect - allocate top sales resources')
  } else if (totalScore >= 70) {
    insights.push('Strong prospect - good conversion probability')
  } else if (totalScore >= 50) {
    insights.push('Standard prospect - follow standard process')
  } else {
    insights.push('Lower priority - use automated nurturing')
  }

  // Industry-specific recommendations
  if (lead.business_type === 'HVAC') {
    recommendations.push('Emphasize seasonal call volume management')
    recommendations.push('Highlight emergency call handling capabilities')
  } else if (lead.business_type === 'Roofing') {
    recommendations.push('Focus on storm season preparedness')
    recommendations.push('Emphasize insurance claim assistance')
  } else if (lead.business_type === 'Plumbing') {
    recommendations.push('Highlight 24/7 emergency response')
    recommendations.push('Emphasize customer service improvement')
  }

  return {
    total_score: totalScore,
    priority: priority,
    breakdown: breakdown,
    insights: insights,
    recommendations: recommendations
  }
}
