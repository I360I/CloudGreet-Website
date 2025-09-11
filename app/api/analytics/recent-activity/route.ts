import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // For now, use test user ID to ensure API always works
    // TODO: Implement proper client-side authentication
    const userId = '00000000-0000-0000-0000-000000000001'
    
    // Simulate recent activity data
    const activities = [
      {
        id: '1',
        type: 'call',
        message: 'Call from +1 (555) 123-4567',
        time: '2 minutes ago',
        status: 'success'
      },
      {
        id: '2',
        type: 'booking',
        message: 'New appointment booked for tomorrow',
        time: '15 minutes ago',
        status: 'success'
      },
      {
        id: '3',
        type: 'call',
        message: 'Call from +1 (555) 987-6543',
        time: '1 hour ago',
        status: 'info'
      }
    ]

    return NextResponse.json({
      success: true,
      data: { activities },
      message: 'Recent activity retrieved successfully'
    })

  } catch (error) {
    console.error('Recent activity API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  return `${Math.floor(diffInSeconds / 86400)} days ago`
}
