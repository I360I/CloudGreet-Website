import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Optimized follow-up scheduling based on urgency and business type
export async function POST(request: NextRequest) {
  try {
    // AUTH CHECK: Verify business access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    const decoded = jwt.verify(token, jwtSecret) as any
    const businessId = decoded.businessId
    
    if (!businessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      leadId, 
      scheduledDate, 
      urgencyLevel, 
      bestContactTime, 
      personalizedPitch 
    } = body

    if (!leadId || !scheduledDate) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 })
    }

    // Create optimized follow-up task
    const { data, error } = await supabaseAdmin
      .from('follow_up_tasks')
      .insert({
        lead_id: leadId,
        task_type: 'optimized_follow_up',
        scheduled_date: scheduledDate,
        priority: urgencyLevel,
        status: 'scheduled',
        notes: `Optimized follow-up - ${urgencyLevel} priority. Best contact time: ${bestContactTime}. Personalized pitch: ${personalizedPitch}`,
        urgency_level: urgencyLevel,
        best_contact_time: bestContactTime,
        personalized_pitch: personalizedPitch,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Schedule additional follow-ups based on urgency
    const additionalFollowUps = scheduleAdditionalFollowUps(leadId, urgencyLevel, scheduledDate)
    
    // Log the scheduling activity
    await logSchedulingActivity(leadId, urgencyLevel, scheduledDate, personalizedPitch)

    return NextResponse.json({
      success: true,
      message: 'Optimized follow-up scheduled successfully',
      data: {
        task_id: data.id,
        scheduled_date: scheduledDate,
        urgency_level: urgencyLevel,
        best_contact_time: bestContactTime,
        additional_follow_ups: additionalFollowUps
      }
    })

  } catch (error) {
    console.error('Follow-up scheduling error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to schedule follow-up',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function scheduleAdditionalFollowUps(leadId: string, urgencyLevel: string, initialDate: string) {
  const followUpIntervals = {
    urgent: [6, 24, 72], // 6 hours, 1 day, 3 days
    high: [12, 48, 120], // 12 hours, 2 days, 5 days
    medium: [24, 72, 168], // 1 day, 3 days, 7 days
    low: [48, 120, 336] // 2 days, 5 days, 14 days
  }

  const intervals = followUpIntervals[urgencyLevel as keyof typeof followUpIntervals] || followUpIntervals.medium
  const additionalTasks = []

  for (let index = 0; index < intervals.length; index++) {
    const hours = intervals[index]
    const followUpDate = new Date(new Date(initialDate).getTime() + hours * 60 * 60 * 1000)
    
    // Schedule additional follow-up
    try {
      const result = await supabaseAdmin
        .from('follow_up_tasks')
        .insert({
          lead_id: leadId,
          task_type: `follow_up_${index + 2}`,
          scheduled_date: followUpDate.toISOString(),
          priority: urgencyLevel,
          status: 'scheduled',
          notes: `Automated follow-up ${index + 2} - ${urgencyLevel} priority`,
          urgency_level: urgencyLevel,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (result.data && Array.isArray(result.data) && (result.data as any[]).length > 0) {
        additionalTasks.push({
          task_id: (result.data as any[])[0].id,
          scheduled_date: followUpDate.toISOString(),
          interval_hours: hours
        })
      }
    } catch (error: any) {
      console.error(`Failed to schedule follow-up ${index + 2}:`, error)
    }
  }

  return additionalTasks
}

async function logSchedulingActivity(leadId: string, urgencyLevel: string, scheduledDate: string, personalizedPitch: string) {
  try {
    await supabaseAdmin
      .from('contact_activities')
      .insert({
        lead_id: leadId,
        activity_type: 'optimized_follow_up_scheduled',
        details: {
          urgency_level: urgencyLevel,
          scheduled_date: scheduledDate,
          personalized_pitch: personalizedPitch,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log scheduling activity:', error)
  }
}
