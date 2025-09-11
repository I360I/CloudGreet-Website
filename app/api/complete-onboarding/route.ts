import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      businessName, 
      businessType, 
      industry, 
      phoneNumber: existingPhoneNumber, 
      calendarProvider, 
      calendarId, 
      businessHours, 
      services, 
      aiPersonality, 
      specialInstructions,
      location,
      email,
      timezone
    } = body

    console.log('🚀 Completing onboarding for:', businessName)

    if (!businessName || !businessType) {
      return NextResponse.json(
        { success: false, error: 'Business name and type are required' },
        { status: 400 }
      )
    }

    // Step 1: Assign phone number (simulate)
    const phoneNumber = generatePhoneNumber(location || 'United States')
    console.log('📞 Phone number assigned:', phoneNumber)

    // Step 2: Connect calendar (simulate)
    const calendarConnectionId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('📅 Calendar connected:', calendarProvider || 'Google Calendar')

    // Step 3: Configure AI (simulate)
    const aiConfigId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const personalizedGreeting = generatePersonalizedGreeting(businessName, businessType)
    console.log('🤖 AI configured:', aiConfigId)

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully! All systems are now connected and ready.',
      data: {
        phoneNumber: phoneNumber,
        aiAgent: {
          name: businessName + ' Receptionist',
          greeting: personalizedGreeting,
          status: 'active',
          capabilities: {
            callHandling: true,
            appointmentScheduling: true,
            leadQualification: true,
            multiLanguage: false,
            emergencyDetection: true,
            callerRecognition: true,
            spamFiltering: true
          },
          configId: aiConfigId
        },
        calendarIntegration: {
          provider: calendarProvider || 'Google Calendar',
          status: 'connected',
          syncEnabled: true,
          connectionId: calendarConnectionId
        },
        businessHours: businessHours || getDefaultBusinessHours(),
        systems: {
          phone: 'connected',
          calendar: 'connected',
          ai: 'connected',
          speech: 'connected'
        },
        readyToReceiveCalls: true,
        setupCompleteAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Onboarding completion error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to complete onboarding',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function getDefaultBusinessHours() {
  return {
    monday: { start: '09:00', end: '17:00', enabled: true },
    tuesday: { start: '09:00', end: '17:00', enabled: true },
    wednesday: { start: '09:00', end: '17:00', enabled: true },
    thursday: { start: '09:00', end: '17:00', enabled: true },
    friday: { start: '09:00', end: '17:00', enabled: true },
    saturday: { start: '10:00', end: '16:00', enabled: false },
    sunday: { start: '10:00', end: '16:00', enabled: false }
  }
}

function generatePhoneNumber(location: string): string {
  const areaCodeMap: { [key: string]: string } = {
    'austin': '512',
    'houston': '713',
    'dallas': '214',
    'san antonio': '210',
    'california': '415',
    'florida': '305',
    'new york': '212',
    'chicago': '312'
  }
  
  const locationLower = location?.toLowerCase() || ''
  let areaCode = '555'
  
  for (const [key, code] of Object.entries(areaCodeMap)) {
    if (locationLower.includes(key)) {
      areaCode = code
      break
    }
  }
  
  const exchange = Math.floor(Math.random() * 900) + 100
  const number = Math.floor(Math.random() * 9000) + 1000
  
  return `(${areaCode}) ${exchange}-${number}`
}

function generatePersonalizedGreeting(businessName: string, businessType: string): string {
  const greetings = {
    'hvac': `Thanks for calling ${businessName}, your trusted HVAC specialists. This is your virtual receptionist. How can I help you with your heating and cooling needs today?`,
    'plumbing': `Thanks for calling ${businessName}, your reliable plumbing experts. This is your virtual receptionist. How can I help you with your plumbing needs today?`,
    'electrical': `Thanks for calling ${businessName}, your professional electrical contractors. This is your virtual receptionist. How can I help you with your electrical needs today?`,
    'painting': `Thanks for calling ${businessName}, your quality painting professionals. This is your virtual receptionist. How can I help you with your painting project today?`,
    'default': `Thanks for calling ${businessName}, this is your virtual receptionist. How can I help you today?`
  }
  
  return greetings[businessType?.toLowerCase()] || greetings.default
}