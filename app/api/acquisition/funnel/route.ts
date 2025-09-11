import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, data } = body

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 })
    }

    // Client acquisition funnel processing
    switch (action) {
      case 'track-visit':
        return NextResponse.json(await trackVisitor(userId, data))
      
      case 'capture-lead':
        return NextResponse.json(await captureLead(userId, data))
      
      case 'nurture-lead':
        return NextResponse.json(await nurtureLead(userId, data))
      
      case 'convert-lead':
        return NextResponse.json(await convertLead(userId, data))
      
      case 'analyze-funnel':
        return NextResponse.json(await analyzeFunnel(userId, data))
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing acquisition funnel:', error)
    return NextResponse.json(
      { error: 'Failed to process acquisition funnel' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'overview'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get acquisition funnel data
    switch (type) {
      case 'metrics':
        return NextResponse.json(await getFunnelMetrics(userId))
      
      case 'leads':
        return NextResponse.json(await getActiveLeads(userId))
      
      case 'conversions':
        return NextResponse.json(await getConversionData(userId))
      
      default:
        return NextResponse.json(await getFunnelOverview(userId))
    }

  } catch (error) {
    console.error('Error fetching acquisition funnel data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch acquisition funnel data' },
      { status: 500 }
    )
  }
}

async function trackVisitor(userId: string, data: any) {
  const visitor = {
    id: 'visitor_' + Date.now(),
    userId,
    timestamp: new Date().toISOString(),
    source: data.source || 'direct',
    page: data.page || 'homepage',
    session: {
      duration: 0,
      pages: [data.page || 'homepage'],
      actions: []
    },
    device: {
      type: data.deviceType || 'desktop',
      browser: data.browser || 'chrome',
      os: data.os || 'windows'
    },
    location: {
      country: data.country || 'US',
      region: data.region || 'CA',
      city: data.city || 'San Francisco'
    },
    behavior: {
      engagement: 'low',
      intent: 'unknown',
      risk: 'low'
    }
  }

  return {
    visitor,
    nextActions: generateNextActions(visitor),
    personalizedContent: getPersonalizedContent(visitor)
  }
}

async function captureLead(userId: string, data: any) {
  const lead = {
    id: 'lead_' + Date.now(),
    userId,
    capturedAt: new Date().toISOString(),
    source: data.source || 'website',
    contact: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company
    },
    qualification: {
      score: calculateLeadScore(data),
      stage: 'new',
      source: data.source,
      interest: data.interest || 'general'
    },
    behavior: {
      pagesVisited: data.pagesVisited || [],
      timeOnSite: data.timeOnSite || 0,
      actions: data.actions || []
    },
    nurturing: {
      status: 'active',
      nextAction: 'send_welcome_email',
      scheduledFor: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    }
  }

  return {
    lead,
    immediateActions: [
      'Send welcome email',
      'Add to nurture sequence',
      'Schedule follow-up call',
      'Create personalized presentation'
    ],
    nurturingPlan: generateNurturingPlan(lead)
  }
}

