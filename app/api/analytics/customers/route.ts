import { NextRequest, NextResponse } from 'next/server'

interface CustomerSegment {
  id: string
  name: string
  description: string
  criteria: string[]
  customerCount: number
  averageValue: number
  retentionRate: number
  satisfactionScore: number
  growthRate: number
  characteristics: {
    ageRange: string
    incomeLevel: string
    servicePreferences: string[]
    communicationPreferences: string[]
    locationType: string
  }
}

interface CustomerAnalytics {
  overview: {
    totalCustomers: number
    newCustomers: number
    returningCustomers: number
    activeCustomers: number
    churnedCustomers: number
    customerRetentionRate: number
    averageCustomerLifetime: number
    customerSatisfactionScore: number
  }
  segmentation: {
    segments: CustomerSegment[]
    segmentDistribution: Array<{
      segmentName: string
      percentage: number
      customerCount: number
    }>
    segmentPerformance: Array<{
      segmentName: string
      revenue: number
      bookings: number
      satisfaction: number
      growthRate: number
    }>
  }
  repeatCustomerAnalysis: {
    repeatCustomerRate: number
    averageRepeatFrequency: number
    repeatCustomerValue: number
    loyaltyTiers: Array<{
      tier: string
      customerCount: number
      averageValue: number
      benefits: string[]
    }>
    churnAnalysis: {
      churnRate: number
      averageTimeToChurn: number
      churnReasons: Array<{
        reason: string
        percentage: number
        customerCount: number
      }>
      retentionStrategies: string[]
    }
  }
  acquisitionMetrics: {
    customerAcquisitionCost: number
    acquisitionChannels: Array<{
      channel: string
      customers: number
      cost: number
      conversionRate: number
      roi: number
    }>
    acquisitionTrends: Array<{
      date: string
      newCustomers: number
      acquisitionCost: number
      channel: string
    }>
    lifetimeValue: {
      averageLTV: number
      ltvBySegment: Array<{
        segment: string
        ltv: number
        paybackPeriod: number
      }>
      ltvTrends: Array<{
        date: string
        ltv: number
        segment: string
      }>
    }
  }
  satisfactionAnalysis: {
    overallSatisfaction: number
    satisfactionTrends: Array<{
      date: string
      score: number
      responseCount: number
    }>
    satisfactionByService: Array<{
      serviceName: string
      satisfactionScore: number
      responseCount: number
      improvementAreas: string[]
    }>
    feedbackAnalysis: {
      positiveFeedback: Array<{
        theme: string
        frequency: number
        sentiment: number
      }>
      negativeFeedback: Array<{
        theme: string
        frequency: number
        sentiment: number
        actionItems: string[]
      }>
      commonComplaints: Array<{
        complaint: string
        frequency: number
        resolutionRate: number
      }>
    }
    npsScore: {
      score: number
      promoters: number
      passives: number
      detractors: number
      trends: Array<{
        date: string
        score: number
      }>
    }
  }
  geographicDistribution: {
    totalLocations: number
    coverageMap: Array<{
      region: string
      state: string
      city: string
      customerCount: number
      revenue: number
      marketShare: number
      growthRate: number
    }>
    regionalPerformance: Array<{
      region: string
      customers: number
      revenue: number
      satisfaction: number
      marketPenetration: number
    }>
    expansionOpportunities: Array<{
      location: string
      potentialCustomers: number
      marketSize: number
      competitionLevel: string
      estimatedROI: number
    }>
  }
  behavioralInsights: {
    servicePreferences: Array<{
      serviceName: string
      popularity: number
      customerSegment: string
      seasonality: string
    }>
    communicationPreferences: Array<{
      method: string
      usage: number
      effectiveness: number
      customerSatisfaction: number
    }>
    bookingPatterns: {
      preferredDays: Array<{
        day: string
        bookings: number
        percentage: number
      }>
      preferredTimes: Array<{
        timeSlot: string
        bookings: number
        percentage: number
      }>
      seasonalPatterns: Array<{
        season: string
        bookings: number
        services: string[]
      }>
    }
    engagementMetrics: {
      averageSessionsPerCustomer: number
      averageTimeOnPlatform: number
      featureUsage: Array<{
        feature: string
        usageRate: number
        customerSatisfaction: number
      }>
      supportInteractions: Array<{
        type: string
        frequency: number
        resolutionRate: number
        satisfaction: number
      }>
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const timeRange = searchParams.get('timeRange') || '30d'
    const segmentFilter = searchParams.get('segment') || 'all'
    const includeDetails = searchParams.get('includeDetails') === 'true'
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log(`👥 Fetching customer analytics for user ${userId}, range: ${timeRange}, segment: ${segmentFilter}`)

    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    
    switch (timeRange) {
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
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Generate customer segments
    const segments: CustomerSegment[] = [
      {
        id: 'premium',
        name: 'Premium Customers',
        description: 'High-value customers with multiple services and high satisfaction',
        criteria: ['High revenue', 'Multiple services', 'High satisfaction'],
        customerCount: 45,
        averageValue: 2500,
        retentionRate: 95,
        satisfactionScore: 4.8,
        growthRate: 15,
        characteristics: {
          ageRange: '35-55',
          incomeLevel: 'High',
          servicePreferences: ['HVAC Installation', 'Premium Maintenance'],
          communicationPreferences: ['Email', 'Phone'],
          locationType: 'Suburban'
        }
      },
      {
        id: 'regular',
        name: 'Regular Customers',
        description: 'Steady customers with consistent service needs',
        criteria: ['Regular maintenance', 'Good payment history'],
        customerCount: 120,
        averageValue: 800,
        retentionRate: 85,
        satisfactionScore: 4.3,
        growthRate: 8,
        characteristics: {
          ageRange: '30-65',
          incomeLevel: 'Middle',
          servicePreferences: ['HVAC Repair', 'Maintenance'],
          communicationPreferences: ['Phone', 'SMS'],
          locationType: 'Urban/Suburban'
        }
      },
      {
        id: 'emergency',
        name: 'Emergency Customers',
        description: 'Customers who primarily use emergency services',
        criteria: ['Emergency calls', 'Urgent repairs'],
        customerCount: 80,
        averageValue: 1200,
        retentionRate: 70,
        satisfactionScore: 4.1,
        growthRate: 12,
        characteristics: {
          ageRange: '25-60',
          incomeLevel: 'Middle-High',
          servicePreferences: ['Emergency Service', 'Quick Repairs'],
          communicationPreferences: ['Phone', 'App'],
          locationType: 'Urban'
        }
      },
      {
        id: 'new',
        name: 'New Customers',
        description: 'Recently acquired customers in their first year',
        criteria: ['First-time customers', 'Recent acquisition'],
        customerCount: 60,
        averageValue: 600,
        retentionRate: 75,
        satisfactionScore: 4.2,
        growthRate: 25,
        characteristics: {
          ageRange: '25-45',
          incomeLevel: 'Middle',
          servicePreferences: ['HVAC Repair', 'Installation'],
          communicationPreferences: ['Online', 'Phone'],
          locationType: 'Mixed'
        }
      }
    ]

    // Generate overview metrics
    const totalCustomers = segments.reduce((sum, segment) => sum + segment.customerCount, 0)
    const newCustomers = Math.floor(Math.random() * 20) + 10
    const returningCustomers = Math.floor(totalCustomers * 0.7)
    const activeCustomers = Math.floor(totalCustomers * 0.85)
    const churnedCustomers = Math.floor(totalCustomers * 0.15)

    const overview = {
      totalCustomers,
      newCustomers,
      returningCustomers,
      activeCustomers,
      churnedCustomers,
      customerRetentionRate: (returningCustomers / totalCustomers) * 100,
      averageCustomerLifetime: Math.floor(Math.random() * 24) + 18, // months
      customerSatisfactionScore: 4.4
    }

    // Generate segmentation data
    const segmentDistribution = segments.map(segment => ({
      segmentName: segment.name,
      percentage: (segment.customerCount / totalCustomers) * 100,
      customerCount: segment.customerCount
    }))

    const segmentPerformance = segments.map(segment => ({
      segmentName: segment.name,
      revenue: segment.customerCount * segment.averageValue,
      bookings: Math.floor(segment.customerCount * 2.5),
      satisfaction: segment.satisfactionScore,
      growthRate: segment.growthRate
    }))

    // Generate repeat customer analysis
    const repeatCustomerAnalysis = {
      repeatCustomerRate: 68,
      averageRepeatFrequency: 3.2,
      repeatCustomerValue: 1200,
      loyaltyTiers: [
        {
          tier: 'Gold',
          customerCount: 25,
          averageValue: 3000,
          benefits: ['Priority Service', 'Discounts', 'Extended Warranty']
        },
        {
          tier: 'Silver',
          customerCount: 60,
          averageValue: 1500,
          benefits: ['Faster Response', 'Service Discounts']
        },
        {
          tier: 'Bronze',
          customerCount: 100,
          averageValue: 800,
          benefits: ['Standard Service', 'Basic Support']
        }
      ],
      churnAnalysis: {
        churnRate: 15,
        averageTimeToChurn: 18, // months
        churnReasons: [
          { reason: 'Price sensitivity', percentage: 35, customerCount: 12 },
          { reason: 'Service quality', percentage: 25, customerCount: 9 },
          { reason: 'Moving location', percentage: 20, customerCount: 7 },
          { reason: 'Competitor switch', percentage: 15, customerCount: 5 },
          { reason: 'Other', percentage: 5, customerCount: 2 }
        ],
        retentionStrategies: [
          'Implement loyalty program',
          'Improve service quality',
          'Offer competitive pricing',
          'Enhance customer communication',
          'Provide proactive maintenance'
        ]
      }
    }

    // Generate acquisition metrics
    const acquisitionMetrics = {
      customerAcquisitionCost: 150,
      acquisitionChannels: [
        { channel: 'Referrals', customers: 45, cost: 0, conversionRate: 65, roi: 400 },
        { channel: 'Google Ads', customers: 30, cost: 4500, conversionRate: 25, roi: 200 },
        { channel: 'Social Media', customers: 20, cost: 2000, conversionRate: 20, roi: 150 },
        { channel: 'Direct Mail', customers: 15, cost: 1500, conversionRate: 15, roi: 100 },
        { channel: 'Website', customers: 25, cost: 1000, conversionRate: 30, roi: 300 }
      ],
      acquisitionTrends: generateAcquisitionTrends(startDate, now),
      lifetimeValue: {
        averageLTV: 1800,
        ltvBySegment: segments.map(segment => ({
          segment: segment.name,
          ltv: segment.averageValue * 2.5,
          paybackPeriod: Math.floor(segment.averageValue / 150) // months
        })),
        ltvTrends: generateLTVTrends(startDate, now)
      }
    }

    // Generate satisfaction analysis
    const satisfactionAnalysis = {
      overallSatisfaction: 4.4,
      satisfactionTrends: generateSatisfactionTrends(startDate, now),
      satisfactionByService: [
        { serviceName: 'HVAC Repair', satisfactionScore: 4.5, responseCount: 120, improvementAreas: ['Response time', 'Communication'] },
        { serviceName: 'HVAC Installation', satisfactionScore: 4.6, responseCount: 45, improvementAreas: ['Installation process', 'Cleanup'] },
        { serviceName: 'Maintenance', satisfactionScore: 4.7, responseCount: 200, improvementAreas: ['Scheduling flexibility'] },
        { serviceName: 'Emergency Service', satisfactionScore: 4.2, responseCount: 80, improvementAreas: ['Response time', 'Pricing transparency'] }
      ],
      feedbackAnalysis: {
        positiveFeedback: [
          { theme: 'Professional service', frequency: 85, sentiment: 0.9 },
          { theme: 'Quick response', frequency: 70, sentiment: 0.8 },
          { theme: 'Fair pricing', frequency: 60, sentiment: 0.7 },
          { theme: 'Clean work', frequency: 55, sentiment: 0.8 }
        ],
        negativeFeedback: [
          { theme: 'Response time', frequency: 25, sentiment: -0.6, actionItems: ['Improve scheduling', 'Add more technicians'] },
          { theme: 'Communication', frequency: 20, sentiment: -0.5, actionItems: ['Better status updates', 'Clearer explanations'] },
          { theme: 'Pricing', frequency: 15, sentiment: -0.7, actionItems: ['Transparent pricing', 'Upfront estimates'] }
        ],
        commonComplaints: [
          { complaint: 'Long wait times', frequency: 30, resolutionRate: 80 },
          { complaint: 'Unclear pricing', frequency: 20, resolutionRate: 90 },
          { complaint: 'Poor communication', frequency: 15, resolutionRate: 85 }
        ]
      },
      npsScore: {
        score: 45,
        promoters: 60,
        passives: 25,
        detractors: 15,
        trends: generateNPSTrends(startDate, now)
      }
    }

    // Generate geographic distribution
    const geographicDistribution = {
      totalLocations: 15,
      coverageMap: [
        { region: 'West', state: 'CA', city: 'Los Angeles', customerCount: 45, revenue: 90000, marketShare: 25, growthRate: 12 },
        { region: 'West', state: 'CA', city: 'San Francisco', customerCount: 35, revenue: 70000, marketShare: 20, growthRate: 15 },
        { region: 'South', state: 'TX', city: 'Houston', customerCount: 40, revenue: 80000, marketShare: 22, growthRate: 10 },
        { region: 'South', state: 'FL', city: 'Miami', customerCount: 30, revenue: 60000, marketShare: 18, growthRate: 18 },
        { region: 'Northeast', state: 'NY', city: 'New York', customerCount: 50, revenue: 100000, marketShare: 28, growthRate: 8 },
        { region: 'Midwest', state: 'IL', city: 'Chicago', customerCount: 35, revenue: 70000, marketShare: 20, growthRate: 14 }
      ],
      regionalPerformance: [
        { region: 'West', customers: 80, revenue: 160000, satisfaction: 4.5, marketPenetration: 15 },
        { region: 'South', customers: 70, revenue: 140000, satisfaction: 4.3, marketPenetration: 12 },
        { region: 'Northeast', customers: 50, revenue: 100000, satisfaction: 4.4, marketPenetration: 18 },
        { region: 'Midwest', customers: 35, revenue: 70000, satisfaction: 4.2, marketPenetration: 10 }
      ],
      expansionOpportunities: [
        { location: 'Phoenix, AZ', potentialCustomers: 200, marketSize: 500000, competitionLevel: 'Medium', estimatedROI: 250 },
        { location: 'Denver, CO', potentialCustomers: 150, marketSize: 400000, competitionLevel: 'Low', estimatedROI: 300 },
        { location: 'Atlanta, GA', potentialCustomers: 180, marketSize: 450000, competitionLevel: 'High', estimatedROI: 200 }
      ]
    }

    // Generate behavioral insights
    const behavioralInsights = {
      servicePreferences: [
        { serviceName: 'HVAC Repair', popularity: 85, customerSegment: 'Regular', seasonality: 'Year-round' },
        { serviceName: 'Maintenance', popularity: 70, customerSegment: 'Premium', seasonality: 'Spring/Fall' },
        { serviceName: 'HVAC Installation', popularity: 45, customerSegment: 'Premium', seasonality: 'Spring/Summer' },
        { serviceName: 'Emergency Service', popularity: 60, customerSegment: 'Emergency', seasonality: 'Summer/Winter' }
      ],
      communicationPreferences: [
        { method: 'Phone', usage: 80, effectiveness: 90, customerSatisfaction: 4.5 },
        { method: 'Email', usage: 60, effectiveness: 70, customerSatisfaction: 4.2 },
        { method: 'SMS', usage: 45, effectiveness: 85, customerSatisfaction: 4.6 },
        { method: 'App', usage: 30, effectiveness: 75, customerSatisfaction: 4.3 }
      ],
      bookingPatterns: {
        preferredDays: [
          { day: 'Monday', bookings: 45, percentage: 18 },
          { day: 'Tuesday', bookings: 50, percentage: 20 },
          { day: 'Wednesday', bookings: 55, percentage: 22 },
          { day: 'Thursday', bookings: 50, percentage: 20 },
          { day: 'Friday', bookings: 40, percentage: 16 },
          { day: 'Saturday', bookings: 10, percentage: 4 }
        ],
        preferredTimes: [
          { timeSlot: '8:00-10:00 AM', bookings: 60, percentage: 24 },
          { timeSlot: '10:00-12:00 PM', bookings: 50, percentage: 20 },
          { timeSlot: '1:00-3:00 PM', bookings: 55, percentage: 22 },
          { timeSlot: '3:00-5:00 PM', bookings: 45, percentage: 18 },
          { timeSlot: '5:00-7:00 PM', bookings: 40, percentage: 16 }
        ],
        seasonalPatterns: [
          { season: 'Spring', bookings: 80, services: ['Maintenance', 'Installation'] },
          { season: 'Summer', bookings: 120, services: ['Repair', 'Emergency'] },
          { season: 'Fall', bookings: 70, services: ['Maintenance', 'Installation'] },
          { season: 'Winter', bookings: 100, services: ['Repair', 'Emergency'] }
        ]
      },
      engagementMetrics: {
        averageSessionsPerCustomer: 4.2,
        averageTimeOnPlatform: 12, // minutes
        featureUsage: [
          { feature: 'Booking', usageRate: 90, customerSatisfaction: 4.5 },
          { feature: 'Service History', usageRate: 60, customerSatisfaction: 4.3 },
          { feature: 'Payment', usageRate: 80, customerSatisfaction: 4.4 },
          { feature: 'Reviews', usageRate: 40, customerSatisfaction: 4.2 }
        ],
        supportInteractions: [
          { type: 'Technical Support', frequency: 25, resolutionRate: 90, satisfaction: 4.3 },
          { type: 'Billing Questions', frequency: 20, resolutionRate: 95, satisfaction: 4.5 },
          { type: 'Service Inquiries', frequency: 35, resolutionRate: 85, satisfaction: 4.2 },
          { type: 'Complaints', frequency: 10, resolutionRate: 80, satisfaction: 4.0 }
        ]
      }
    }

    const customerAnalytics: CustomerAnalytics = {
      overview,
      segmentation: {
        segments,
        segmentDistribution,
        segmentPerformance
      },
      repeatCustomerAnalysis,
      acquisitionMetrics,
      satisfactionAnalysis,
      geographicDistribution,
      behavioralInsights
    }

    return NextResponse.json({
      success: true,
      data: customerAnalytics,
      metadata: {
        userId,
        timeRange,
        segmentFilter,
        includeDetails,
        generatedAt: new Date().toISOString(),
        dataFreshness: 'real-time'
      }
    })

  } catch (error) {
    console.error('Error fetching customer analytics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch customer analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Helper functions
function generateAcquisitionTrends(startDate: Date, endDate: Date) {
  const trends = []
  const current = new Date(startDate)
  const channels = ['Referrals', 'Google Ads', 'Social Media', 'Direct Mail', 'Website']
  
  while (current <= endDate) {
    const channel = channels[Math.floor(Math.random() * channels.length)]
    trends.push({
      date: current.toISOString().split('T')[0],
      newCustomers: Math.floor(Math.random() * 10) + 2,
      acquisitionCost: Math.floor(Math.random() * 500) + 100,
      channel
    })
    current.setDate(current.getDate() + 1)
  }
  return trends
}

function generateLTVTrends(startDate: Date, endDate: Date) {
  const trends = []
  const current = new Date(startDate)
  const segments = ['Premium', 'Regular', 'Emergency', 'New']
  
  while (current <= endDate) {
    const segment = segments[Math.floor(Math.random() * segments.length)]
    trends.push({
      date: current.toISOString().split('T')[0],
      ltv: Math.floor(Math.random() * 1000) + 1000,
      segment
    })
    current.setDate(current.getDate() + 7)
  }
  return trends
}

function generateSatisfactionTrends(startDate: Date, endDate: Date) {
  const trends = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    trends.push({
      date: current.toISOString().split('T')[0],
      score: Math.floor(Math.random() * 0.5) + 4.2, // 4.2-4.7
      responseCount: Math.floor(Math.random() * 20) + 10
    })
    current.setDate(current.getDate() + 1)
  }
  return trends
}

function generateNPSTrends(startDate: Date, endDate: Date) {
  const trends = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    trends.push({
      date: current.toISOString().split('T')[0],
      score: Math.floor(Math.random() * 20) + 35 // 35-55
    })
    current.setDate(current.getDate() + 7)
  }
  return trends
}
