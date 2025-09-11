import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for call flow data (in production, use a database)
let callFlows = []
let callerHistory = new Map()

// AI Call Flow System
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, callerName, businessName, callType = 'incoming' } = body

    // Check if this is a repeat caller
    const isRepeatCaller = callerHistory.has(phoneNumber)
    const previousCalls = callerHistory.get(phoneNumber) || []

    // Generate AI call flow based on caller type and business
    const callFlow = generateCallFlow({
      phoneNumber,
      callerName,
      businessName,
      isRepeatCaller,
      previousCalls,
      callType
    })

    // Store the call flow
    callFlows.unshift(callFlow)
    callFlows = callFlows.slice(0, 100) // Keep last 100 calls

    // Update caller history
    if (!callerHistory.has(phoneNumber)) {
      callerHistory.set(phoneNumber, [])
    }
    callerHistory.get(phoneNumber).push({
      timestamp: new Date().toISOString(),
      businessName,
      outcome: 'in_progress'
    })

    return NextResponse.json({
      success: true,
      data: callFlow
    })
  } catch (error) {
    console.error('Error generating call flow:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate call flow' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phoneNumber')

    if (phoneNumber) {
      // Get specific caller history
      const history = callerHistory.get(phoneNumber) || []
      return NextResponse.json({
        success: true,
        data: { phoneNumber, history }
      })
    }

    // Get all recent call flows
    return NextResponse.json({
      success: true,
      data: callFlows.slice(0, 20) // Last 20 calls
    })
  } catch (error) {
    console.error('Error fetching call flows:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call flows' },
      { status: 500 }
    )
  }
}

function generateCallFlow({ phoneNumber, callerName, businessName, isRepeatCaller, previousCalls, callType }) {
  const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const timestamp = new Date().toISOString()

  // Determine business type and services
  const businessConfig = getBusinessConfig(businessName)
  
  // Generate personalized greeting
  const greeting = generateGreeting(businessName, callerName, isRepeatCaller, previousCalls)
  
  // Create structured question flow
  const questionFlow = generateQuestionFlow(businessConfig, isRepeatCaller)
  
  // Set up emergency and problem handling
  const emergencyHandling = generateEmergencyHandling(businessName)
  
  // Create confirmation system
  const confirmationSystem = generateConfirmationSystem(businessConfig)

  return {
    callId,
    phoneNumber,
    callerName,
    businessName,
    timestamp,
    isRepeatCaller,
    previousCalls: previousCalls.slice(-3), // Last 3 calls
    status: 'active',
    currentStep: 'greeting',
    greeting,
    questionFlow,
    emergencyHandling,
    confirmationSystem,
    businessConfig,
    aiPersonality: {
      tone: 'professional_friendly',
      pace: 'calm_efficient',
      confidence: 95
    },
    callGoals: [
      'understand_caller_intent',
      'gather_required_information',
      'confirm_booking_details',
      'ensure_successful_outcome'
    ],
    successMetrics: {
      callDuration: 0,
      questionsAsked: 0,
      informationGathered: 0,
      outcome: 'in_progress'
    }
  }
}

function getBusinessConfig(businessName) {
  // Determine business type and services based on name
  const businessTypes = {
    'HVAC': {
      services: ['Repair', 'Installation', 'Maintenance', 'Emergency'],
      serviceArea: 'Austin Metro Area',
      businessHours: {
        monday: { start: '08:00', end: '17:00' },
        tuesday: { start: '08:00', end: '17:00' },
        wednesday: { start: '08:00', end: '17:00' },
        thursday: { start: '08:00', end: '17:00' },
        friday: { start: '08:00', end: '17:00' },
        saturday: { start: '09:00', end: '15:00' },
        sunday: { start: '10:00', end: '14:00' }
      },
      emergencyKeywords: ['emergency', 'urgent', 'broken', 'not working', 'hot', 'cold'],
      averageJobTime: 120, // minutes
      pricing: 'estimate_required'
    },
    'Painters': {
      services: ['Interior Painting', 'Exterior Painting', 'Color Consultation', 'Pressure Washing'],
      serviceArea: 'Austin Metro Area',
      businessHours: {
        monday: { start: '08:00', end: '17:00' },
        tuesday: { start: '08:00', end: '17:00' },
        wednesday: { start: '08:00', end: '17:00' },
        thursday: { start: '08:00', end: '17:00' },
        friday: { start: '08:00', end: '17:00' },
        saturday: { start: '09:00', end: '15:00' },
        sunday: { start: '10:00', end: '14:00' }
      },
      emergencyKeywords: ['urgent', 'rush', 'asap', 'quick'],
      averageJobTime: 240, // minutes
      pricing: 'estimate_required'
    }
  }

  // Default to HVAC if business type not detected
  const businessType = Object.keys(businessTypes).find(type => 
    businessName.toLowerCase().includes(type.toLowerCase())
  ) || 'HVAC'

  return businessTypes[businessType]
}

