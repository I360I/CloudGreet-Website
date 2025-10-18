import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { z } from 'zod'

// Real-time calls query schema
const realtimeQuerySchema = z.object({
  businessId: z.string().optional().default('default'),
  limit: z.string().optional().default('50')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = realtimeQuerySchema.parse({
      businessId: searchParams.get('businessId'),
      limit: searchParams.get('limit')
    })

    const { businessId, limit } = query

    // Generate realistic real-time call data
    const callsData = await generateRealtimeCallsData(businessId, parseInt(limit))

    return NextResponse.json({
      success: true,
      calls: callsData.calls,
      activeCalls: callsData.activeCalls,
      stats: callsData.stats,
      metadata: {
        businessId,
        limit: parseInt(limit),
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Real-time calls API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch real-time calls'
    }, { status: 500 })
  }
}

async function generateRealtimeCallsData(businessId: string, limit: number) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Generate realistic call data
  const calls = []
  const activeCalls = []
  
  // Generate recent calls (last 24 hours)
  for (let i = 0; i < limit; i++) {
    const callTime = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000)
    const duration = Math.floor(Math.random() * 600) + 30 // 30 seconds to 10 minutes
    const status = getRandomCallStatus()
    
    const call = {
      id: `call_${Date.now()}_${i}`,
      fromNumber: generatePhoneNumber(),
      toNumber: '+17372960092',
      status,
      duration: status === 'connected' || status === 'ended' ? duration : 0,
      startTime: callTime,
      endTime: status === 'ended' ? new Date(callTime.getTime() + duration * 1000) : undefined,
      callerName: generateCallerName(),
      callerLocation: generateLocation(),
      callerInfo: {
        name: generateCallerName(),
        location: generateLocation(),
        previousCalls: Math.floor(Math.random() * 10),
        lastCallDate: new Date(callTime.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      },
      transcript: status === 'ended' ? generateTranscript() : undefined,
      summary: status === 'ended' ? generateCallSummary() : undefined,
      sentiment: status === 'ended' ? getRandomSentiment() : undefined,
      intent: status === 'ended' ? generateIntent() : undefined,
      nextAction: status === 'ended' ? generateNextAction() : undefined,
      recordingUrl: status === 'ended' && Math.random() > 0.3 ? `/recordings/call_${i}.mp3` : undefined,
      quality: {
        audioQuality: getRandomAudioQuality(),
        latency: Math.floor(Math.random() * 100) + 50,
        packetLoss: Math.random() * 2
      }
    }
    
    calls.push(call)
    
    // Add to active calls if currently connected
    if (status === 'connected' || status === 'ringing') {
      activeCalls.push(call)
    }
  }

  // Calculate stats
  const totalToday = calls.length
  const activeNow = activeCalls.length
  const answeredToday = calls.filter(c => c.status === 'ended' || c.status === 'connected').length
  const missedToday = calls.filter(c => c.status === 'missed').length
  const avgDuration = calls
    .filter(c => c.duration > 0)
    .reduce((sum, c) => sum + c.duration, 0) / calls.filter(c => c.duration > 0).length || 0
  const satisfaction = 4.2 + Math.random() * 0.7

  return {
    calls: calls.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()),
    activeCalls,
    stats: {
      totalToday,
      activeNow,
      answeredToday,
      missedToday,
      avgDuration: Math.round(avgDuration),
      satisfaction: Math.round(satisfaction * 10) / 10
    }
  }
}

function getRandomCallStatus(): 'ringing' | 'connected' | 'ended' | 'missed' | 'voicemail' {
  const statuses = ['ended', 'ended', 'ended', 'missed', 'voicemail', 'connected'] // More ended calls
  return statuses[Math.floor(Math.random() * statuses.length)] as any
}

function generatePhoneNumber(): string {
  const areaCodes = ['555', '444', '333', '222', '111']
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)]
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  return `+1${areaCode}${number.slice(0, 3)}${number.slice(3)}`
}

function generateCallerName(): string {
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Jessica']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  
  return `${firstName} ${lastName}`
}

function generateLocation(): string {
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose']
  const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'CA']
  
  const index = Math.floor(Math.random() * cities.length)
  return `${cities[index]}, ${states[index]}`
}

function generateTranscript(): string {
  const transcripts = [
    "Hi, I'm calling about your HVAC services. My air conditioner isn't working properly and I need someone to take a look at it. When would you be available?",
    "Good morning, I saw your ad online and I'm interested in getting a quote for painting my house. Could you give me an estimate?",
    "Hello, this is regarding the roofing estimate you provided last week. I'd like to schedule the work to begin next month.",
    "Hi there, I have an emergency with my plumbing. There's water leaking everywhere. Can you send someone out today?",
    "Good afternoon, I'm looking for a landscaping company to maintain my yard. Do you offer regular maintenance services?"
  ]
  
  return transcripts[Math.floor(Math.random() * transcripts.length)]
}

function generateCallSummary(): string {
  const summaries = [
    "Customer called about HVAC repair. Scheduled appointment for tomorrow morning. Provided emergency contact information.",
    "Inquiry about painting services. Qualified lead with 3,000 sq ft house. Scheduled estimate for next week.",
    "Follow-up on roofing quote. Customer approved project and wants to start in 2 weeks. Sent contract details.",
    "Emergency plumbing call. Dispatched technician immediately. Issue resolved within 2 hours.",
    "Landscaping maintenance inquiry. Customer interested in monthly service. Scheduled consultation for next Tuesday."
  ]
  
  return summaries[Math.floor(Math.random() * summaries.length)]
}

function getRandomSentiment(): 'positive' | 'neutral' | 'negative' {
  const sentiments = ['positive', 'positive', 'neutral', 'neutral', 'negative']
  return sentiments[Math.floor(Math.random() * sentiments.length)] as any
}

function generateIntent(): string {
  const intents = [
    'Schedule Service',
    'Get Quote',
    'Emergency Repair',
    'General Inquiry',
    'Follow-up',
    'Complaint',
    'Cancellation',
    'Reschedule'
  ]
  
  return intents[Math.floor(Math.random() * intents.length)]
}

function generateNextAction(): string {
  const actions = [
    'Send follow-up email with service details',
    'Schedule technician visit',
    'Prepare estimate and send via email',
    'Call customer tomorrow to confirm appointment',
    'Send contract for signature',
    'Add to priority queue for emergency service',
    'Update customer record with new preferences',
    'Schedule callback for next week'
  ]
  
  return actions[Math.floor(Math.random() * actions.length)]
}

function getRandomAudioQuality(): 'excellent' | 'good' | 'poor' {
  const qualities = ['excellent', 'excellent', 'good', 'good', 'poor']
  return qualities[Math.floor(Math.random() * qualities.length)] as any
}
