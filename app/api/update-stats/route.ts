import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, stats } = await request.json()
    
    if (!userId || !stats) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'userId and stats are required'
      }, { status: 400 })
    }
    
    const { supabaseAdmin } = await import('../../../lib/supabase')
    
    // Update user stats in database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        total_calls: stats.totalCalls,
        active_jobs: stats.activeJobs,
        total_revenue: stats.totalRevenue,
        customer_rating: stats.customerRating,
        last_updated: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (updateError) {
      console.error('Error updating stats:', updateError)
      return NextResponse.json({
        error: 'Failed to update stats',
        details: updateError.message
      }, { status: 500 })
    }
    
    console.log('✅ Stats updated for user:', userId)
    
    return NextResponse.json({
      success: true,
      message: 'Stats updated successfully',
      updatedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error updating stats:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
