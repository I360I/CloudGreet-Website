/**
 * APOLLO KILLER: AI-Powered Lead Scoring
 * 
 * Analyzes enriched data and calculates quality scores
 * Generates personalized pitches based on detected pain points
 */

import { logger } from '@/lib/monitoring'

export interface LeadScoringResult {
  total_score: number
  fit_score: number
  engagement_score: number
  contact_quality_score: number
  opportunity_score: number
  urgency_score: number
  personalized_pitch: string
  pain_points: string[]
  recommended_approach: string
  best_contact_time: string
  objections_anticipated: string[]
}

export interface EnrichedLeadData {
  business_name: string
  business_type: string
  location: { city: string; state: string }
  google_rating?: number
  google_review_count?: number
  owner_name?: string
  owner_title?: string
  owner_email?: string
  owner_email_verified?: boolean
  owner_phone?: string
  website?: string
  website_content?: string
  employee_count_min?: number
  employee_count_max?: number
  estimated_revenue_min?: number
  estimated_revenue_max?: number
  has_online_booking?: boolean
  has_live_chat?: boolean
  has_ai_receptionist?: boolean
  detected_technologies?: string[]
  linkedin_profiles?: any[]
}

/**
 * Score a lead using AI analysis
 */
export async function scoreLead(data: EnrichedLeadData): Promise<LeadScoringResult> {
  try {
    // Calculate component scores
    const fitScore = calculateFitScore(data)
    const engagementScore = calculateEngagementScore(data)
    const contactQualityScore = calculateContactQualityScore(data)
    
    // AI-powered analysis for opportunity and pain points
    const aiAnalysis = await analyzeWithAI(data)
    
    const totalScore = Math.round(
      (fitScore * 0.35) +
      (engagementScore * 0.25) +
      (contactQualityScore * 0.20) +
      (aiAnalysis.opportunityScore * 0.15) +
      (aiAnalysis.urgencyScore * 0.05)
    )
    
    return {
      total_score: totalScore,
      fit_score: fitScore,
      engagement_score: engagementScore,
      contact_quality_score: contactQualityScore,
      opportunity_score: aiAnalysis.opportunityScore,
      urgency_score: aiAnalysis.urgencyScore,
      personalized_pitch: aiAnalysis.personalizedPitch,
      pain_points: aiAnalysis.painPoints,
      recommended_approach: determineApproach(data, totalScore),
      best_contact_time: determineBestTime(data),
      objections_anticipated: aiAnalysis.objections
    }
    
  } catch (error) {
    logger.error('Lead scoring failed', {
      business: data.business_name,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    
    // Return default scores if AI fails
    return {
      total_score: 50,
      fit_score: 50,
      engagement_score: 50,
      contact_quality_score: 50,
      opportunity_score: 50,
      urgency_score: 50,
      personalized_pitch: generateFallbackPitch(data),
      pain_points: [],
      recommended_approach: 'email_first',
      best_contact_time: 'business_hours',
      objections_anticipated: []
    }
  }
}

/**
 * Calculate fit score (0-100)
 */
function calculateFitScore(data: EnrichedLeadData): number {
  let score = 0
  
  // Business type match (40 points)
  const targetTypes = ['HVAC', 'Roofing', 'Painting']
  if (targetTypes.some(t => data.business_type?.toLowerCase().includes(t.toLowerCase()))) {
    score += 40
  } else {
    score += 20 // Partial credit for service businesses
  }
  
  // Company size (ideal: 1-20 employees) (30 points)
  const avgEmployees = (data.employee_count_min || 0 + data.employee_count_max || 10) / 2
  if (avgEmployees >= 1 && avgEmployees <= 20) {
    score += 30
  } else if (avgEmployees <= 50) {
    score += 20
  } else {
    score += 10
  }
  
  // Revenue range (ideal: $100K-$2M) (20 points)
  const avgRevenue = (data.estimated_revenue_min || 0 + data.estimated_revenue_max || 500000) / 2
  if (avgRevenue >= 100000 && avgRevenue <= 2000000) {
    score += 20
  } else if (avgRevenue >= 50000 && avgRevenue <= 5000000) {
    score += 15
  } else {
    score += 5
  }
  
  // Location (10 points) - all US locations are good for now
  if (data.location.state) {
    score += 10
  }
  
  return Math.min(100, score)
}

/**
 * Calculate engagement score (0-100)
 */
function calculateEngagementScore(data: EnrichedLeadData): number {
  let score = 0
  
  // Google rating (30 points)
  if (data.google_rating) {
    if (data.google_rating >= 4.5) score += 30
    else if (data.google_rating >= 4.0) score += 25
    else if (data.google_rating >= 3.5) score += 15
    else score += 5
  }
  
  // Review count (20 points)
  if (data.google_review_count) {
    if (data.google_review_count >= 100) score += 20
    else if (data.google_review_count >= 50) score += 15
    else if (data.google_review_count >= 20) score += 10
    else score += 5
  }
  
  // Website presence (20 points)
  if (data.website) {
    score += 20
  }
  
  // Online booking (15 points)
  if (data.has_online_booking) {
    score += 15
  } else {
    score += 5 // Room for improvement!
  }
  
  // Live chat (10 points)
  if (data.has_live_chat) {
    score += 10
  }
  
  // Tech stack (5 points)
  if (data.detected_technologies && data.detected_technologies.length > 0) {
    score += 5
  }
  
  return Math.min(100, score)
}

/**
 * Calculate contact quality score (0-100)
 */
function calculateContactQualityScore(data: EnrichedLeadData): number {
  let score = 0
  
  // Owner name found (30 points)
  if (data.owner_name) {
    score += 30
  }
  
  // Owner title found (10 points)
  if (data.owner_title) {
    score += 10
  }
  
  // Email found (30 points)
  if (data.owner_email) {
    if (data.owner_email_verified) {
      score += 30
    } else {
      score += 20
    }
  }
  
  // Phone found (20 points)
  if (data.owner_phone) {
    score += 20
  }
  
  // Website for additional research (10 points)
  if (data.website) {
    score += 10
  }
  
  return Math.min(100, score)
}

/**
 * Analyze with AI to detect pain points and opportunities
 */
async function analyzeWithAI(data: EnrichedLeadData): Promise<{
  opportunityScore: number
  urgencyScore: number
  painPoints: string[]
  personalizedPitch: string
  objections: string[]
}> {
  
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return {
      opportunityScore: 50,
      urgencyScore: 50,
      painPoints: [],
      personalizedPitch: generateFallbackPitch(data),
      objections: []
    }
  }
  
  try {
    const prompt = `Analyze this business lead for CloudGreet (AI receptionist/lead-gen SaaS for service businesses):

Business: ${data.business_name}
Type: ${data.business_type}
Location: ${data.location.city}, ${data.location.state}
Rating: ${data.google_rating || 'Unknown'}★ (${data.google_review_count || 0} reviews)
Owner: ${data.owner_name || 'Unknown'}${data.owner_title ? ` (${data.owner_title})` : ''}
Website: ${data.website || 'No website'}
Has online booking: ${data.has_online_booking ? 'Yes' : 'No'}
Has AI receptionist: ${data.has_ai_receptionist ? 'Yes' : 'No'}

Website content (first 1000 chars):
${data.website_content?.substring(0, 1000) || 'Not available'}

Your task:
1. Detect pain points (missed calls, hiring issues, after-hours problems, scheduling chaos)
2. Rate opportunity (0-100): How badly do they need CloudGreet?
3. Rate urgency (0-100): How urgent is their need?
4. Write a personalized 3-sentence pitch
5. Predict 2-3 objections they might have

Respond in JSON:
{
  "opportunityScore": 85,
  "urgencyScore": 70,
  "painPoints": ["Mentions missed calls on website", "No after-hours service"],
  "personalizedPitch": "Hi [name]...",
  "objections": ["Already have a receptionist", "Cost concerns"]
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a B2B sales analyst. Analyze leads and provide insights in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    })
    
    const responseData = await response.json()
    const content = responseData.choices?.[0]?.message?.content
    
    if (content) {
      const parsed = JSON.parse(content)
      return {
        opportunityScore: Math.min(100, Math.max(0, parsed.opportunityScore || 50)),
        urgencyScore: Math.min(100, Math.max(0, parsed.urgencyScore || 50)),
        painPoints: parsed.painPoints || [],
        personalizedPitch: parsed.personalizedPitch || generateFallbackPitch(data),
        objections: parsed.objections || []
      }
    }
    
    return {
      opportunityScore: 50,
      urgencyScore: 50,
      painPoints: [],
      personalizedPitch: generateFallbackPitch(data),
      objections: []
    }
    
  } catch (error) {
    logger.error('AI analysis failed', {
      business: data.business_name,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    
    return {
      opportunityScore: 50,
      urgencyScore: 50,
      painPoints: [],
      personalizedPitch: generateFallbackPitch(data),
      objections: []
    }
  }
}

/**
 * Determine best approach for contacting this lead
 */
function determineApproach(data: EnrichedLeadData, totalScore: number): string {
  // High score + verified email = email first
  if (totalScore >= 80 && data.owner_email_verified) {
    return 'email_first'
  }
  
  // Has phone + medium score = call first
  if (totalScore >= 60 && data.owner_phone) {
    return 'call_direct'
  }
  
  // Low score = multi-touch
  if (totalScore < 60) {
    return 'multi_touch'
  }
  
  return 'email_first'
}

/**
 * Determine best time to contact
 */
function determineBestTime(data: EnrichedLeadData): string {
  // HVAC/Roofing: Early morning (7-9am) or late afternoon (4-6pm)
  if (data.business_type?.toLowerCase().includes('hvac') || 
      data.business_type?.toLowerCase().includes('roof')) {
    return 'early_morning_or_late_afternoon'
  }
  
  // Painting: Mid-morning (9-11am)
  if (data.business_type?.toLowerCase().includes('paint')) {
    return 'mid_morning'
  }
  
  return 'business_hours'
}

/**
 * Generate fallback pitch if AI fails
 */
function generateFallbackPitch(data: EnrichedLeadData): string {
  const name = data.owner_name ? data.owner_name.split(' ')[0] : 'there'
  const rating = data.google_rating ? `${data.google_rating}★` : 'great'
  
  return `Hi ${name} - I noticed ${data.business_name} has ${rating} reviews on Google. Service businesses like yours are missing 10-15 calls per month on average = $12-18K in lost revenue. CloudGreet's AI receptionist answers every call 24/7, books appointments automatically, and never takes a day off. Worth a quick chat?`
}

