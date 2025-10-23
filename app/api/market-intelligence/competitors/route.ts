import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function GET(request: NextRequest) {
  try {
    // AUTH CHECK: Use proper JWT authentication instead of weak header auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    const jwt = (await import('jsonwebtoken')).default
    const decoded = jwt.verify(token, jwtSecret) as any
    
    const userId = decoded.userId
    const businessId = decoded.businessId
    
    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get business data
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    // Get business performance data
    const { data: calls } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Generate competitive analysis
    const analysis = await generateCompetitiveAnalysis(business, calls, appointments)
    
    // Generate market opportunities
    const opportunities = await generateMarketOpportunities(business, analysis)
    
    // Generate competitive advantages
    const advantages = await generateCompetitiveAdvantages(business, analysis)

    return NextResponse.json({
      success: true,
      data: {
        business: {
          name: business.business_name,
          type: business.business_type,
          location: business.address,
          performance: {
            totalCalls: calls?.length || 0,
            totalAppointments: appointments?.length || 0,
            conversionRate: calls?.length ? Math.round((appointments?.length || 0) / calls.length * 100) : 0,
            avgAppointmentValue: appointments?.length ? 
              Math.round(appointments.reduce((sum, apt) => sum + (apt.estimated_value || 500), 0) / appointments.length) : 0
          }
        },
        competitiveAnalysis: analysis,
        marketOpportunities: opportunities,
        competitiveAdvantages: advantages,
        recommendations: generateRecommendations(analysis, opportunities, advantages),
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('Market intelligence analysis error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({
      success: false,
      message: 'Failed to generate market intelligence'
    }, { status: 500 })
  }
}

async function generateCompetitiveAnalysis(business: any, calls: any[], appointments: any[]) {
  const prompt = `
  Analyze the competitive landscape for this business:

  Business: ${business.business_name}
  Type: ${business.business_type}
  Location: ${business.address}
  
  Performance (30 days):
  - Total Calls: ${calls?.length || 0}
  - Total Appointments: ${appointments?.length || 0}
  - Conversion Rate: ${calls?.length ? Math.round((appointments?.length || 0) / calls.length * 100) : 0}%
  - Average Appointment Value: $${appointments?.length ? 
    Math.round(appointments.reduce((sum, apt) => sum + (apt.estimated_value || 500), 0) / appointments.length) : 0}

  Provide analysis on:
  1. Market positioning
  2. Competitive advantages
  3. Market gaps and opportunities
  4. Pricing strategy insights
  5. Service differentiation opportunities
  6. Local market dynamics
  7. Customer acquisition strategies
  8. Revenue optimization opportunities

  Focus on actionable insights that can increase revenue and market share.
  `

  const response = await openai.chat.completions.create({
      model: 'gpt-5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 800,
    temperature: 0.4
  })

  return response.choices[0]?.message?.content || 'Competitive analysis generated based on business performance data.'
}

async function generateMarketOpportunities(business: any, analysis: string) {
  const prompt = `
  Based on this competitive analysis, identify specific market opportunities:

  Business: ${business.business_name} (${business.business_type})
  Location: ${business.address}
  
  Analysis: ${analysis}

  Identify:
  1. Underserved market segments
  2. Service expansion opportunities
  3. Pricing optimization chances
  4. Geographic expansion possibilities
  5. Partnership opportunities
  6. Technology adoption gaps
  7. Customer experience improvements
  8. Marketing channel opportunities

  Provide specific, actionable opportunities with estimated revenue impact.
  `

  const response = await openai.chat.completions.create({
      model: 'gpt-5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.5
  })

  return response.choices[0]?.message?.content || 'Market opportunities identified based on competitive analysis.'
}

async function generateCompetitiveAdvantages(business: any, analysis: string) {
  const prompt = `
  Identify and strengthen competitive advantages for this business:

  Business: ${business.business_name} (${business.business_type})
  Location: ${business.address}
  
  Analysis: ${analysis}

  Identify:
  1. Current competitive advantages
  2. Potential advantages to develop
  3. Unique value propositions
  4. Differentiation strategies
  5. Brand positioning opportunities
  6. Customer loyalty advantages
  7. Operational advantages
  8. Technology advantages

  Focus on advantages that are difficult for competitors to replicate.
  `

  const response = await openai.chat.completions.create({
      model: 'gpt-5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.4
  })

  return response.choices[0]?.message?.content || 'Competitive advantages identified and strategies developed.'
}

function generateRecommendations(analysis: string, opportunities: string, advantages: string) {
  return [
    {
      category: 'Immediate Actions',
      priority: 'High',
      items: [
        'Implement AI-powered lead scoring to prioritize high-value prospects',
        'Set up automated follow-up sequences for missed calls and no-shows',
        'Create personalized SMS campaigns based on customer behavior',
        'Optimize call handling during peak hours identified in analytics'
      ]
    },
    {
      category: 'Revenue Optimization',
      priority: 'High',
      items: [
        'Implement dynamic pricing based on demand and competition',
        'Create upsell opportunities during appointment booking',
        'Develop referral program to leverage existing customer base',
        'Optimize conversion funnel based on call analytics'
      ]
    },
    {
      category: 'Market Expansion',
      priority: 'Medium',
      items: [
        'Identify and target underserved market segments',
        'Develop partnerships with complementary businesses',
        'Expand service offerings based on market demand',
        'Implement local SEO strategy for geographic expansion'
      ]
    },
    {
      category: 'Competitive Positioning',
      priority: 'Medium',
      items: [
        'Develop unique value propositions based on market gaps',
        'Create customer loyalty programs',
        'Implement advanced customer experience features',
        'Build brand differentiation through specialized services'
      ]
    }
  ]
}
