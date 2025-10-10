import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    if (!userId || !businessId) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { callData, customerData, appointmentData } = body

    // Get business configuration
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    // Calculate lead score using AI
    const leadScore = await calculateLeadScore(business, callData, customerData, appointmentData)
    
    // Determine priority level
    const priority = getPriorityLevel(leadScore.total)
    
    // Generate personalized recommendations
    const recommendations = await generateLeadRecommendations(business, leadScore, customerData)
    
    // Store lead score
    await supabaseAdmin
      .from('lead_scores')
      .insert({
        business_id: businessId,
        customer_phone: customerData.phone,
        customer_name: customerData.name,
        total_score: leadScore.total,
        urgency_score: leadScore.urgency,
        value_score: leadScore.value,
        fit_score: leadScore.fit,
        priority: priority,
        recommendations: recommendations,
        call_data: callData,
        created_at: new Date().toISOString()
      })

    // Send high-priority alerts
    if (priority === 'high' || priority === 'urgent') {
      await sendPriorityAlert(businessId, customerData, leadScore, priority)
    }

    logger.info('Lead scored successfully', {
      businessId,
      customerPhone: customerData.phone,
      totalScore: leadScore.total,
      priority
    })

    return NextResponse.json({
      success: true,
      data: {
        leadScore,
        priority,
        recommendations,
        nextActions: getNextActions(priority, leadScore)
      }
      })
      
    } catch (error) {
    logger.error('Lead scoring error', error as Error)
    return NextResponse.json({
        success: false,
      message: 'Failed to score lead'
    }, { status: 500 })
  }
}

async function calculateLeadScore(business: any, callData: any, customerData: any, appointmentData: any) {
  const prompt = `
  Calculate a lead score (0-100) for this potential customer:

  Business: ${business.business_name} (${business.business_type})
  
  Call Data:
  - Duration: ${callData?.duration || 0} seconds
  - Service Interest: ${callData?.service || 'Not specified'}
  - Urgency: ${callData?.urgency || 'Not specified'}
  - Budget Mentioned: ${callData?.budget || 'Not mentioned'}
  - Timeline: ${callData?.timeline || 'Not specified'}
  
  Customer Data:
  - Location: ${customerData?.location || 'Not specified'}
  - Previous Customer: ${customerData?.isReturning || false}
  - Referral Source: ${customerData?.referralSource || 'Direct'}
  
  Appointment Data:
  - Scheduled: ${appointmentData?.scheduled || false}
  - Appointment Value: $${appointmentData?.estimatedValue || 0}
  - Service Type: ${appointmentData?.serviceType || 'Not specified'}

  Score on these factors (0-25 points each):
  1. URGENCY: How urgent is their need?
  2. VALUE: What's the potential project value?
  3. FIT: How well do they match your ideal customer?
  4. ENGAGEMENT: How engaged are they in the conversation?

  Return a JSON object with:
  {
    "urgency": score_0_25,
    "value": score_0_25,
    "fit": score_0_25,
    "engagement": score_0_25,
    "total": total_score_0_100,
    "reasoning": "Brief explanation of the score"
  }
  `

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.3
  })

  try {
    const scoreData = JSON.parse(response.choices[0]?.message?.content || '{}')
    return {
      urgency: scoreData.urgency || 0,
      value: scoreData.value || 0,
      fit: scoreData.fit || 0,
      engagement: scoreData.engagement || 0,
      total: scoreData.total || 0,
      reasoning: scoreData.reasoning || 'Score calculated based on call data'
    }
  } catch (error) {
    // Fallback scoring if AI fails
    return calculateFallbackScore(callData, customerData, appointmentData)
  }
}

