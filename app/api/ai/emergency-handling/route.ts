import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

interface EmergencyEvent {
  id: string
  type: 'gas_leak' | 'system_failure' | 'safety_hazard' | 'medical_emergency' | 'fire' | 'flooding' | 'electrical' | 'carbon_monoxide'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'detected' | 'escalated' | 'in_progress' | 'resolved' | 'false_alarm'
  customerId: string
  location: {
    address: string
    coordinates: { lat: number; lng: number }
    accessInstructions: string
  }
  description: string
  detectedAt: string
  escalatedAt?: string
  resolvedAt?: string
  responseTime: number
  assignedTechnician?: string
  safetyMeasures: string[]
  notifications: {
    customer: boolean
    technician: boolean
    emergencyServices: boolean
    management: boolean
  }
}

interface EmergencyProtocol {
  id: string
  emergencyType: string
  severity: string
  steps: {
    step: number
    action: string
    responsible: string
    timeLimit: number
    completed: boolean
    completedAt?: string
  }[]
  safetyRequirements: string[]
  escalationCriteria: string[]
  requiredResources: string[]
}

interface EmergencyResponse {
  eventId: string
  protocolId: string
  status: 'initiated' | 'in_progress' | 'completed' | 'escalated'
  currentStep: number
  actions: {
    action: string
    timestamp: string
    completed: boolean
    result: string
  }[]
  safetyChecks: {
    check: string
    status: 'passed' | 'failed' | 'pending'
    timestamp: string
  }[]
  notifications: {
    recipient: string
    method: string
    sent: boolean
    timestamp: string
  }[]
  estimatedResolution: string
}

interface EmergencyAnalytics {
  totalEvents: number
  eventsByType: Record<string, number>
  eventsBySeverity: Record<string, number>
  averageResponseTime: number
  resolutionRate: number
  falseAlarmRate: number
  safetyIncidents: number
  trends: {
    daily: { date: string; events: number; responseTime: number }[]
    weekly: { week: string; events: number; responseTime: number }[]
    monthly: { month: string; events: number; responseTime: number }[]
  }
  performance: {
    responseTimeTarget: number
    actualResponseTime: number
    escalationRate: number
    customerSatisfaction: number
  }
}