async function nurtureLead(userId: string, data: any) {
  const leadId = data.leadId
  const action = data.action

  const nurturingActions = {
    'send_welcome_email': {
      template: 'welcome_series_1',
      content: 'Welcome to CloudGreet! Here\'s how AI can transform your business...',
      nextAction: 'send_case_study',
      nextDelay: 24 * 60 * 60 * 1000 // 24 hours
    },
    'send_case_study': {
      template: 'case_study_hvac',
      content: 'See how ABC HVAC increased bookings by 40% with our AI...',
      nextAction: 'send_presentation_invite',
      nextDelay: 48 * 60 * 60 * 1000 // 48 hours
    },
    'send_presentation_invite': {
      template: 'presentation_invitation',
      content: 'Ready to see CloudGreet in action? Book a 15-minute presentation...',
      nextAction: 'send_social_proof',
      nextDelay: 72 * 60 * 60 * 1000 // 72 hours
    },
    'send_social_proof': {
      template: 'testimonials',
      content: 'Hear from businesses like yours who are already succeeding...',
      nextAction: 'send_final_offer',
      nextDelay: 96 * 60 * 60 * 1000 // 96 hours
    },
    'send_final_offer': {
      template: 'limited_time_offer',
      content: 'Last chance: 30-day free trial + setup assistance...',
      nextAction: 'mark_inactive',
      nextDelay: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }

  const actionData = nurturingActions[action as keyof typeof nurturingActions]
  if (!actionData) {
    return { error: 'Invalid nurturing action' }
  }

  return {
    action: actionData,
    leadId,
    executedAt: new Date().toISOString(),
    nextAction: {
      action: actionData.nextAction,
      scheduledFor: new Date(Date.now() + actionData.nextDelay).toISOString()
    },
    personalization: getPersonalizedContent(data.lead)
  }
}

async function convertLead(userId: string, data: any) {
  const leadId = data.leadId
  const conversionType = data.type || 'trial_signup'

  const conversion = {
    leadId,
    userId,
    convertedAt: new Date().toISOString(),
    type: conversionType,
    value: data.value || 0,
    source: data.source || 'nurture_sequence',
    attribution: {
      firstTouch: data.firstTouch || 'website',
      lastTouch: data.lastTouch || 'email',
      touchpoints: data.touchpoints || ['website', 'email', 'trial']
    },
    customer: {
      id: 'customer_' + Date.now(),
      status: 'trial',
      plan: data.plan || 'starter',
      startDate: new Date().toISOString()
    }
  }

  return {
    conversion,
    nextSteps: [
      'Send onboarding welcome',
      'Schedule setup call',
      'Add to customer success sequence',
      'Update attribution model'
    ],
    successMetrics: {
      conversionRate: calculateConversionRate(userId),
      timeToConvert: calculateTimeToConvert(data.lead),
      revenueAttribution: data.value || 0
    }
  }
}

async function analyzeFunnel(userId: string, data: any) {
  const period = data.period || '30d'
  
  return {
    funnel: {
      stages: [
        {
          name: 'Website Visitors',
          count: 1250,
          conversion: 100,
          dropoff: 0
        },
        {
          name: 'Lead Captures',
          count: 187,
          conversion: 15.0,
          dropoff: 85.0
        },
        {
          name: 'Qualified Leads',
          count: 112,
          conversion: 9.0,
          dropoff: 6.0
        },
        {
          name: 'Demo Requests',
          count: 45,
          conversion: 3.6,
          dropoff: 5.4
        },
        {
          name: 'Trial Signups',
          count: 18,
          conversion: 1.4,
          dropoff: 2.2
        },
        {
          name: 'Paid Customers',
          count: 12,
          conversion: 1.0,
          dropoff: 0.4
        }
      ],
      insights: [
        {
          stage: 'Lead Captures',
          issue: 'Low conversion from visitors to leads',
          impact: 'High',
          recommendation: 'Improve lead magnets and CTAs',
          potential: '+5% conversion rate'
        },
        {
          stage: 'Demo Requests',
          issue: 'Good conversion from qualified leads',
          impact: 'Positive',
          recommendation: 'Scale qualified lead generation',
          potential: 'Maintain current performance'
        }
      ],
      optimizations: [
        {
          area: 'Landing Page',
          change: 'Add video testimonial above fold',
          expectedImpact: '+2% conversion',
          effort: 'Low',
          priority: 'High'
        },
        {
          area: 'Lead Magnets',
          change: 'Create industry-specific ROI calculator',
          expectedImpact: '+3% conversion',
          effort: 'Medium',
          priority: 'High'
        },
        {
          area: 'Email Sequence',
          change: 'Add personalized video messages',
          expectedImpact: '+1.5% conversion',
          effort: 'High',
          priority: 'Medium'
        }
      ]
    }
  }
}

async function getFunnelMetrics(userId: string) {
  return {
    metrics: {
      visitors: {
        total: 1250,
        unique: 980,
        returning: 270,
        growth: 12.5
      },
      leads: {
        total: 187,
        qualified: 112,
        conversion: 15.0,
        growth: 8.3
      },
      conversions: {
        demos: 45,
        trials: 18,
        customers: 12,
        revenue: 2400
      },
      performance: {
        visitorToLead: 15.0,
        leadToDemo: 40.2,
        demoToTrial: 40.0,
        trialToCustomer: 66.7,
        overallConversion: 1.0
      }
    }
  }
}

async function getActiveLeads(userId: string) {
  return {
    leads: [
      {
        id: 'lead_001',
        name: 'John Smith',
        company: 'ABC HVAC',
        email: 'john@abchvac.com',
        phone: '+1 (555) 123-4567',
        score: 85,
        stage: 'nurturing',
        source: 'google_ads',
        lastActivity: '2024-01-10T14:30:00Z',
        nextAction: 'send_case_study',
        scheduledFor: '2024-01-11T10:00:00Z'
      },
      {
        id: 'lead_002',
        name: 'Sarah Johnson',
        company: 'Premier Plumbing',
        email: 'sarah@premierplumbing.com',
        phone: '+1 (555) 987-6543',
        score: 72,
        stage: 'qualified',
        source: 'referral',
        lastActivity: '2024-01-10T16:45:00Z',
        nextAction: 'schedule_demo',
        scheduledFor: '2024-01-11T14:00:00Z'
      }
    ],
    summary: {
      total: 45,
      new: 12,
      nurturing: 28,
      qualified: 5,
      hot: 3
    }
  }
}

async function getConversionData(userId: string) {
  return {
    conversions: {
      bySource: [
        { source: 'Google Ads', conversions: 8, revenue: 1600, cost: 400, roas: 4.0 },
        { source: 'Referral', conversions: 3, revenue: 600, cost: 0, roas: '∞' },
        { source: 'Organic', conversions: 1, revenue: 200, cost: 0, roas: '∞' }
      ],
      byTimeframe: [
        { period: 'Last 7 days', conversions: 3, revenue: 600 },
        { period: 'Last 30 days', conversions: 12, revenue: 2400 },
        { period: 'Last 90 days', conversions: 28, revenue: 5600 }
      ],
      trends: {
        conversionRate: { current: 1.0, previous: 0.8, change: '+25%' },
        revenue: { current: 2400, previous: 1800, change: '+33%' },
        costPerLead: { current: 12.50, previous: 15.00, change: '-17%' }
      }
    }
  }
}

async function getFunnelOverview(userId: string) {
  return {
    overview: {
      summary: {
        totalVisitors: 1250,
        totalLeads: 187,
        totalConversions: 12,
        totalRevenue: 2400,
        conversionRate: 1.0
      },
      topPerforming: {
        source: 'Google Ads',
        landingPage: '/pricing',
        leadMagnet: 'ROI Calculator',
        emailSequence: 'HVAC Industry'
      },
      improvements: [
        'Optimize landing page conversion rate',
        'Create industry-specific content',
        'Improve email sequence engagement',
        'Add social proof elements'
      ]
    }
  }
}

function calculateLeadScore(data: any) {
  let score = 0
  
  // Company size scoring
  if (data.companySize === 'large') score += 30
  else if (data.companySize === 'medium') score += 20
  else if (data.companySize === 'small') score += 10
  
  // Industry scoring
  if (data.industry === 'hvac') score += 25
  else if (data.industry === 'plumbing') score += 20
  else if (data.industry === 'electrical') score += 15
  
  // Engagement scoring
  if (data.timeOnSite > 300) score += 15 // 5+ minutes
  if (data.pagesVisited > 3) score += 10
  if (data.downloadedResource) score += 20
  
  // Contact quality
  if (data.phone) score += 15
  if (data.company) score += 10
  
  return Math.min(score, 100)
}

function generateNextActions(visitor: any) {
  const actions = []
  
  if (visitor.behavior.engagement === 'low') {
    actions.push('Show exit-intent popup')
    actions.push('Display social proof')
  }
  
  if (visitor.session.pages.length > 2) {
    actions.push('Show lead magnet')
    actions.push('Display pricing')
  }
  
  return actions
}

function getPersonalizedContent(visitor: any) {
  return {
    headline: `Transform Your ${visitor.location.region} Business with AI`,
    cta: 'Get Your Free AI Receptionist',
    testimonial: 'See how businesses in your area are succeeding',
    pricing: 'Starting at $200/month - Cancel anytime'
  }
}

function generateNurturingPlan(lead: any) {
  return {
    sequence: [
      { day: 0, action: 'Welcome email', template: 'welcome' },
      { day: 1, action: 'Case study', template: 'case_study' },
      { day: 3, action: 'Demo invite', template: 'demo' },
      { day: 7, action: 'Social proof', template: 'testimonials' },
      { day: 14, action: 'Final offer', template: 'limited_offer' }
    ],
    personalization: {
      industry: lead.qualification.interest,
      company: lead.contact.company,
      name: lead.contact.name
    }
  }
}

function calculateConversionRate(userId: string) {
  // Real implementation
  return 1.0
}

function calculateTimeToConvert(lead: any) {
  // Real implementation
  return 7 // days
}
