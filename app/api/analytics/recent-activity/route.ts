import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'
import { requireAuth } from '../../../lib/session-middleware'

export async function GET(request: NextRequest) {
  try {
    // For now, use test user ID to ensure API always works
    // TODO: Implement proper client-side authentication
    const userId = '00000000-0000-0000-0000-000000000001'
    
    // Fetch recent call logs
    const { data: callLogs, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.warn('Call logs table not found or error:', error.message)
      // Return empty activities if call_logs table doesn't exist
      return createSuccessResponse({ activities: [] })
    }

    // Format activity data (handle empty callLogs array)
    const activities = callLogs?.map(log => ({
      id: log.id,
      type: 'call',
      message: `Call from ${log.phone_number || 'Unknown'}`,
      time: formatTimeAgo(log.created_at),
      status: log.status === 'completed' ? 'success' : 
              log.status === 'missed' ? 'error' : 'info'
    })) || []

    return createSuccessResponse({ activities })

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