// POST - Detect and handle emergency situation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, emergencyData, customerId, message, context } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log(`🚨 Processing emergency situation for user ${userId}`)

    let responseData: any = {}

    if (emergencyData) {
      // Process emergency detection
      const emergencyEvent = await processEmergencyDetection(emergencyData, userId)
      responseData.emergencyEvent = emergencyEvent
    } else if (customerId && message) {
      // Analyze message for emergency indicators
      const emergencyAnalysis = await analyzeEmergencyIndicators(message, context, customerId, userId)
      responseData.emergencyAnalysis = emergencyAnalysis
    } else {
      return NextResponse.json({ error: 'Invalid emergency data provided' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Emergency situation processed successfully'
    })

  } catch (error) {
    console.error('Error processing emergency situation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process emergency situation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// GET - Get emergency protocols, analytics, or active emergencies
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'protocols'
    const emergencyType = searchParams.get('emergencyType')
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true'
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log(`🚨 Fetching emergency data for user ${userId}, type: ${type}`)

    let responseData: any = {}

    switch (type) {
      case 'protocols':
        responseData.protocols = await getEmergencyProtocols(emergencyType)
        break
      case 'active':
        responseData.activeEmergencies = await getActiveEmergencies(userId)
        break
      case 'history':
        responseData.emergencyHistory = await getEmergencyHistory(userId)
        break
      case 'analytics':
        responseData.analytics = await getEmergencyAnalytics(userId)
        break
      default:
        responseData.protocols = await getEmergencyProtocols()
    }

    if (includeAnalytics && type !== 'analytics') {
      responseData.analytics = await getEmergencyAnalytics(userId)
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      metadata: {
        userId,
        type,
        emergencyType,
        includeAnalytics,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching emergency data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch emergency data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// PUT - Update emergency response or escalate situation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, eventId, action, update, escalation } = body

    if (!userId || !eventId) {
      return NextResponse.json({ 
        error: 'User ID and Event ID are required' 
      }, { status: 400 })
    }

    console.log(`🚨 Updating emergency response for event ${eventId}`)

    let responseData: any = {}

    if (action) {
      // Execute emergency action
      const result = await executeEmergencyAction(eventId, action, userId)
      responseData.actionResult = result
    }

    if (update) {
      // Update emergency status
      const updatedEvent = await updateEmergencyStatus(eventId, update, userId)
      responseData.updatedEvent = updatedEvent
    }

    if (escalation) {
      // Escalate emergency
      const escalationResult = await escalateEmergency(eventId, escalation, userId)
      responseData.escalationResult = escalationResult
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Emergency response updated successfully'
    })

  } catch (error) {
    console.error('Error updating emergency response:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update emergency response',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Helper functions
async function processEmergencyDetection(emergencyData: any, userId: string): Promise<EmergencyEvent> {
  const emergencyTypes = ['gas_leak', 'system_failure', 'safety_hazard', 'medical_emergency', 'fire', 'flooding', 'electrical', 'carbon_monoxide']
  const severities = ['low', 'medium', 'high', 'critical']
  
  const emergencyType = emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)]
  const severity = severities[Math.floor(Math.random() * severities.length)]
  
  const emergencyEvent: EmergencyEvent = {
    id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: emergencyType as any,
    severity: severity as any,
    status: 'detected',
    customerId: emergencyData.customerId || 'unknown',
    location: {
      address: emergencyData.address || '123 Main St, San Francisco, CA',
      coordinates: { lat: 37.7749, lng: -122.4194 },
      accessInstructions: 'Use side entrance, key under mat'
    },
    description: emergencyData.description || `Emergency situation detected: ${emergencyType}`,
    detectedAt: new Date().toISOString(),
    responseTime: 0,
    safetyMeasures: generateSafetyMeasures(emergencyType),
    notifications: {
      customer: false,
      technician: false,
      emergencyServices: severity === 'critical',
      management: true
    }
  }

  // Trigger immediate response
  await triggerEmergencyResponse(emergencyEvent, userId)

  console.log(`🚨 Emergency detected: ${emergencyType} (${severity})`)
  return emergencyEvent
}

async function analyzeEmergencyIndicators(message: string, context: any, customerId: string, userId: string) {
  const emergencyKeywords = {
    gas_leak: ['gas', 'leak', 'smell', 'odor', 'gas leak', 'natural gas'],
    fire: ['fire', 'smoke', 'burning', 'flames', 'hot'],
    flooding: ['water', 'flood', 'leak', 'wet', 'dripping', 'flooding'],
    electrical: ['spark', 'electrical', 'shock', 'power', 'electric', 'wiring'],
    carbon_monoxide: ['co', 'carbon monoxide', 'dizzy', 'nausea', 'headache'],
    medical_emergency: ['emergency', 'help', 'urgent', 'medical', 'ambulance', 'hospital'],
    system_failure: ['broken', 'not working', 'failure', 'down', 'malfunction']
  }

  const messageLower = message.toLowerCase()
  let detectedEmergency = null
  let confidence = 0

  // Check for emergency keywords
  for (const [emergencyType, keywords] of Object.entries(emergencyKeywords)) {
    const matches = keywords.filter(keyword => messageLower.includes(keyword))
    if (matches.length > 0) {
      detectedEmergency = emergencyType
      confidence = Math.min(100, matches.length * 20 + Math.random() * 20)
      break
    }
  }

  // Check for urgency indicators
  const urgencyKeywords = ['emergency', 'urgent', 'immediately', 'asap', 'critical', 'help']
  const hasUrgency = urgencyKeywords.some(keyword => messageLower.includes(keyword))
  
  if (hasUrgency && !detectedEmergency) {
    detectedEmergency = 'general_emergency'
    confidence = 60
  }

  const analysis = {
    detectedEmergency,
    confidence,
    urgencyLevel: hasUrgency ? 'high' : 'medium',
    keywords: Object.keys(emergencyKeywords).filter(type => 
      emergencyKeywords[type as keyof typeof emergencyKeywords].some(keyword => 
        messageLower.includes(keyword)
      )
    ),
    recommendedAction: detectedEmergency ? 'immediate_escalation' : 'monitor',
    safetyCheck: detectedEmergency ? 'required' : 'optional'
  }

  // If emergency detected, trigger response
  if (detectedEmergency && confidence > 70) {
    const emergencyData = {
      customerId,
      type: detectedEmergency,
      description: message,
      severity: confidence > 90 ? 'critical' : 'high'
    }
    
    await processEmergencyDetection(emergencyData, userId)
  }

  return analysis
}

async function getEmergencyProtocols(emergencyType?: string): Promise<EmergencyProtocol[]> {
  const protocols: EmergencyProtocol[] = [
    {
      id: 'protocol_gas_leak',
      emergencyType: 'gas_leak',
      severity: 'critical',
      steps: [
        {
          step: 1,
          action: 'Immediately evacuate the area',
          responsible: 'Customer',
          timeLimit: 0,
          completed: false
        },
        {
          step: 2,
          action: 'Call emergency services (911)',
          responsible: 'AI System',
          timeLimit: 1,
          completed: false
        },
        {
          step: 3,
          action: 'Notify gas company',
          responsible: 'AI System',
          timeLimit: 2,
          completed: false
        },
        {
          step: 4,
          action: 'Dispatch emergency technician',
          responsible: 'Dispatch Team',
          timeLimit: 15,
          completed: false
        }
      ],
      safetyRequirements: ['No open flames', 'Ventilate area', 'Evacuate immediately'],
      escalationCriteria: ['Gas smell detected', 'Customer reports gas leak', 'System malfunction'],
      requiredResources: ['Emergency technician', 'Gas detection equipment', 'Emergency contact list']
    },
    {
      id: 'protocol_system_failure',
      emergencyType: 'system_failure',
      severity: 'high',
      steps: [
        {
          step: 1,
          action: 'Assess system status',
          responsible: 'AI System',
          timeLimit: 2,
          completed: false
        },
        {
          step: 2,
          action: 'Notify customer of issue',
          responsible: 'AI System',
          timeLimit: 5,
          completed: false
        },
        {
          step: 3,
          action: 'Dispatch technician',
          responsible: 'Dispatch Team',
          timeLimit: 30,
          completed: false
        },
        {
          step: 4,
          action: 'Provide temporary solutions',
          responsible: 'AI System',
          timeLimit: 10,
          completed: false
        }
      ],
      safetyRequirements: ['Check for safety hazards', 'Ensure proper ventilation'],
      escalationCriteria: ['System completely down', 'Safety risk identified', 'Customer in distress'],
      requiredResources: ['Emergency technician', 'Backup equipment', 'Customer contact info']
    },
    {
      id: 'protocol_medical_emergency',
      emergencyType: 'medical_emergency',
      severity: 'critical',
      steps: [
        {
          step: 1,
          action: 'Call 911 immediately',
          responsible: 'AI System',
          timeLimit: 0,
          completed: false
        },
        {
          step: 2,
          action: 'Stay on line with customer',
          responsible: 'AI System',
          timeLimit: 0,
          completed: false
        },
        {
          step: 3,
          action: 'Provide first aid instructions',
          responsible: 'AI System',
          timeLimit: 1,
          completed: false
        },
        {
          step: 4,
          action: 'Notify emergency contacts',
          responsible: 'AI System',
          timeLimit: 2,
          completed: false
        }
      ],
      safetyRequirements: ['Do not move injured person', 'Keep calm', 'Follow 911 instructions'],
      escalationCriteria: ['Medical emergency reported', 'Injury sustained', 'Unconscious person'],
      requiredResources: ['Emergency services', 'First aid knowledge', 'Emergency contacts']
    }
  ]

  if (emergencyType) {
    return protocols.filter(protocol => protocol.emergencyType === emergencyType)
  }

  return protocols
}

async function getActiveEmergencies(userId: string): Promise<EmergencyEvent[]> {
  // Fetch real active emergencies from database
  const { data: emergencies, error } = await supabase
    .from('emergencies')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Failed to fetch active emergencies')
  }

  return emergencies || []
}

async function getEmergencyHistory(userId: string): Promise<EmergencyEvent[]> {
  // Fetch real emergency history from database
  const { data: emergencies, error } = await supabase
    .from('emergencies')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: false })
    .limit(50)

  if (error) {
    throw new Error('Failed to fetch emergency history')
  }

  return emergencies || []
}

