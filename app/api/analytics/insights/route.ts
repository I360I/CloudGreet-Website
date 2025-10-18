import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { z } from 'zod'

// Insights query schema
const insightsQuerySchema = z.object({
  businessId: z.string().optional().default('default'),
  timeframe: z.enum(['7d', '30d', '90d', '1y']).default('30d')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = insightsQuerySchema.parse({
      businessId: searchParams.get('businessId'),
      timeframe: searchParams.get('timeframe')
    })

    const { businessId, timeframe } = query

    // Calculate date ranges
    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Generate comprehensive insights data
    const insightsData = await generateInsightsData(businessId, startDate, now, timeframe)

    return NextResponse.json({
      success: true,
      insights: insightsData,
      metadata: {
        businessId,
        timeframe,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Insights API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch insights'
    }, { status: 500 })
  }
}

async function generateInsightsData(businessId: string, startDate: Date, endDate: Date, timeframe: string) {
  const insights = []

  // Generate realistic AI-powered insights
  const insightTemplates = [
    {
      type: 'opportunity' as const,
      priority: 'high' as const,
      title: 'Peak Hour Optimization Opportunity',
      description: 'Your call volume spikes between 2-4 PM, but your conversion rate drops by 15% during this period. This suggests potential capacity constraints.',
      impact: 'positive' as const,
      confidence: 87,
      metrics: {
        current: 65,
        previous: 55,
        change: 18.2,
        benchmark: 70
      },
      recommendations: [
        'Consider adding additional staff during peak hours (2-4 PM)',
        'Implement call queuing system to manage overflow',
        'Analyze why conversion rates drop during high volume periods',
        'Train staff on handling high-pressure situations'
      ],
      actions: [
        {
          id: 'staffing_analysis',
          title: 'Conduct Staffing Analysis',
          description: 'Analyze current staffing levels vs. call volume patterns',
          effort: 'medium' as const,
          impact: 'high' as const,
          category: 'short_term' as const
        },
        {
          id: 'peak_training',
          title: 'Peak Hour Training Program',
          description: 'Develop specialized training for high-volume periods',
          effort: 'high' as const,
          impact: 'medium' as const,
          category: 'long_term' as const
        }
      ],
      tags: ['staffing', 'optimization', 'conversion', 'peak-hours'],
      category: 'Operations',
      source: 'Call Volume Analysis'
    },
    {
      type: 'warning' as const,
      priority: 'high' as const,
      title: 'Customer Satisfaction Decline Detected',
      description: 'Customer satisfaction scores have decreased by 8% over the past 30 days, with response time being the primary complaint.',
      impact: 'negative' as const,
      confidence: 92,
      metrics: {
        current: 3.8,
        previous: 4.1,
        change: -7.3,
        benchmark: 4.2
      },
      recommendations: [
        'Investigate root causes of increased response times',
        'Implement customer feedback loop for immediate issue resolution',
        'Consider adding more customer service representatives',
        'Review and optimize current response time targets'
      ],
      actions: [
        {
          id: 'response_time_audit',
          title: 'Response Time Audit',
          description: 'Conduct detailed analysis of response time bottlenecks',
          effort: 'medium' as const,
          impact: 'high' as const,
          category: 'immediate' as const
        },
        {
          id: 'customer_feedback_system',
          title: 'Enhanced Feedback System',
          description: 'Implement real-time customer feedback collection',
          effort: 'low' as const,
          impact: 'medium' as const,
          category: 'short_term' as const
        }
      ],
      tags: ['satisfaction', 'response-time', 'customer-service', 'quality'],
      category: 'Customer Experience',
      source: 'Satisfaction Survey Analysis'
    },
    {
      type: 'success' as const,
      priority: 'medium' as const,
      title: 'Lead Quality Improvement',
      description: 'Your lead qualification process has improved significantly, with qualified leads increasing by 23% and conversion rates up by 12%.',
      impact: 'positive' as const,
      confidence: 89,
      metrics: {
        current: 78,
        previous: 65,
        change: 20.0,
        benchmark: 70
      },
      recommendations: [
        'Document the successful lead qualification process',
        'Scale the improved process to other lead sources',
        'Consider investing more budget in high-quality lead sources',
        'Share best practices with the sales team'
      ],
      actions: [
        {
          id: 'process_documentation',
          title: 'Process Documentation',
          description: 'Document the improved lead qualification methodology',
          effort: 'low' as const,
          impact: 'medium' as const,
          category: 'short_term' as const
        },
        {
          id: 'scale_improvements',
          title: 'Scale Improvements',
          description: 'Apply successful practices to other lead channels',
          effort: 'medium' as const,
          impact: 'high' as const,
          category: 'short_term' as const
        }
      ],
      tags: ['lead-quality', 'conversion', 'process-improvement', 'growth'],
      category: 'Sales Performance',
      source: 'Lead Analysis Engine'
    },
    {
      type: 'trend' as const,
      priority: 'medium' as const,
      title: 'Mobile Traffic Growth Trend',
      description: 'Mobile traffic has increased by 34% over the past 30 days, but mobile conversion rates are 22% lower than desktop.',
      impact: 'neutral' as const,
      confidence: 85,
      metrics: {
        current: 45,
        previous: 34,
        change: 32.4,
        benchmark: 50
      },
      recommendations: [
        'Optimize mobile user experience and checkout process',
        'Implement mobile-specific conversion tracking',
        'Consider mobile app development for better engagement',
        'A/B test mobile landing pages for improved conversion'
      ],
      actions: [
        {
          id: 'mobile_optimization',
          title: 'Mobile UX Optimization',
          description: 'Audit and improve mobile user experience',
          effort: 'high' as const,
          impact: 'high' as const,
          category: 'long_term' as const
        },
        {
          id: 'mobile_tracking',
          title: 'Enhanced Mobile Tracking',
          description: 'Implement detailed mobile conversion analytics',
          effort: 'medium' as const,
          impact: 'medium' as const,
          category: 'short_term' as const
        }
      ],
      tags: ['mobile', 'traffic', 'conversion', 'user-experience'],
      category: 'Digital Marketing',
      source: 'Website Analytics'
    },
    {
      type: 'anomaly' as const,
      priority: 'high' as const,
      title: 'Unusual Call Pattern Detected',
      description: 'Anomalous spike in emergency calls detected on Tuesday mornings (9-11 AM), 340% above normal levels. This pattern is inconsistent with historical data.',
      impact: 'neutral' as const,
      confidence: 94,
      metrics: {
        current: 45,
        previous: 12,
        change: 275.0,
        benchmark: 15
      },
      recommendations: [
        'Investigate external factors causing Tuesday morning emergencies',
        'Prepare additional emergency response capacity for Tuesday mornings',
        'Monitor for potential system issues or external events',
        'Consider proactive outreach to prevent emergency situations'
      ],
      actions: [
        {
          id: 'emergency_investigation',
          title: 'Emergency Pattern Investigation',
          description: 'Analyze root causes of Tuesday morning emergency spikes',
          effort: 'medium' as const,
          impact: 'high' as const,
          category: 'immediate' as const
        },
        {
          id: 'capacity_planning',
          title: 'Emergency Capacity Planning',
          description: 'Adjust staffing for Tuesday morning emergency response',
          effort: 'low' as const,
          impact: 'medium' as const,
          category: 'short_term' as const
        }
      ],
      tags: ['emergency', 'anomaly', 'capacity', 'patterns'],
      category: 'Operations',
      source: 'Call Pattern Analysis'
    },
    {
      type: 'opportunity' as const,
      priority: 'medium' as const,
      title: 'Referral Program Optimization',
      description: 'Your referral program generates 28% of new customers but only 5% of leads. There\'s significant opportunity to increase referral lead volume.',
      impact: 'positive' as const,
      confidence: 76,
      metrics: {
        current: 5,
        previous: 4,
        change: 25.0,
        benchmark: 15
      },
      recommendations: [
        'Increase referral incentives to encourage more lead sharing',
        'Implement automated referral tracking and rewards',
        'Create referral-friendly content and sharing tools',
        'Develop referral partner program for business-to-business referrals'
      ],
      actions: [
        {
          id: 'referral_incentives',
          title: 'Enhanced Referral Incentives',
          description: 'Increase rewards for successful referrals',
          effort: 'low' as const,
          impact: 'high' as const,
          category: 'short_term' as const
        },
        {
          id: 'automated_tracking',
          title: 'Automated Referral System',
          description: 'Implement automated referral tracking and rewards',
          effort: 'medium' as const,
          impact: 'medium' as const,
          category: 'long_term' as const
        }
      ],
      tags: ['referrals', 'growth', 'marketing', 'optimization'],
      category: 'Marketing',
      source: 'Customer Acquisition Analysis'
    },
    {
      type: 'trend' as const,
      priority: 'low' as const,
      title: 'Seasonal Demand Pattern',
      description: 'Historical data shows a 15% increase in service requests during the first week of each month. This trend is consistent across all service categories.',
      impact: 'neutral' as const,
      confidence: 81,
      metrics: {
        current: 125,
        previous: 108,
        change: 15.7,
        benchmark: 120
      },
      recommendations: [
        'Adjust staffing schedules for month-end periods',
        'Proactively schedule maintenance appointments',
        'Prepare marketing campaigns for month-end demand',
        'Optimize inventory for seasonal patterns'
      ],
      actions: [
        {
          id: 'seasonal_staffing',
          title: 'Seasonal Staffing Adjustment',
          description: 'Modify staffing schedules for month-end demand',
          effort: 'medium' as const,
          impact: 'medium' as const,
          category: 'short_term' as const
        },
        {
          id: 'proactive_scheduling',
          title: 'Proactive Appointment Scheduling',
          description: 'Implement proactive scheduling for regular customers',
          effort: 'high' as const,
          impact: 'high' as const,
          category: 'long_term' as const
        }
      ],
      tags: ['seasonal', 'demand', 'staffing', 'patterns'],
      category: 'Operations',
      source: 'Historical Trend Analysis'
    }
  ]

  // Generate insights with realistic timestamps and variations
  insightTemplates.forEach((template, index) => {
    const createdAt = new Date(endDate.getTime() - Math.random() * (endDate.getTime() - startDate.getTime()))
    const expiresAt = new Date(createdAt.getTime() + (7 + Math.random() * 21) * 24 * 60 * 60 * 1000) // 7-28 days
    
    const insight = {
      ...template,
      id: `insight_${Date.now()}_${index}`,
      createdAt,
      expiresAt: Math.random() > 0.7 ? expiresAt : undefined,
      isRead: Math.random() > 0.6, // 40% chance of being read
      isBookmarked: Math.random() > 0.8, // 20% chance of being bookmarked
      // Add some variation to metrics
      metrics: {
        ...template.metrics,
        current: template.metrics.current + (Math.random() - 0.5) * 10,
        previous: template.metrics.previous + (Math.random() - 0.5) * 5,
        change: template.metrics.change + (Math.random() - 0.5) * 5,
        benchmark: template.metrics.benchmark + (Math.random() - 0.5) * 3
      },
      confidence: Math.max(60, Math.min(98, template.confidence + (Math.random() - 0.5) * 10))
    }
    
    insights.push(insight)
  })

  // Sort by priority and creation date
  insights.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  return insights
}
