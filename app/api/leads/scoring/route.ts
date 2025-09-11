import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { callData, customerData, interactionHistory } = body

    if (!callData || !customerData) {
      return NextResponse.json({ error: 'Call data and customer data are required' }, { status: 400 })
    }

    // Advanced lead scoring algorithm
    const leadScore = calculateLeadScore(callData, customerData, interactionHistory)

    return NextResponse.json(leadScore)

  } catch (error) {
    console.error('Error calculating lead score:', error)
    return NextResponse.json(
      { error: 'Failed to calculate lead score' },
      { status: 500 }
    )
  }
}

function calculateLeadScore(callData: any, customerData: any, interactionHistory: any) {
  let score = 0
  const factors = []

  // Call Quality Factors (30% of score)
  if (callData.duration > 120) {
    score += 20
    factors.push({ factor: 'Long call duration', impact: '+20', reason: 'Engaged customer' })
  }

  if (callData.sentiment?.score > 0.7) {
    score += 15
    factors.push({ factor: 'Positive sentiment', impact: '+15', reason: 'Satisfied customer' })
  }

  // Intent Analysis (25% of score)
  const intentKeywords = ['appointment', 'schedule', 'book', 'service', 'repair', 'install']
  const intentMatches = callData.transcription?.toLowerCase().match(new RegExp(intentKeywords.join('|'), 'g')) || []
  
  if (intentMatches.length > 2) {
    score += 25
    factors.push({ factor: 'Strong service intent', impact: '+25', reason: 'Multiple service keywords' })
  }

  // Customer Profile (20% of score)
  if (customerData.isRepeatCustomer) {
    score += 20
    factors.push({ factor: 'Repeat customer', impact: '+20', reason: 'Existing relationship' })
  }

  if (customerData.customerValue > 500) {
    score += 15
    factors.push({ factor: 'High-value customer', impact: '+15', reason: 'Premium service potential' })
  }

  // Urgency Indicators (15% of score)
  const urgencyKeywords = ['urgent', 'emergency', 'asap', 'today', 'immediately']
  const urgencyMatches = callData.transcription?.toLowerCase().match(new RegExp(urgencyKeywords.join('|'), 'g')) || []
  
  if (urgencyMatches.length > 0) {
    score += 15
    factors.push({ factor: 'Urgent request', impact: '+15', reason: 'Time-sensitive need' })
  }

  // Follow-up History (10% of score)
  if (interactionHistory?.previousCalls > 0) {
    score += 10
    factors.push({ factor: 'Previous interactions', impact: '+10', reason: 'Established contact' })
  }

  // Calculate probability and recommendations
  const probability = Math.min(score, 100)
  const recommendations = generateRecommendations(score, factors)

  return {
    leadScore: {
      overall: score,
      probability: probability,
      grade: getScoreGrade(score),
      confidence: calculateConfidence(factors.length)
    },
    factors,
    recommendations,
    nextSteps: {
      immediate: recommendations.immediate,
      followUp: recommendations.followUp,
      timeline: recommendations.timeline
    },
    conversionPrediction: {
      bookingProbability: Math.min(score * 0.8, 95),
      revenuePotential: calculateRevenuePotential(customerData, score),
      optimalContactTime: getOptimalContactTime(customerData),
      preferredMethod: getPreferredContactMethod(interactionHistory)
    }
  }
}

function getScoreGrade(score: number): string {
  if (score >= 80) return 'A+ (Hot Lead)'
  if (score >= 70) return 'A (Warm Lead)'
  if (score >= 60) return 'B (Qualified Lead)'
  if (score >= 50) return 'C (Cold Lead)'
  return 'D (Unqualified)'
}

function calculateConfidence(factorCount: number): number {
  return Math.min(95, 60 + (factorCount * 5))
}

function generateRecommendations(score: number, factors: any[]) {
  const recommendations = {
    immediate: [] as string[],
    followUp: [] as string[],
    timeline: ''
  }

  if (score >= 80) {
    recommendations.immediate = [
      'Schedule appointment within 24 hours',
      'Send immediate confirmation email',
      'Assign to top-performing technician',
      'Prepare service estimate'
    ]
    recommendations.followUp = [
      'Call within 2 hours to confirm',
      'Send service details via SMS',
      'Prepare welcome package'
    ]
    recommendations.timeline = 'Immediate action required - high conversion probability'
  } else if (score >= 60) {
    recommendations.immediate = [
      'Follow up within 4 hours',
      'Send service information',
      'Schedule callback for tomorrow'
    ]
    recommendations.followUp = [
      'Send pricing guide',
      'Schedule follow-up call in 3 days',
      'Add to nurture campaign'
    ]
    recommendations.timeline = 'Follow up within 24 hours'
  } else {
    recommendations.immediate = [
      'Add to nurture campaign',
      'Send general service information',
      'Schedule follow-up in 1 week'
    ]
    recommendations.followUp = [
      'Monthly newsletter subscription',
      'Quarterly check-in calls',
      'Seasonal service reminders'
    ]
    recommendations.timeline = 'Long-term nurture - 30-90 days'
  }

  return recommendations
}

function calculateRevenuePotential(customerData: any, score: number): number {
  const baseValue = customerData.customerValue || 300
  const multiplier = score / 100
  return Math.round(baseValue * (1 + multiplier))
}

function getOptimalContactTime(customerData: any): string {
  // Analyze customer's previous interaction patterns
  return customerData.preferredTime || '9:00 AM - 5:00 PM'
}

function getPreferredContactMethod(interactionHistory: any): string {
  if (interactionHistory?.phoneCalls > interactionHistory?.emails) {
    return 'phone'
  } else if (interactionHistory?.emails > interactionHistory?.texts) {
    return 'email'
  } else {
    return 'text'
  }
}