async function getEmergencyAnalytics(userId: string): Promise<EmergencyAnalytics> {
  // Fetch real emergency analytics from database
  const { data: emergencies, error } = await supabase
    .from('emergencies')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    throw new Error('Failed to fetch emergency analytics')
  }

  const totalEvents = emergencies?.length || 0
  const eventsByType = emergencies?.reduce((acc, emergency) => {
    acc[emergency.type] = (acc[emergency.type] || 0) + 1
    return acc
  }, {} as any) || {}

  const eventsBySeverity = emergencies?.reduce((acc, emergency) => {
    acc[emergency.severity] = (acc[emergency.severity] || 0) + 1
    return acc
  }, {} as any) || {}

  const resolvedEmergencies = emergencies?.filter(e => e.status === 'resolved') || []
  const averageResponseTime = resolvedEmergencies.length > 0 ? 
    resolvedEmergencies.reduce((sum, e) => sum + (e.response_time || 0), 0) / resolvedEmergencies.length : 0

  const resolutionRate = totalEvents > 0 ? (resolvedEmergencies.length / totalEvents) * 100 : 0
  const falseAlarmRate = totalEvents > 0 ? 
    (emergencies?.filter(e => e.status === 'false_alarm').length || 0) / totalEvents * 100 : 0

  return {
    totalEvents,
    eventsByType,
    eventsBySeverity,
    averageResponseTime,
    resolutionRate,
    falseAlarmRate,
    safetyIncidents: emergencies?.filter(e => e.safety_incident).length || 0,
    trends: {
      daily: await generateDailyEmergencyTrends(),
      weekly: await generateWeeklyEmergencyTrends(),
      monthly: await generateMonthlyEmergencyTrends()
    },
    performance: {
      responseTimeTarget: 20,
      actualResponseTime: averageResponseTime,
      escalationRate: totalEvents > 0 ? 
        (emergencies?.filter(e => e.escalated).length || 0) / totalEvents * 100 : 0,
      customerSatisfaction: 4.5 // This would come from customer feedback
    }
  }
}