function calculateFallbackScore(callData: any, customerData: any, appointmentData: any) {
  let urgency = 0
  let value = 0
  let fit = 0
  let engagement = 0

  // Urgency scoring
  if (callData?.urgency === 'immediate') urgency = 25
  else if (callData?.urgency === 'this_week') urgency = 20
  else if (callData?.urgency === 'this_month') urgency = 15
  else if (callData?.urgency === 'sometime') urgency = 5

  // Value scoring
  const budget = parseInt(callData?.budget || '0')
  if (budget > 5000) value = 25
  else if (budget > 2000) value = 20
  else if (budget > 1000) value = 15
  else if (budget > 500) value = 10
  else value = 5

  // Fit scoring
  if (customerData?.isReturning) fit += 10
  if (customerData?.referralSource === 'referral') fit += 10
  if (callData?.service) fit += 5

  // Engagement scoring
  const duration = callData?.duration || 0
  if (duration > 300) engagement = 25 // 5+ minutes
  else if (duration > 180) engagement = 20 // 3+ minutes
  else if (duration > 60) engagement = 15 // 1+ minute
  else engagement = 5

  const total = urgency + value + fit + engagement

  return {
    urgency,
    value,
    fit,
    engagement,
    total,
    reasoning: 'Fallback scoring based on call duration, urgency, and budget'
  }
}

function getPriorityLevel(score: number) {
  if (score >= 80) return 'urgent'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  if (score >= 20) return 'low'
  return 'very_low'
}

async function generateLeadRecommendations(business: any, leadScore: any, customerData: any) {
  const prompt = `
  Generate specific recommendations for this lead:

  Business: ${business.business_name} (${business.business_type})
  Lead Score: ${leadScore.total}/100
  Customer: ${customerData.name || 'Unknown'}
  
  Scores:
  - Urgency: ${leadScore.urgency}/25
  - Value: ${leadScore.value}/25
  - Fit: ${leadScore.fit}/25
  - Engagement: ${leadScore.engagement}/25

  Provide 3-5 specific, actionable recommendations to convert this lead.
  Focus on:
  - Immediate next steps
  - Communication strategy
  - Follow-up timing
  - Value proposition
  - Risk mitigation

  Make recommendations specific to their business type and lead characteristics.
  `

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
    temperature: 0.5
  })

  return response.choices[0]?.message?.content || 'Follow up within 24 hours with a personalized proposal.'
}

function getNextActions(priority: string, leadScore: any) {
  const actions = {
    urgent: [
      'Call within 1 hour',
      'Send immediate proposal',
      'Schedule same-day appointment',
      'Assign to top salesperson'
    ],
    high: [
      'Call within 4 hours',
      'Send detailed quote within 24 hours',
      'Schedule appointment this week',
      'Follow up with case studies'
    ],
    medium: [
      'Call within 24 hours',
      'Send information packet',
      'Schedule appointment next week',
      'Add to nurture sequence'
    ],
    low: [
      'Call within 48 hours',
      'Send general information',
      'Add to monthly follow-up',
      'Monitor for changes'
    ],
    very_low: [
      'Add to general follow-up list',
      'Send monthly newsletter',
      'Monitor for engagement',
      'Re-evaluate in 30 days'
    ]
  }

  return actions[priority as keyof typeof actions] || actions.low
}

async function sendPriorityAlert(businessId: string, customerData: any, leadScore: any, priority: string) {
  // Get business notification settings
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('notification_phone, sms_forwarding_enabled')
    .eq('id', businessId)
    .single()

  if (business?.sms_forwarding_enabled && business?.notification_phone) {
    const alertMessage = `🚨 HIGH PRIORITY LEAD ALERT 🚨
    
Customer: ${customerData.name || 'Unknown'}
Phone: ${customerData.phone}
Score: ${leadScore.total}/100 (${priority.toUpperCase()})
Urgency: ${leadScore.urgency}/25
Value: ${leadScore.value}/25

Action Required: ${getNextActions(priority, leadScore)[0]}`

    try {
      // Send alert SMS to business owner
      // This would use your SMS service to send to business.notification_phone
      // Priority alert would be sent: ${alertMessage}
    } catch (error) {
      logger.error('Failed to send priority alert', error as Error)
    }
  }
}
