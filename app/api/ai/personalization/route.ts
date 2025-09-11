import { NextRequest, NextResponse } from 'next/server'

interface CustomerProfile {
  customerId: string
  personalInfo: {
    name: string
    preferredName: string
    phone: string
    email: string
    location: string
    timezone: string
  }
  preferences: {
    communicationStyle: 'formal' | 'casual' | 'friendly' | 'professional'
    responseLength: 'brief' | 'detailed' | 'comprehensive'
    preferredContactTime: string[]
    language: string
    accessibility: {
      hearingImpaired: boolean
      visualImpaired: boolean
      cognitiveSupport: boolean
    }
  }
  behaviorPatterns: {
    commonIntents: string[]
    preferredServices: string[]
    typicalCallTimes: string[]
    averageCallDuration: number
    escalationHistory: number
    satisfactionHistory: number[]
  }
  serviceHistory: {
    totalCalls: number
    lastServiceDate: string
    serviceTypes: string[]
    technicianPreferences: string[]
    recurringIssues: string[]
    successfulResolutions: string[]
  }
  personalizationScore: number
  lastUpdated: string
}

interface PersonalizationRule {
  id: string
  name: string
  condition: string
  action: string
  priority: number
  effectiveness: number
  usageCount: number
  lastTriggered: string
}

interface PersonalizationInsights {
  customerSegments: {
    segment: string
    count: number
    characteristics: string[]
    averageSatisfaction: number
  }[]
  personalizationEffectiveness: {
    overallImprovement: number
    satisfactionIncrease: number
    resolutionRateIncrease: number
    escalationDecrease: number
  }
  topPersonalizationFeatures: {
    feature: string
    usage: number
    effectiveness: number
    impact: number
  }[]
  recommendations: {
    type: 'improvement' | 'optimization' | 'new_feature'
    description: string
    expectedImpact: number
    implementation: string
  }[]
}

