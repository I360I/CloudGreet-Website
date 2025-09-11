import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simulate system status check
    const systemStatus = {
      phone: 'connected' as const,
      calendar: 'connected' as const,
      ai: 'active' as const,
      speech: 'ready' as const,
      lastChecked: new Date().toISOString(),
      uptime: Math.floor(Math.random() * 99) + 1, // 1-99% uptime
      responseTime: Math.floor(Math.random() * 100) + 50 // 50-150ms
    }

    return NextResponse.json(systemStatus)
  } catch (error) {
    console.error('Error fetching system status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system status' },
      { status: 500 }
    )
  }
}