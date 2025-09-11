import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for call transcripts (in production, use a database)
let callTranscripts = [
  {
    id: '1',
    phoneNumber: '+1 (555) 123-4567',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    duration: 180, // 3 minutes
    transcript: "Hello, I'm calling about your HVAC services. I need someone to come out and look at my air conditioning unit. It's not cooling properly and making strange noises.",
    summary: "Customer needs AC repair, has 2 units, prefers morning appointments, budget: $200-500",
    confidence: 85,
    language: 'English',
    outcome: 'booked',
    jobCategory: 'HVAC Repair',
    leadScore: 8,
    notes: "Customer has 2 AC units, prefers mornings, wants estimate only. Mentioned budget range $200-500.",
    bookingDetails: {
      scheduled: true,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
      time: '09:00',
      estimatedDuration: 120, // 2 hours
      confirmed: true
    }
  },
  {
    id: '2',
    phoneNumber: '+1 (555) 987-6543',
    startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    duration: 240, // 4 minutes
    transcript: "Hola, necesito ayuda con mi sistema de calefacción. No está funcionando bien y hace mucho frío en mi casa.",
    summary: "Spanish-speaking customer needs heating repair, urgent situation, budget unknown",
    confidence: 72,
    language: 'Spanish',
    outcome: 'forwarded',
    jobCategory: 'HVAC Repair',
    leadScore: 6,
    notes: "Customer speaking Spanish, urgent heating issue, needs immediate attention.",
    bookingDetails: {
      scheduled: false,
      forwarded: true,
      reason: 'Language barrier and urgent situation'
    }
  }
]

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const businessName = url.searchParams.get('businessName')
    const onboardingComplete = businessName && businessName !== 'Demo User'
    
    if (!onboardingComplete) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Complete onboarding to start receiving call transcripts'
      })
    }

    return NextResponse.json({
      success: true,
      data: callTranscripts,
      businessName
    })
  } catch (error) {
    console.error('Error fetching call transcripts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call transcripts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, transcript, summary, confidence, language, outcome } = body

    const newTranscript = {
      id: (callTranscripts.length + 1).toString(),
      phoneNumber,
      startTime: new Date().toISOString(),
      duration: Math.floor(Math.random() * 300) + 60, // 1-6 minutes
      transcript,
      summary,
      confidence,
      language: language || 'English',
      outcome,
      jobCategory: 'HVAC Repair', // Default for demo
      leadScore: Math.floor(Math.random() * 5) + 5, // 5-10
      notes: `AI-generated notes for ${outcome} call`,
      bookingDetails: {
        scheduled: outcome === 'booked',
        date: outcome === 'booked' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
        time: outcome === 'booked' ? '09:00' : null,
        estimatedDuration: outcome === 'booked' ? 120 : null,
        confirmed: outcome === 'booked'
      }
    }

    callTranscripts.unshift(newTranscript) // Add to beginning
    callTranscripts = callTranscripts.slice(0, 50) // Keep only last 50

    return NextResponse.json({
      success: true,
      data: newTranscript
    })
  } catch (error) {
    console.error('Error creating call transcript:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create call transcript' },
      { status: 500 }
    )
  }
}
