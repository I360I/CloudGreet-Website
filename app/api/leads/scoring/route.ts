import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

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

    // Get leads data
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (leadsError) {
      logger.error('Error fetching leads for scoring', { 
        error: leadsError.message, 
        businessId 
      })
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        leads: []
      })
    }

    // Score each lead with AI
    const scoredLeads = await Promise.all(
      leads.map(async (lead) => {
        try {
          const scoring = await scoreLead(lead)
          return {
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            company: lead.company,
            source: lead.source,
            leadScore: scoring.score,
            aiInsights: scoring.insights,
            priority: scoring.priority,
            lastContact: lead.last_contact || lead.created_at,
            estimatedValue: scoring.estimatedValue
          }
        } catch (error) {
          logger.error('Error scoring lead', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            leadId: lead.id 
          })
          return {
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            company: lead.company,
            source: lead.source,
            leadScore: 50,
            aiInsights: ['Scoring unavailable'],
            priority: 'medium' as const,
            lastContact: lead.last_contact || lead.created_at,
            estimatedValue: 0
          }
        }
      })
    )

    // Sort by score (highest first)
    scoredLeads.sort((a, b) => b.leadScore - a.leadScore)

    return NextResponse.json({
      success: true,
      leads: scoredLeads
    })

  } catch (error) {
    logger.error('Error getting lead scores', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get lead scores' 
    }, { status: 500 })
  }
}

async function scoreLead(lead: any): Promise<{
  score: number
  insights: string[]
  priority: 'high' | 'medium' | 'low'
  estimatedValue: number
}> {
  try {
    const prompt = `Analyze this lead for a service business (HVAC, roofing, painting) and provide a JSON response:

Lead Information:
- Name: ${lead.name || 'Unknown'}
- Phone: ${lead.phone || 'Not provided'}
- Email: ${lead.email || 'Not provided'}
- Company: ${lead.company || 'Not provided'}
- Source: ${lead.source || 'Unknown'}
- Notes: ${lead.notes || 'No notes'}
- Created: ${lead.created_at}

Score this lead from 0-100 based on:
1. Contact information completeness (phone, email, company)
2. Lead source quality (referral vs cold lead)
3. Urgency indicators in notes
4. Company size indicators
5. Geographic proximity to service area
6. Time sensitivity (recent vs old lead)

Also provide:
- insights: Array of 2-3 key insights about this lead
- priority: "high", "medium", or "low" based on score and urgency
- estimatedValue: Estimated project value in dollars (0-50000)

Return only valid JSON with keys: score, insights, priority, estimatedValue`

      const completion = await openai.chat.completions.create({
        model: 'gpt-5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 400
    })

    const analysis = JSON.parse(completion.choices[0].message.content || '{}')
    
    return {
      score: Math.max(0, Math.min(100, analysis.score || 50)),
      insights: analysis.insights || ['Analysis incomplete'],
      priority: analysis.priority || 'medium',
      estimatedValue: Math.max(0, analysis.estimatedValue || 0)
    }
  } catch (error) {
    logger.error('Error in AI lead scoring', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    
    // Return default values if AI analysis fails
    return {
      score: 50,
      insights: ['AI analysis unavailable'],
      priority: 'medium',
      estimatedValue: 0
    }
  }
}