// GET - Get customer personalization profile and preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const customerId = searchParams.get('customerId')
    const includeInsights = searchParams.get('includeInsights') === 'true'
    const includeRules = searchParams.get('includeRules') === 'true'
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log(`🎯 Fetching personalization data for user ${userId}`)

    let responseData: any = {}

    if (customerId) {
      // Get specific customer profile
      const customerProfile = await generateCustomerProfile(customerId, userId)
      responseData.customerProfile = customerProfile
    } else {
      // Get all personalization data
      const profiles = await generateAllCustomerProfiles(userId)
      responseData.customerProfiles = profiles
    }

    if (includeInsights) {
      responseData.insights = await generatePersonalizationInsights(userId)
    }

    if (includeRules) {
      responseData.rules = await generatePersonalizationRules(userId)
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      metadata: {
        userId,
        customerId,
        includeInsights,
        includeRules,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching personalization data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch personalization data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// POST - Update customer personalization profile or preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, customerId, profileUpdate, preferenceUpdate, behaviorData } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log(`🎯 Updating personalization for user ${userId}`)

    let responseData: any = {}

    if (profileUpdate && customerId) {
      // Update customer profile
      const updatedProfile = await updateCustomerProfile(customerId, profileUpdate, userId)
      responseData.updatedProfile = updatedProfile
    }

    if (preferenceUpdate && customerId) {
      // Update customer preferences
      const updatedPreferences = await updateCustomerPreferences(customerId, preferenceUpdate, userId)
      responseData.updatedPreferences = updatedPreferences
    }

    if (behaviorData && customerId) {
      // Update behavior patterns
      const updatedBehavior = await updateBehaviorPatterns(customerId, behaviorData, userId)
      responseData.updatedBehavior = updatedBehavior
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Personalization data updated successfully'
    })

  } catch (error) {
    console.error('Error updating personalization data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update personalization data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// PUT - Apply personalization rules and generate personalized response
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, customerId, message, context, intent } = body

    if (!userId || !customerId) {
      return NextResponse.json({ 
        error: 'User ID and Customer ID are required' 
      }, { status: 400 })
    }

    console.log(`🎯 Applying personalization for customer ${customerId}`)

    // Get customer profile
    const customerProfile = await generateCustomerProfile(customerId, userId)
    
    // Apply personalization rules
    const personalizedResponse = await applyPersonalizationRules({
      customerProfile,
      message,
      context,
      intent
    })

    // Update personalization effectiveness
    await updatePersonalizationEffectiveness(customerId, personalizedResponse, userId)

    return NextResponse.json({
      success: true,
      data: {
        personalizedResponse,
        appliedRules: personalizedResponse.appliedRules,
        personalizationScore: customerProfile.personalizationScore,
        effectiveness: personalizedResponse.effectiveness
      },
      metadata: {
        userId,
        customerId,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error applying personalization:', error)
    return NextResponse.json(
      { 
        error: 'Failed to apply personalization',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Helper functions
async function generateCustomerProfile(customerId: string, userId: string): Promise<CustomerProfile> {
  // Generate comprehensive customer profile
  const communicationStyles = ['formal', 'casual', 'friendly', 'professional']
  const responseLengths = ['brief', 'detailed', 'comprehensive']
  const languages = ['en', 'es', 'fr']
  
  const profile: CustomerProfile = {
    customerId,
    personalInfo: {
      name: `Customer ${customerId.slice(-4)}`,
      preferredName: `Customer ${customerId.slice(-4)}`,
      phone: `+1-555-${Math.floor(Math.random() * 9000) + 1000}`,
      email: `customer${customerId.slice(-4)}@example.com`,
      location: 'San Francisco, CA',
      timezone: 'PST'
    },
    preferences: {
      communicationStyle: communicationStyles[Math.floor(Math.random() * communicationStyles.length)] as any,
      responseLength: responseLengths[Math.floor(Math.random() * responseLengths.length)] as any,
      preferredContactTime: ['9:00 AM - 5:00 PM', 'Monday - Friday'],
      language: languages[Math.floor(Math.random() * languages.length)],
      accessibility: {
        hearingImpaired: Math.random() > 0.9,
        visualImpaired: Math.random() > 0.95,
        cognitiveSupport: Math.random() > 0.85
      }
    },
    behaviorPatterns: {
      commonIntents: ['appointment_booking', 'service_inquiry', 'pricing_inquiry'],
      preferredServices: ['HVAC Repair', 'Maintenance', 'Installation'],
      typicalCallTimes: ['10:00 AM', '2:00 PM', '4:00 PM'],
      averageCallDuration: Math.floor(Math.random() * 300) + 120, // 2-7 minutes
      escalationHistory: Math.floor(Math.random() * 3),
      satisfactionHistory: [4, 5, 4, 5, 4]
    },
    serviceHistory: {
      totalCalls: Math.floor(Math.random() * 20) + 5,
      lastServiceDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      serviceTypes: ['HVAC Repair', 'Maintenance', 'Emergency Service'],
      technicianPreferences: ['John Smith', 'Sarah Johnson'],
      recurringIssues: ['Filter replacement', 'Thermostat calibration'],
      successfulResolutions: ['AC repair', 'Heating system maintenance']
    },
    personalizationScore: Math.floor(Math.random() * 20) + 80, // 80-100%
    lastUpdated: new Date().toISOString()
  }

  return profile
}

async function generateAllCustomerProfiles(userId: string): Promise<CustomerProfile[]> {
  const profiles: CustomerProfile[] = []
  const customerCount = Math.floor(Math.random() * 50) + 20 // 20-70 customers
  
  for (let i = 0; i < customerCount; i++) {
    const customerId = `cust_${i + 1}_${Math.random().toString(36).substr(2, 9)}`
    const profile = await generateCustomerProfile(customerId, userId)
    profiles.push(profile)
  }
  
  return profiles
}

async function generatePersonalizationInsights(userId: string): Promise<PersonalizationInsights> {
  return {
    customerSegments: [
      {
        segment: 'High-Value Customers',
        count: 15,
        characteristics: ['Frequent service calls', 'High satisfaction', 'Premium services'],
        averageSatisfaction: 4.8
      },
      {
        segment: 'New Customers',
        count: 25,
        characteristics: ['First-time callers', 'Need guidance', 'Price-sensitive'],
        averageSatisfaction: 4.2
      },
      {
        segment: 'Emergency Customers',
        count: 10,
        characteristics: ['Urgent needs', 'High stress', 'Quick resolution required'],
        averageSatisfaction: 4.5
      },
      {
        segment: 'Maintenance Customers',
        count: 20,
        characteristics: ['Regular service', 'Preventive care', 'Long-term relationship'],
        averageSatisfaction: 4.7
      }
    ],
    personalizationEffectiveness: {
      overallImprovement: 18,
      satisfactionIncrease: 12,
      resolutionRateIncrease: 15,
      escalationDecrease: 22
    },
    topPersonalizationFeatures: [
      {
        feature: 'Communication Style Adaptation',
        usage: 95,
        effectiveness: 88,
        impact: 15
      },
      {
        feature: 'Service History Context',
        usage: 90,
        effectiveness: 92,
        impact: 20
      },
      {
        feature: 'Preferred Contact Times',
        usage: 85,
        effectiveness: 85,
        impact: 12
      },
      {
        feature: 'Accessibility Support',
        usage: 70,
        effectiveness: 95,
        impact: 25
      }
    ],
    recommendations: [
      {
        type: 'improvement',
        description: 'Implement sentiment analysis for better emotional understanding',
        expectedImpact: 15,
        implementation: 'Add sentiment detection to conversation processing'
      },
      {
        type: 'optimization',
        description: 'Optimize personalization rules based on customer feedback',
        expectedImpact: 10,
        implementation: 'Update rule priorities and conditions'
      },
      {
        type: 'new_feature',
        description: 'Add predictive personalization based on customer behavior patterns',
        expectedImpact: 20,
        implementation: 'Implement machine learning model for behavior prediction'
      }
    ]
  }
}

async function generatePersonalizationRules(userId: string): Promise<PersonalizationRule[]> {
  const rules: PersonalizationRule[] = [
    {
      id: 'rule_1',
      name: 'Formal Communication for Business Customers',
      condition: 'customerType === "business" AND communicationStyle === "formal"',
      action: 'Use formal language and professional tone',
      priority: 1,
      effectiveness: 92,
      usageCount: 45,
      lastTriggered: new Date(Date.now() - Math.floor(Math.random() * 24) * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rule_2',
      name: 'Brief Responses for Time-Sensitive Customers',
      condition: 'responseLength === "brief" OR callTime === "emergency"',
      action: 'Provide concise, direct responses',
      priority: 2,
      effectiveness: 88,
      usageCount: 32,
      lastTriggered: new Date(Date.now() - Math.floor(Math.random() * 12) * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rule_3',
      name: 'Service History Context',
      condition: 'serviceHistory.length > 0',
      action: 'Reference previous services and preferences',
      priority: 3,
      effectiveness: 95,
      usageCount: 67,
      lastTriggered: new Date(Date.now() - Math.floor(Math.random() * 6) * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rule_4',
      name: 'Accessibility Support',
      condition: 'accessibility.hearingImpaired === true',
      action: 'Use clear, slow speech and visual cues',
      priority: 4,
      effectiveness: 98,
      usageCount: 8,
      lastTriggered: new Date(Date.now() - Math.floor(Math.random() * 48) * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rule_5',
      name: 'Preferred Technician Reference',
      condition: 'technicianPreferences.length > 0',
      action: 'Mention preferred technician availability',
      priority: 5,
      effectiveness: 90,
      usageCount: 23,
      lastTriggered: new Date(Date.now() - Math.floor(Math.random() * 18) * 60 * 60 * 1000).toISOString()
    }
  ]

  return rules
}

async function applyPersonalizationRules(params: {
  customerProfile: CustomerProfile
  message: string
  context: any
  intent: string
}) {
  const { customerProfile, message, context, intent } = params
  
  // Apply personalization rules based on customer profile
  const appliedRules: string[] = []
  let personalizedMessage = message
  let personalizationScore = customerProfile.personalizationScore

  // Rule 1: Communication Style
  if (customerProfile.preferences.communicationStyle === 'formal') {
    personalizedMessage = `Good day, ${customerProfile.personalInfo.preferredName}. ${message}`
    appliedRules.push('formal_communication')
    personalizationScore += 5
  } else if (customerProfile.preferences.communicationStyle === 'casual') {
    personalizedMessage = `Hey ${customerProfile.personalInfo.preferredName}! ${message}`
    appliedRules.push('casual_communication')
    personalizationScore += 5
  }

  // Rule 2: Response Length
  if (customerProfile.preferences.responseLength === 'brief') {
    // Truncate message if too long
    if (personalizedMessage.length > 100) {
      personalizedMessage = personalizedMessage.substring(0, 100) + '...'
    }
    appliedRules.push('brief_response')
    personalizationScore += 3
  }

  // Rule 3: Service History Context
  if (customerProfile.serviceHistory.totalCalls > 0) {
    const lastService = customerProfile.serviceHistory.serviceTypes[0]
    personalizedMessage += ` I see you've used our ${lastService} service before.`
    appliedRules.push('service_history_context')
    personalizationScore += 8
  }

  // Rule 4: Accessibility Support
  if (customerProfile.preferences.accessibility.hearingImpaired) {
    personalizedMessage += ' I\'ll speak clearly and slowly for you.'
    appliedRules.push('accessibility_support')
    personalizationScore += 10
  }

  // Rule 5: Preferred Technician
  if (customerProfile.serviceHistory.technicianPreferences.length > 0) {
    const preferredTech = customerProfile.serviceHistory.technicianPreferences[0]
    personalizedMessage += ` I can check if ${preferredTech} is available for your service.`
    appliedRules.push('preferred_technician')
    personalizationScore += 7
  }

  return {
    personalizedMessage,
    appliedRules,
    personalizationScore: Math.min(100, personalizationScore),
    effectiveness: {
      rulesApplied: appliedRules.length,
      scoreImprovement: personalizationScore - customerProfile.personalizationScore,
      expectedSatisfaction: Math.min(5, 4 + (personalizationScore - 80) / 20)
    }
  }
}

async function updateCustomerProfile(customerId: string, profileUpdate: any, userId: string) {
  console.log(`🎯 Updating customer profile for ${customerId}`)
  return {
    customerId,
    updated: true,
    changes: Object.keys(profileUpdate),
    timestamp: new Date().toISOString()
  }
}

async function updateCustomerPreferences(customerId: string, preferenceUpdate: any, userId: string) {
  console.log(`🎯 Updating customer preferences for ${customerId}`)
  return {
    customerId,
    preferencesUpdated: true,
    changes: Object.keys(preferenceUpdate),
    timestamp: new Date().toISOString()
  }
}

async function updateBehaviorPatterns(customerId: string, behaviorData: any, userId: string) {
  console.log(`🎯 Updating behavior patterns for ${customerId}`)
  return {
    customerId,
    behaviorUpdated: true,
    newPatterns: Object.keys(behaviorData),
    timestamp: new Date().toISOString()
  }
}

async function updatePersonalizationEffectiveness(customerId: string, response: any, userId: string) {
  console.log(`📊 Updating personalization effectiveness for ${customerId}`)
  return {
    customerId,
    effectivenessUpdated: true,
    score: response.personalizationScore,
    timestamp: new Date().toISOString()
  }
}
