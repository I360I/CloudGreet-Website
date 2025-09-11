import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simulate recent activity data
    const recentActivity = [
      {
        id: 'activity_1',
        type: 'booking' as const,
        description: 'New booking scheduled for HVAC repair',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        amount: 250,
        customer: 'Mike Wilson',
        status: 'confirmed'
      },
      {
        id: 'activity_2',
        type: 'call' as const,
        description: 'Incoming call from potential customer',
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        duration: 180,
        outcome: 'callback_scheduled'
      },
      {
        id: 'activity_3',
        type: 'payment' as const,
        description: 'Payment received for painting job',
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
        amount: 1200,
        customer: 'Lisa Brown',
        status: 'completed'
      },
      {
        id: 'activity_4',
        type: 'booking' as const,
        description: 'Roofing inspection scheduled',
        timestamp: new Date(Date.now() - 1200000), // 20 minutes ago
        amount: 150,
        customer: 'David Lee',
        status: 'pending'
      },
      {
        id: 'activity_5',
        type: 'call' as const,
        description: 'Emergency service call',
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        duration: 240,
        outcome: 'service_dispatched'
      }
    ]

    return NextResponse.json(recentActivity)
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activity' },
      { status: 500 }
    )
  }
}