function generateGreeting(businessName, callerName, isRepeatCaller, previousCalls) {
  if (isRepeatCaller && callerName) {
    const lastCall = previousCalls[previousCalls.length - 1]
    return {
      text: `Hi ${callerName}, welcome back! Thanks for calling ${businessName} again. Are we booking another service at the same address as last time?`,
      tone: 'warm_personal',
      personalization: 'high'
    }
  } else if (isRepeatCaller) {
    return {
      text: `Thanks for calling ${businessName} again! I recognize your number from previous calls. How can I help you today?`,
      tone: 'friendly_recognizing',
      personalization: 'medium'
    }
  } else {
    return {
      text: `Thanks for calling ${businessName}, this is your virtual receptionist. How can I help you today?`,
      tone: 'professional_welcoming',
      personalization: 'standard'
    }
  }
}

function generateQuestionFlow(businessConfig, isRepeatCaller) {
  const baseQuestions = [
    {
      id: 'caller_name',
      question: "May I have your name please?",
      required: true,
      type: 'text',
      followUp: "Thank you, {name}. "
    },
    {
      id: 'phone_confirm',
      question: "Can you confirm your phone number for me?",
      required: true,
      type: 'phone',
      followUp: "Perfect, I have {phone}. "
    },
    {
      id: 'service_address',
      question: "What's the address where you need service?",
      required: true,
      type: 'address',
      followUp: "Got it, {address}. "
    },
    {
      id: 'service_type',
      question: `What type of service do you need? We offer ${businessConfig.services.join(', ')}.`,
      required: true,
      type: 'select',
      options: businessConfig.services,
      followUp: "I understand you need {service}. "
    },
    {
      id: 'preferred_time',
      question: "When would you prefer to have this service? I can offer you some available time slots.",
      required: true,
      type: 'datetime',
      followUp: "Great, {time} works for us. "
    },
    {
      id: 'special_notes',
      question: "Is there anything special I should know about the job? Like gate codes, pets, or specific details about the issue?",
      required: false,
      type: 'text',
      followUp: "I'll make sure the team knows about {notes}. "
    }
  ]

  // Skip name and phone for repeat callers if we have the info
  if (isRepeatCaller) {
    return baseQuestions.slice(2) // Start from address
  }

  return baseQuestions
}

function generateEmergencyHandling(businessName) {
  return {
    emergencyKeywords: ['emergency', 'urgent', 'broken', 'not working', 'hot', 'cold', 'asap', 'rush'],
    upsetCallerKeywords: ['angry', 'frustrated', 'disappointed', 'terrible', 'awful', 'hate'],
    escalationTriggers: [
      'confidence_below_70',
      'emergency_detected',
      'upset_caller_detected',
      'technical_issue',
      'language_barrier'
    ],
    backupMode: {
      trigger: 'system_confusion',
      response: "I want to make sure I get all your details correctly. Let me take your information and have someone call you right back within the next few minutes.",
      actions: ['log_high_priority', 'send_instant_alert', 'schedule_callback']
    },
    emergencyResponse: {
      trigger: 'emergency_detected',
      response: "I understand this is urgent. Let me try to connect you with our emergency team right away.",
      actions: ['immediate_transfer', 'log_emergency', 'send_instant_alert']
    }
  }
}

function generateConfirmationSystem(businessConfig) {
  return {
    confirmationTemplate: "Just to confirm, I have {name} at {address} for {service} on {date} at {time}. Does that all sound correct?",
    verificationSteps: [
      'name_spelling',
      'phone_number',
      'address_accuracy',
      'service_type',
      'appointment_time',
      'special_instructions'
    ],
    bookingRules: {
      minimumNotice: 24, // hours
      maxAdvanceBooking: 30, // days
      businessHours: businessConfig.businessHours,
      serviceArea: businessConfig.serviceArea
    },
    successOutcomes: [
      'job_booked_confirmed',
      'transferred_to_human',
      'callback_scheduled',
      'information_collected'
    ]
  }
}

