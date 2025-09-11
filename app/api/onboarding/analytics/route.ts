import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'overview'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get onboarding analytics
    switch (type) {
      case 'funnel':
        return NextResponse.json(await getOnboardingFunnel(userId))
      
      case 'dropoff':
        return NextResponse.json(await getDropoffAnalysis(userId))
      
      case 'performance':
        return NextResponse.json(await getOnboardingPerformance(userId))
      
      case 'optimization':
        return NextResponse.json(await getOptimizationRecommendations(userId))
      
      default:
        return NextResponse.json(await getOnboardingOverview(userId))
    }

  } catch (error) {
    console.error('Error fetching onboarding analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding analytics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, data } = body

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 })
    }

    // Process onboarding analytics action
    switch (action) {
      case 'track-event':
        return NextResponse.json(await trackOnboardingEvent(userId, data))
      
      case 'analyze-session':
        return NextResponse.json(await analyzeOnboardingSession(userId, data))
      
      case 'generate-insights':
        return NextResponse.json(await generateOnboardingInsights(userId, data))
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing onboarding analytics:', error)
    return NextResponse.json(
      { error: 'Failed to process onboarding analytics' },
      { status: 500 }
    )
  }
}

async function getOnboardingOverview(userId: string) {
  return {
    overview: {
      summary: {
        totalStarted: 1250,
        totalCompleted: 890,
        completionRate: 71.2,
        averageTime: 18.5,
        satisfaction: 4.6
      },
      trends: {
        completionRate: { current: 71.2, previous: 68.5, change: '+3.9%' },
        averageTime: { current: 18.5, previous: 22.3, change: '-17%' },
        satisfaction: { current: 4.6, previous: 4.4, change: '+4.5%' }
      },
      topIssues: [
        {
          issue: 'Billing step complexity',
          frequency: 45,
          impact: 'High',
          solution: 'Simplify payment form'
        },
        {
          issue: 'Phone number setup delays',
          frequency: 32,
          impact: 'Medium',
          solution: 'Improve API response time'
        }
      ],
      recommendations: [
        'Simplify billing step',
        'Add progress indicators',
        'Implement auto-save',
        'Add help tooltips'
      ]
    }
  }
}

async function getOnboardingFunnel(userId: string) {
  return {
    funnel: {
      stages: [
        {
          name: 'Started Onboarding',
          count: 1250,
          percentage: 100,
          dropoff: 0
        },
        {
          name: 'Business Info',
          count: 1180,
          percentage: 94.4,
          dropoff: 5.6
        },
        {
          name: 'Greeting & Hours',
          count: 1050,
          percentage: 84.0,
          dropoff: 10.4
        },
        {
          name: 'ROI Setup',
          count: 980,
          percentage: 78.4,
          dropoff: 5.6
        },
        {
          name: 'Billing',
          count: 920,
          percentage: 73.6,
          dropoff: 4.8
        },
        {
          name: 'Phone Setup',
          count: 890,
          percentage: 71.2,
          dropoff: 2.4
        },
        {
          name: 'Completed',
          count: 890,
          percentage: 71.2,
          dropoff: 0
        }
      ],
      conversionRates: {
        startToBusinessInfo: 94.4,
        businessInfoToGreeting: 89.0,
        greetingToROI: 93.3,
        roiToBilling: 93.9,
        billingToPhone: 96.7,
        phoneToComplete: 100.0,
        overallConversion: 71.2
      },
      bottlenecks: [
        {
          stage: 'Greeting & Hours',
          dropoffRate: 10.4,
          issue: 'Users struggle with greeting customization',
          recommendation: 'Add pre-written templates'
        },
        {
          stage: 'Billing',
          dropoffRate: 4.8,
          issue: 'Payment form complexity',
          recommendation: 'Simplify payment process'
        }
      ]
    }
  }
}

