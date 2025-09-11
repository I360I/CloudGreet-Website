import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('range') || '30d'
    const businessName = searchParams.get('businessName')
    const onboardingComplete = businessName && businessName !== 'Demo User'
    
    if (!onboardingComplete) {
      return NextResponse.json({
        success: true,
        data: {
          smartRouting: { totalCalls: 0, aiHandled: 0, forwardedToOwner: 0, confidenceThreshold: 70, averageConfidence: 0 },
          multiLanguage: { english: { count: 0, percentage: 0 }, spanish: { count: 0, percentage: 0 }, autoDetection: false },
          spamFilter: { totalCalls: 0, spamBlocked: 0, savings: 0, detectionRate: 0 },
          leadQualification: { totalLeads: 0, qualified: 0, qualificationRate: 0, criteria: { budgetQualified: 0, serviceMatch: 0, locationValid: 0, timelineRealistic: 0 } },
          jobCategories: {},
          callerRecognition: { repeatCallers: 0, recognitionRate: 0, averageCallerHistory: 0 },
          appointmentRules: { minNotice: 24, maxJobsPerDay: 8, defaultJobLength: 120 },
          message: 'Complete onboarding to start receiving analytics'
        },
        timestamp: new Date().toISOString()
      })
    }

    // Simulate advanced analytics data for real business
    const analytics = {
      smartRouting: {
        totalCalls: 45,
        aiHandled: 38,
        forwardedToOwner: 7,
        confidenceThreshold: 70,
        averageConfidence: 82
      },
      multiLanguage: {
        english: { count: 38, percentage: 84 },
        spanish: { count: 7, percentage: 16 },
        autoDetection: true
      },
      spamFilter: {
        totalCalls: 50,
        spamBlocked: 5,
        savings: 25, // $5 per spam call
        detectionRate: 100
      },
      leadQualification: {
        totalLeads: 45,
        qualified: 35,
        qualificationRate: 78,
        criteria: {
          budgetQualified: 32,
          serviceMatch: 35,
          locationValid: 40,
          timelineRealistic: 38
        }
      },
      jobCategories: {
        'HVAC Repair': { count: 18, revenue: 2700 },
        'Installation': { count: 12, revenue: 3600 },
        'Emergency': { count: 8, revenue: 1600 },
        'Maintenance': { count: 7, revenue: 1050 }
      },
      callerRecognition: {
        repeatCallers: 12,
        recognitionRate: 27,
        averageCallerHistory: 2.3
      },
      appointmentRules: {
        minimumNotice: 24, // hours
        defaultJobLength: 120, // minutes
        maxJobsPerDay: 8,
        businessHours: {
          monday: { start: '08:00', end: '17:00' },
          tuesday: { start: '08:00', end: '17:00' },
          wednesday: { start: '08:00', end: '17:00' },
          thursday: { start: '08:00', end: '17:00' },
          friday: { start: '08:00', end: '17:00' },
          saturday: { start: '09:00', end: '15:00' },
          sunday: { start: '10:00', end: '14:00' }
        }
      },
      calendarSync: {
        connected: true,
        provider: 'Google Calendar',
        lastSync: new Date().toISOString(),
        twoWaySync: true
      },
      dailyDigest: {
        enabled: true,
        lastSent: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        recipients: ['owner@business.com'],
        format: 'summary'
      }
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Error fetching advanced analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch advanced analytics' },
      { status: 500 }
    )
  }
}