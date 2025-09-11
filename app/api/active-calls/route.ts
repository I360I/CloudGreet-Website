import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simulate active calls data
    const activeCalls = [
      {
        id: 'call_1',
        caller: 'John Smith',
        phoneNumber: '(555) 123-4567',
        duration: 45,
        status: 'active' as const,
        timestamp: new Date(Date.now() - 45000), // 45 seconds ago
        type: 'incoming',
        aiHandling: true
      },
      {
        id: 'call_2',
        caller: 'Sarah Johnson',
        phoneNumber: '(555) 987-6543',
        duration: 120,
        status: 'ringing' as const,
        timestamp: new Date(Date.now() - 10000), // 10 seconds ago
        type: 'incoming',
        aiHandling: true
      }
    ]

    return NextResponse.json(activeCalls)
  } catch (error) {
    console.error('Error fetching active calls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active calls' },
      { status: 500 }
    )
  }
}