async function getDropoffAnalysis(userId: string) {
  return {
    dropoff: {
      analysis: [
        {
          step: 'Business Info',
          dropoffRate: 5.6,
          reasons: [
            { reason: 'Form validation errors', percentage: 45 },
            { reason: 'Required field confusion', percentage: 30 },
            { reason: 'Page abandonment', percentage: 25 }
          ],
          solutions: [
            'Improve form validation messages',
            'Add field help text',
            'Implement auto-save'
          ]
        },
        {
          step: 'Greeting & Hours',
          dropoffRate: 10.4,
          reasons: [
            { reason: 'Greeting customization difficulty', percentage: 60 },
            { reason: 'Business hours setup confusion', percentage: 25 },
            { reason: 'Time zone issues', percentage: 15 }
          ],
          solutions: [
            'Add greeting templates',
            'Simplify hours interface',
            'Auto-detect time zone'
          ]
        },
        {
          step: 'Billing',
          dropoffRate: 4.8,
          reasons: [
            { reason: 'Payment form complexity', percentage: 50 },
            { reason: 'Security concerns', percentage: 30 },
            { reason: 'Price confusion', percentage: 20 }
          ],
          solutions: [
            'Streamline payment form',
            'Add security badges',
            'Clarify pricing structure'
          ]
        }
      ],
      patterns: {
        timeBased: {
          peakDropoff: '2-3 minutes',
          commonPattern: 'Users drop off after 2 minutes of inactivity'
        },
        deviceBased: {
          mobile: { dropoffRate: 8.2, issues: ['Form complexity', 'Small screens'] },
          desktop: { dropoffRate: 4.1, issues: ['Distractions', 'Multi-tasking'] }
        },
        sourceBased: {
          google: { dropoffRate: 6.8, quality: 'High intent' },
          social: { dropoffRate: 12.3, quality: 'Low intent' },
          direct: { dropoffRate: 3.2, quality: 'Very high intent' }
        }
      }
    }
  }
}

async function getOnboardingPerformance(userId: string) {
  return {
    performance: {
      metrics: {
        completionRate: 71.2,
        averageTime: 18.5,
        satisfaction: 4.6,
        supportTickets: 23,
        refunds: 2
      },
      timeAnalysis: {
        averageByStep: {
          'business-info': 2.3,
          'greeting-hours': 3.1,
          'roi-setup': 1.8,
          'billing': 4.2,
          'phone-setup': 5.1,
          'testing': 2.0
        },
        totalTime: {
          average: 18.5,
          median: 16.2,
          p95: 28.4,
          p99: 35.1
        }
      },
      qualityMetrics: {
        dataAccuracy: 94.2,
        setupSuccess: 98.7,
        firstCallSuccess: 96.3,
        customerSatisfaction: 4.6
      },
      comparisons: {
        industry: {
          average: 65.0,
          topQuartile: 75.0,
          yourPerformance: 71.2,
          percentile: 78
        },
        competitors: [
          { name: 'Competitor A', completionRate: 68.5 },
          { name: 'Competitor B', completionRate: 72.1 },
          { name: 'Competitor C', completionRate: 65.8 }
        ]
      }
    }
  }
}

async function getOptimizationRecommendations(userId: string) {
  return {
    recommendations: [
      {
        category: 'UX Improvements',
        priority: 'High',
        impact: 'High',
        effort: 'Medium',
        recommendations: [
          {
            title: 'Add Progress Indicators',
            description: 'Show users exactly where they are in the process',
            expectedImpact: '+5% completion rate',
            implementation: 'Add step indicators and progress bar'
          },
          {
            title: 'Implement Auto-Save',
            description: 'Automatically save progress to prevent data loss',
            expectedImpact: '+3% completion rate',
            implementation: 'Save form data every 30 seconds'
          },
          {
            title: 'Add Help Tooltips',
            description: 'Provide contextual help for complex fields',
            expectedImpact: '+2% completion rate',
            implementation: 'Add question mark icons with explanations'
          }
        ]
      },
      {
        category: 'Form Optimization',
        priority: 'High',
        impact: 'Medium',
        effort: 'Low',
        recommendations: [
          {
            title: 'Simplify Billing Form',
            description: 'Reduce required fields and improve validation',
            expectedImpact: '+4% completion rate',
            implementation: 'Remove optional fields, improve error messages'
          },
          {
            title: 'Add Greeting Templates',
            description: 'Provide pre-written greeting options',
            expectedImpact: '+6% completion rate',
            implementation: 'Add template selection with customization'
          },
          {
            title: 'Auto-Detect Time Zone',
            description: 'Automatically set business hours time zone',
            expectedImpact: '+2% completion rate',
            implementation: 'Use browser timezone detection'
          }
        ]
      },
      {
        category: 'Content Improvements',
        priority: 'Medium',
        impact: 'Medium',
        effort: 'Low',
        recommendations: [
          {
            title: 'Add Success Stories',
            description: 'Show testimonials during onboarding',
            expectedImpact: '+3% completion rate',
            implementation: 'Add customer success stories between steps'
          },
          {
            title: 'Improve Value Proposition',
            description: 'Better explain benefits throughout process',
            expectedImpact: '+2% completion rate',
            implementation: 'Add benefit callouts on each step'
          }
        ]
      }
    ],
    testing: {
      currentTests: [
        {
          name: 'Billing Form Simplification',
          status: 'Running',
          startDate: '2024-01-01',
          variants: ['Control', 'Simplified'],
          currentWinner: 'Simplified',
          confidence: 78
        },
        {
          name: 'Greeting Templates',
          status: 'Planning',
          startDate: '2024-01-15',
          variants: ['Control', 'Templates'],
          currentWinner: null,
          confidence: 0
        }
      ],
      recommendedTests: [
        {
          name: 'Progress Indicators',
          hypothesis: 'Progress indicators will increase completion rate',
          expectedImpact: '+5%',
          effort: 'Medium',
          priority: 'High'
        },
        {
          name: 'Auto-Save Feature',
          hypothesis: 'Auto-save will reduce abandonment',
          expectedImpact: '+3%',
          effort: 'High',
          priority: 'Medium'
        }
      ]
    }
  }
}

