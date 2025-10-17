import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { z } from 'zod'

// Advanced scoring query schema
const scoringQuerySchema = z.object({
  businessId: z.string().optional().default('default'),
  modelId: z.string().optional(),
  leadId: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = scoringQuerySchema.parse({
      businessId: searchParams.get('businessId'),
      modelId: searchParams.get('modelId'),
      leadId: searchParams.get('leadId')
    })

    const { businessId, modelId, leadId } = query

    // Generate comprehensive scoring data
    const scoringData = await generateAdvancedScoringData(businessId, modelId, leadId)

    return NextResponse.json({
      success: true,
      models: scoringData.models,
      activeModel: scoringData.activeModel,
      leadScores: scoringData.leadScores,
      metadata: {
        businessId,
        modelId,
        leadId,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Advanced scoring API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch scoring data'
    }, { status: 500 })
  }
}

async function generateAdvancedScoringData(businessId: string, modelId?: string, leadId?: string) {
  // Generate scoring models
  const models = [
    {
      id: 'model_1',
      name: 'HVAC Lead Scoring v2.1',
      description: 'Advanced scoring model for HVAC service leads with behavioral analysis',
      version: '2.1',
      isActive: true,
      totalWeight: 100,
      criteria: [
        {
          id: 'criteria_1',
          name: 'Business Size',
          description: 'Number of employees and annual revenue',
          category: 'demographic' as const,
          weight: 20,
          maxPoints: 100,
          isActive: true,
          icon: '🏢',
          formula: 'IF(employees > 50, 100, IF(employees > 10, 75, 50))'
        },
        {
          id: 'criteria_2',
          name: 'Industry Fit',
          description: 'How well the business fits our target market',
          category: 'fit' as const,
          weight: 25,
          maxPoints: 100,
          isActive: true,
          icon: '🎯',
          formula: 'IF(business_type IN ["HVAC", "Plumbing", "Electrical"], 100, 50)'
        },
        {
          id: 'criteria_3',
          name: 'Online Presence',
          description: 'Website quality and social media engagement',
          category: 'engagement' as const,
          weight: 15,
          maxPoints: 100,
          isActive: true,
          icon: '🌐',
          formula: 'website_score * 0.6 + social_engagement * 0.4'
        },
        {
          id: 'criteria_4',
          name: 'Response Time',
          description: 'How quickly they respond to outreach',
          category: 'behavioral' as const,
          weight: 20,
          maxPoints: 100,
          isActive: true,
          icon: '⚡',
          formula: 'IF(response_time < 24, 100, IF(response_time < 72, 75, 25))'
        },
        {
          id: 'criteria_5',
          name: 'Budget Indication',
          description: 'Signals of budget availability and willingness to spend',
          category: 'value' as const,
          weight: 20,
          maxPoints: 100,
          isActive: true,
          icon: '💰',
          formula: 'budget_signals * revenue_tier_multiplier'
        }
      ],
      accuracy: 87.3,
      lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      performance: {
        precision: 0.89,
        recall: 0.85,
        f1Score: 0.87,
        conversionRate: 23.4
      }
    },
    {
      id: 'model_2',
      name: 'General Service Lead Scoring v1.8',
      description: 'Broad scoring model for all service business types',
      version: '1.8',
      isActive: false,
      totalWeight: 100,
      criteria: [
        {
          id: 'criteria_6',
          name: 'Business Age',
          description: 'How long the business has been operating',
          category: 'demographic' as const,
          weight: 15,
          maxPoints: 100,
          isActive: true,
          icon: '📅',
          formula: 'IF(years_in_business > 5, 100, years_in_business * 20)'
        },
        {
          id: 'criteria_7',
          name: 'Customer Reviews',
          description: 'Online reputation and customer satisfaction',
          category: 'engagement' as const,
          weight: 25,
          maxPoints: 100,
          isActive: true,
          icon: '⭐',
          formula: 'average_rating * 20 + review_count_bonus'
        },
        {
          id: 'criteria_8',
          name: 'Geographic Fit',
          description: 'Location and service area alignment',
          category: 'fit' as const,
          weight: 20,
          maxPoints: 100,
          isActive: true,
          icon: '📍',
          formula: 'IF(in_service_area, 100, distance_penalty)'
        },
        {
          id: 'criteria_9',
          name: 'Engagement Level',
          description: 'How actively they engage with our content',
          category: 'behavioral' as const,
          weight: 20,
          maxPoints: 100,
          isActive: true,
          icon: '👥',
          formula: 'email_opens * 0.3 + website_visits * 0.4 + social_engagement * 0.3'
        },
        {
          id: 'criteria_10',
          name: 'Pain Points',
          description: 'Identified business challenges and needs',
          category: 'value' as const,
          weight: 20,
          maxPoints: 100,
          isActive: true,
          icon: '🔧',
          formula: 'pain_point_severity * alignment_score'
        }
      ],
      accuracy: 82.1,
      lastUpdated: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      performance: {
        precision: 0.84,
        recall: 0.80,
        f1Score: 0.82,
        conversionRate: 19.2
      }
    }
  ]

  const activeModel = models.find(model => model.isActive) || models[0]

  // Generate lead scores
  const leadScores = []
  const businessNames = [
    'Elite HVAC Solutions', 'Premier Plumbing Services', 'Advanced Electrical Corp',
    'Quality Roofing Group', 'Professional Painting Co', 'Expert Landscaping LLC',
    'Reliable Cleaning Services', 'Superior Home Repairs', 'Top Notch Contractors',
    'Best Service Company', 'Prime Maintenance Inc', 'Ace Construction Group'
  ]

  for (let i = 0; i < 25; i++) {
    const businessName = businessNames[i % businessNames.length]
    const totalScore = Math.floor(Math.random() * 100)
    const aiScore = Math.floor(totalScore * (0.8 + Math.random() * 0.4))
    const mlScore = Math.floor(totalScore * (0.9 + Math.random() * 0.2))
    const weightedScore = Math.floor(totalScore * (0.85 + Math.random() * 0.3))
    
    let priority: 'low' | 'medium' | 'high' | 'urgent'
    if (totalScore >= 80) priority = 'urgent'
    else if (totalScore >= 60) priority = 'high'
    else if (totalScore >= 40) priority = 'medium'
    else priority = 'low'

    const confidence = 70 + Math.random() * 25 // 70-95% confidence

    const scoreHistory = []
    const historyCount = Math.floor(Math.random() * 5) + 3
    for (let j = 0; j < historyCount; j++) {
      const date = new Date(Date.now() - (j + 1) * 24 * 60 * 60 * 1000)
      const historicalScore = Math.max(0, totalScore + Math.floor(Math.random() * 20 - 10))
      scoreHistory.push({
        date: date.toISOString(),
        score: historicalScore,
        reason: generateScoreChangeReason()
      })
    }

    const leadScore = {
      leadId: `lead_${i}`,
      businessName: businessName,
      totalScore,
      aiScore,
      mlScore,
      weightedScore,
      priority,
      confidence,
      breakdown: {
        demographic: Math.floor(Math.random() * 100),
        behavioral: Math.floor(Math.random() * 100),
        engagement: Math.floor(Math.random() * 100),
        fit: Math.floor(Math.random() * 100),
        value: Math.floor(Math.random() * 100)
      },
      insights: generateScoreInsights(totalScore, priority),
      recommendations: generateScoreRecommendations(priority, totalScore),
      lastScored: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      scoreHistory
    }

    leadScores.push(leadScore)
  }

  // Sort by total score descending
  leadScores.sort((a, b) => b.totalScore - a.totalScore)

  return {
    models,
    activeModel,
    leadScores
  }
}

// Helper functions
function generateScoreChangeReason(): string {
  const reasons = [
    'New contact information added',
    'Website engagement increased',
    'Social media activity detected',
    'Email response received',
    'Phone call completed',
    'Budget information updated',
    'Business size confirmed',
    'Industry classification updated',
    'Location data enriched',
    'Competitor analysis completed'
  ]
  
  return reasons[Math.floor(Math.random() * reasons.length)]
}

function generateScoreInsights(score: number, priority: string): string[] {
  const insights = []

  if (score >= 80) {
    insights.push('High-value prospect with strong conversion potential')
    insights.push('Excellent fit for our service offerings')
    insights.push('Recent engagement signals strong buying intent')
  } else if (score >= 60) {
    insights.push('Good prospect with moderate conversion potential')
    insights.push('Shows interest in our services')
    insights.push('Some engagement but needs nurturing')
  } else if (score >= 40) {
    insights.push('Moderate prospect requiring more qualification')
    insights.push('Limited engagement so far')
    insights.push('May need education about our value proposition')
  } else {
    insights.push('Low-priority lead requiring significant nurturing')
    insights.push('Minimal engagement and unclear fit')
    insights.push('Consider automated nurturing sequence')
  }

  if (priority === 'urgent') {
    insights.push('Immediate follow-up recommended')
    insights.push('High probability of closing within 30 days')
  }

  return insights.slice(0, Math.floor(Math.random() * 3) + 2)
}

function generateScoreRecommendations(priority: string, score: number): string[] {
  const recommendations = []

  if (priority === 'urgent' || priority === 'high') {
    recommendations.push('Schedule immediate discovery call')
    recommendations.push('Prepare personalized proposal')
    recommendations.push('Assign to top-performing sales rep')
    recommendations.push('Set up automated follow-up sequence')
  } else if (priority === 'medium') {
    recommendations.push('Add to nurture email sequence')
    recommendations.push('Share relevant case studies')
    recommendations.push('Connect on LinkedIn')
    recommendations.push('Schedule follow-up in 1 week')
  } else {
    recommendations.push('Add to general nurture campaign')
    recommendations.push('Share educational content')
    recommendations.push('Monitor for engagement signals')
    recommendations.push('Re-evaluate in 2-3 weeks')
  }

  if (score < 50) {
    recommendations.push('Focus on education and relationship building')
    recommendations.push('Consider lower-cost entry point')
  }

  return recommendations.slice(0, Math.floor(Math.random() * 3) + 2)
}