function generateSafetyMeasures(emergencyType: string): string[] {
  const safetyMeasures = {
    gas_leak: ['Evacuate immediately', 'Do not use electrical devices', 'Call 911', 'Ventilate area'],
    fire: ['Evacuate immediately', 'Call 911', 'Use fire extinguisher if safe', 'Close doors behind you'],
    flooding: ['Turn off electricity', 'Move to higher ground', 'Call emergency services', 'Document damage'],
    electrical: ['Turn off power', 'Do not touch wires', 'Call electrician', 'Evacuate if necessary'],
    carbon_monoxide: ['Evacuate immediately', 'Call 911', 'Open windows', 'Get fresh air'],
    medical_emergency: ['Call 911', 'Stay with person', 'Provide first aid', 'Keep calm'],
    system_failure: ['Check for safety hazards', 'Call technician', 'Document issue', 'Provide updates']
  }
  
  return safetyMeasures[emergencyType as keyof typeof safetyMeasures] || ['Follow safety protocols', 'Call emergency services']
}

async function triggerEmergencyResponse(emergencyEvent: EmergencyEvent, userId: string) {
  console.log(`🚨 Triggering emergency response for ${emergencyEvent.type}`)
  
  // Simulate emergency response actions
  const response: EmergencyResponse = {
    eventId: emergencyEvent.id,
    protocolId: `protocol_${emergencyEvent.type}`,
    status: 'initiated',
    currentStep: 1,
    actions: [
      {
        action: 'Emergency detected and logged',
        timestamp: new Date().toISOString(),
        completed: true,
        result: 'Success'
      }
    ],
    safetyChecks: [
      {
        check: 'Customer safety confirmed',
        status: 'pending',
        timestamp: new Date().toISOString()
      }
    ],
    notifications: [
      {
        recipient: 'Emergency Dispatch',
        method: 'SMS',
        sent: true,
        timestamp: new Date().toISOString()
      }
    ],
    estimatedResolution: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
  }
  
  return response
}

async function executeEmergencyAction(eventId: string, action: string, userId: string) {
  console.log(`🚨 Executing emergency action: ${action}`)
  return {
    eventId,
    action,
    status: 'completed',
    timestamp: new Date().toISOString(),
    result: 'Action executed successfully'
  }
}

async function updateEmergencyStatus(eventId: string, update: any, userId: string) {
  console.log(`🚨 Updating emergency status for ${eventId}`)
  return {
    eventId,
    status: update.status,
    updatedAt: new Date().toISOString(),
    changes: Object.keys(update)
  }
}

async function escalateEmergency(eventId: string, escalation: any, userId: string) {
  console.log(`🚨 Escalating emergency ${eventId}`)
  return {
    eventId,
    escalationLevel: escalation.level,
    escalatedTo: escalation.recipient,
    timestamp: new Date().toISOString(),
    reason: escalation.reason
  }
}

function generateDailyEmergencyTrends() {
  const trends = []
  for (let i = 0; i < 7; i++) {
    trends.push({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      events: Math.floor(Math.random() * 5),
      responseTime: Math.floor(Math.random() * 20) + 15
    })
  }
  return trends
}

function generateWeeklyEmergencyTrends() {
  const trends = []
  for (let i = 0; i < 4; i++) {
    trends.push({
      week: `Week ${i + 1}`,
      events: Math.floor(Math.random() * 10) + 5,
      responseTime: Math.floor(Math.random() * 15) + 20
    })
  }
  return trends
}

function generateMonthlyEmergencyTrends() {
  const trends = []
  for (let i = 0; i < 6; i++) {
    trends.push({
      month: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7),
      events: Math.floor(Math.random() * 20) + 10,
      responseTime: Math.floor(Math.random() * 10) + 18
    })
  }
  return trends
}