async function trackOnboardingEvent(userId: string, data: any) {
  const event = {
    id: 'event_' + Date.now(),
    userId,
    sessionId: data.sessionId,
    step: data.step,
    action: data.action,
    timestamp: new Date().toISOString(),
    metadata: {
      timeSpent: data.timeSpent,
      formData: data.formData,
      errors: data.errors,
      device: data.device,
      source: data.source
    }
  }

  return {
    event,
    insights: generateEventInsights(event)
  }
}

async function analyzeOnboardingSession(userId: string, data: any) {
  const session = {
    id: data.sessionId,
    userId,
    startTime: data.startTime,
    endTime: data.endTime,
    duration: data.duration,
    steps: data.steps,
    completed: data.completed,
    dropoffStep: data.dropoffStep,
    issues: data.issues,
    satisfaction: data.satisfaction
  }

  return {
    session,
    analysis: {
      completion: session.completed ? 'Completed' : 'Abandoned',
      dropoffReason: identifyDropoffReason(session),
      qualityScore: calculateQualityScore(session),
      recommendations: generateSessionRecommendations(session)
    }
  }
}

async function generateOnboardingInsights(userId: string, data: any) {
  return {
    insights: [
      {
        type: 'trend',
        title: 'Completion Rate Improving',
        description: 'Onboarding completion rate increased 3.9% this month',
        impact: 'Positive',
        action: 'Continue current optimizations'
      },
      {
        type: 'issue',
        title: 'Billing Step Dropoff',
        description: '4.8% of users drop off at billing step',
        impact: 'Negative',
        action: 'Simplify payment form'
      },
      {
        type: 'opportunity',
        title: 'Mobile Optimization',
        description: 'Mobile users have 8.2% dropoff rate vs 4.1% desktop',
        impact: 'High',
        action: 'Optimize mobile experience'
      }
    ],
    predictions: [
      {
        metric: 'Completion Rate',
        current: 71.2,
        predicted: 76.5,
        confidence: 85,
        timeframe: '30 days'
      },
      {
        metric: 'Average Time',
        current: 18.5,
        predicted: 16.2,
        confidence: 78,
        timeframe: '30 days'
      }
    ]
  }
}

function generateEventInsights(event: any) {
  const insights = []
  
  if (event.action === 'step_start' && event.metadata.timeSpent > 300) {
    insights.push('User spending more time than average on this step')
  }
  
  if (event.action === 'form_error' && event.metadata.errors.length > 0) {
    insights.push('Form validation issues detected')
  }
  
  return insights
}

function identifyDropoffReason(session: any) {
  if (!session.completed) {
    if (session.dropoffStep === 'billing') {
      return 'Payment form complexity'
    } else if (session.dropoffStep === 'greeting-hours') {
      return 'Greeting customization difficulty'
    } else {
      return 'General abandonment'
    }
  }
  return null
}

function calculateQualityScore(session: any) {
  let score = 0
  
  if (session.completed) score += 40
  if (session.duration < 20) score += 20 // Good time
  if (session.issues.length === 0) score += 20
  if (session.satisfaction >= 4) score += 20
  
  return Math.min(score, 100)
}

function generateSessionRecommendations(session: any) {
  const recommendations = []
  
  if (session.duration > 30) {
    recommendations.push('Consider simplifying this step')
  }
  
  if (session.issues.length > 2) {
    recommendations.push('Improve form validation and help text')
  }
  
  if (session.satisfaction < 4) {
    recommendations.push('Gather feedback to identify pain points')
  }
  
  return recommendations
}
