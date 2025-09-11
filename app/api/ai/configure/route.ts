import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo purposes - in production this would be a database
let aiConfigurations = new Map()

export async function POST(request: NextRequest) {
  try {
    const { 
      businessName, 
      businessType, 
      services, 
      greeting, 
      businessHours,
      timezone,
      language = 'en'
    } = await request.json()
    
    if (!businessName || !businessType) {
      return NextResponse.json(
        { success: false, error: 'Business name and type are required' },
        { status: 400 }
      )
    }

    // Generate AI configuration
    const configId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create personalized greeting if not provided
    const personalizedGreeting = greeting || generatePersonalizedGreeting(businessName, businessType)
    
    // Create AI configuration
    const aiConfig = {
      configId,
      businessName,
      businessType,
      services: services || getDefaultServices(businessType),
      greeting: personalizedGreeting,
      businessHours: businessHours || getDefaultBusinessHours(),
      timezone: timezone || 'America/New_York',
      language,
      configuredAt: new Date().toISOString(),
      status: 'active',
      capabilities: {
        callHandling: true,
        appointmentScheduling: true,
        leadQualification: true,
        multiLanguage: language !== 'en',
        emergencyDetection: true,
        callerRecognition: true,
        spamFiltering: true
      },
      performance: {
        confidence: 95,
        responseTime: 0.8, // seconds
        accuracy: 92
      }
    }
    
    // Store the configuration
    aiConfigurations.set(businessName, aiConfig)

    return NextResponse.json({
      success: true,
      data: aiConfig,
      message: `AI receptionist configured for ${businessName}`
    })

  } catch (error) {
    console.error('AI configuration error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to configure AI' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const businessName = url.searchParams.get('businessName')
    
    if (!businessName) {
      return NextResponse.json(
        { success: false, error: 'Business name is required' },
        { status: 400 }
      )
    }

    const config = aiConfigurations.get(businessName)
    
    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'not_configured',
          message: 'AI not configured yet'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: config
    })

  } catch (error) {
    console.error('AI lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to lookup AI configuration' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { businessName, updates } = await request.json()
    
    if (!businessName) {
      return NextResponse.json(
        { success: false, error: 'Business name is required' },
        { status: 400 }
      )
    }

    const config = aiConfigurations.get(businessName)
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'AI configuration not found' },
        { status: 404 }
      )
    }

    // Update configuration
    const updatedConfig = {
      ...config,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    aiConfigurations.set(businessName, updatedConfig)

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: 'AI configuration updated successfully'
    })

  } catch (error) {
    console.error('AI update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update AI configuration' },
      { status: 500 }
    )
  }
}

function generatePersonalizedGreeting(businessName: string, businessType: string): string {
  const greetings = {
    'hvac': `Thanks for calling ${businessName}, your trusted HVAC specialists. This is your virtual receptionist. How can I help you with your heating and cooling needs today?`,
    'plumbing': `Thanks for calling ${businessName}, your reliable plumbing experts. This is your virtual receptionist. How can I help you with your plumbing needs today?`,
    'electrical': `Thanks for calling ${businessName}, your professional electrical contractors. This is your virtual receptionist. How can I help you with your electrical needs today?`,
    'painting': `Thanks for calling ${businessName}, your quality painting professionals. This is your virtual receptionist. How can I help you with your painting project today?`,
    'landscaping': `Thanks for calling ${businessName}, your premier landscaping company. This is your virtual receptionist. How can I help you with your outdoor space today?`,
    'cleaning': `Thanks for calling ${businessName}, your trusted cleaning service. This is your virtual receptionist. How can I help you with your cleaning needs today?`,
    'legal': `Thanks for calling ${businessName}, your experienced legal team. This is your virtual receptionist. How can I help you with your legal needs today?`,
    'medical': `Thanks for calling ${businessName}, your healthcare provider. This is your virtual receptionist. How can I help you with your healthcare needs today?`,
    'dental': `Thanks for calling ${businessName}, your family dental practice. This is your virtual receptionist. How can I help you with your dental needs today?`,
    'automotive': `Thanks for calling ${businessName}, your trusted auto service center. This is your virtual receptionist. How can I help you with your vehicle today?`,
    'restaurant': `Thanks for calling ${businessName}, your favorite dining destination. This is your virtual receptionist. How can I help you today?`,
    'retail': `Thanks for calling ${businessName}, your trusted retail partner. This is your virtual receptionist. How can I help you today?`,
    'default': `Thanks for calling ${businessName}, this is your virtual receptionist. How can I help you today?`
  }
  
  const businessTypeLower = businessType?.toLowerCase() || ''
  
  // Try to find exact match
  if (greetings[businessTypeLower]) {
    return greetings[businessTypeLower]
  }
  
  // Try to find partial match
  for (const [key, greeting] of Object.entries(greetings)) {
    if (key !== 'default' && (businessTypeLower.includes(key) || key.includes(businessTypeLower))) {
      return greeting
    }
  }
  
  // Return default greeting
  return greetings.default
}

function getDefaultServices(businessType: string): string[] {
  const serviceMap: { [key: string]: string[] } = {
    'hvac': ['AC Repair', 'Heating Repair', 'Installation', 'Maintenance', 'Emergency Service'],
    'plumbing': ['Leak Repair', 'Drain Cleaning', 'Pipe Installation', 'Water Heater', 'Emergency Service'],
    'electrical': ['Wiring', 'Outlet Installation', 'Panel Upgrade', 'Lighting', 'Emergency Service'],
    'painting': ['Interior Painting', 'Exterior Painting', 'Cabinet Refinishing', 'Color Consultation'],
    'landscaping': ['Lawn Care', 'Tree Service', 'Garden Design', 'Irrigation', 'Maintenance'],
    'cleaning': ['House Cleaning', 'Office Cleaning', 'Deep Cleaning', 'Move-in/out Cleaning'],
    'legal': ['Consultation', 'Document Review', 'Court Representation', 'Legal Advice'],
    'medical': ['Consultation', 'Check-up', 'Treatment', 'Prescription', 'Emergency Care'],
    'dental': ['Cleaning', 'Filling', 'Crown', 'Root Canal', 'Emergency Care'],
    'automotive': ['Oil Change', 'Brake Service', 'Engine Repair', 'Transmission', 'Emergency Service'],
    'restaurant': ['Dine-in', 'Takeout', 'Delivery', 'Catering', 'Private Events'],
    'retail': ['Product Sales', 'Customer Service', 'Returns', 'Special Orders']
  }
  
  const businessTypeLower = businessType?.toLowerCase() || ''
  
  // Try to find exact match
  if (serviceMap[businessTypeLower]) {
    return serviceMap[businessTypeLower]
  }
  
  // Try to find partial match
  for (const [key, services] of Object.entries(serviceMap)) {
    if (businessTypeLower.includes(key) || key.includes(businessTypeLower)) {
      return services
    }
  }
  
  // Return default services
  return ['General Service', 'Consultation', 'Emergency Service']
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

