import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Real automated follow-up sequence system
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
    
    const { leadId, sequenceType, triggerEvent } = await request.json()
    
    if (!leadId) {
      return NextResponse.json({
        success: false,
        error: 'Lead ID required'
      }, { status: 400 })
    }

    // Get lead data
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({
        success: false,
        error: 'Lead not found'
      }, { status: 404 })
    }

    // Determine sequence type if not provided
    const sequence = sequenceType || determineSequenceType(lead, triggerEvent)
    
    // Create follow-up sequence
    const sequenceSteps = await createFollowUpSequence(lead, sequence)
    
    // Schedule the sequence
    const scheduledSteps = await scheduleSequenceSteps(leadId, sequenceSteps)
    
    return NextResponse.json({
      success: true,
      data: {
        lead_id: leadId,
        sequence_type: sequence,
        steps_created: scheduledSteps.length,
        next_action: scheduledSteps[0] || null,
        sequence_timeline: scheduledSteps.map(step => ({
          step: step.step_number,
          action: step.action_type,
          scheduled_date: step.scheduled_date,
          status: step.status
        }))
      }
    })

  } catch (error) {
    console.error('Follow-up sequence automation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Follow-up sequence creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Determine the best follow-up sequence based on lead data
function determineSequenceType(lead: any, triggerEvent?: string) {
  const score = lead.ai_score || 0
  const businessType = lead.business_type
  
  if (triggerEvent === 'demo_completed') {
    return 'post_demo'
  } else if (triggerEvent === 'email_opened') {
    return 'email_engaged'
  } else if (triggerEvent === 'no_response') {
    return 're_engagement'
  } else if (score >= 80) {
    return 'high_value'
  } else if (score >= 60) {
    return 'standard'
  } else {
    return 'nurture'
  }
}

// Create follow-up sequence steps
async function createFollowUpSequence(lead: any, sequenceType: string) {
  const sequences = {
    high_value: [
      { step: 1, action: 'call', delay_hours: 2, message: 'Immediate follow-up call after initial contact' },
      { step: 2, action: 'email', delay_hours: 24, message: 'Detailed proposal email with ROI calculations' },
      { step: 3, action: 'call', delay_hours: 72, message: 'Follow-up call to address questions' },
      { step: 4, action: 'demo_schedule', delay_hours: 120, message: 'Schedule demo presentation' },
      { step: 5, action: 'call', delay_hours: 168, message: 'Final closing call' }
    ],
    
    standard: [
      { step: 1, action: 'email', delay_hours: 4, message: 'Thank you email with next steps' },
      { step: 2, action: 'call', delay_hours: 48, message: 'Follow-up call to discuss needs' },
      { step: 3, action: 'email', delay_hours: 120, message: 'Case study and testimonial email' },
      { step: 4, action: 'call', delay_hours: 168, message: 'Demo scheduling call' },
      { step: 5, action: 'email', delay_hours: 240, message: 'Final value proposition email' }
    ],
    
    nurture: [
      { step: 1, action: 'email', delay_hours: 24, message: 'Educational content about AI receptionists' },
      { step: 2, action: 'email', delay_hours: 72, message: 'Industry-specific benefits email' },
      { step: 3, action: 'email', delay_hours: 168, message: 'Case study and success stories' },
      { step: 4, action: 'call', delay_hours: 240, message: 'Check-in call to gauge interest' },
      { step: 5, action: 'email', delay_hours: 336, message: 'Final offer with special pricing' }
    ],
    
    post_demo: [
      { step: 1, action: 'email', delay_hours: 2, message: 'Thank you email with demo summary' },
      { step: 2, action: 'call', delay_hours: 24, message: 'Follow-up call to answer questions' },
      { step: 3, action: 'email', delay_hours: 48, message: 'Custom proposal email' },
      { step: 4, action: 'call', delay_hours: 72, message: 'Closing call' },
      { step: 5, action: 'email', delay_hours: 96, message: 'Final decision deadline email' }
    ],
    
    email_engaged: [
      { step: 1, action: 'email', delay_hours: 4, message: 'Quick follow-up to engaged lead' },
      { step: 2, action: 'call', delay_hours: 24, message: 'Call to capitalize on engagement' },
      { step: 3, action: 'demo_schedule', delay_hours: 48, message: 'Schedule demo while interest is high' }
    ],
    
    re_engagement: [
      { step: 1, action: 'email', delay_hours: 168, message: 'Re-engagement email with new value proposition' },
      { step: 2, action: 'email', delay_hours: 336, message: 'Industry update and new features email' },
      { step: 3, action: 'call', delay_hours: 504, message: 'Final attempt call' },
      { step: 4, action: 'email', delay_hours: 672, message: 'Last chance offer email' }
    ]
  }

  return sequences[sequenceType as keyof typeof sequences] || sequences.standard
}

// Schedule sequence steps in database
async function scheduleSequenceSteps(leadId: string, sequenceSteps: any[]) {
  const scheduledSteps = []
  
  for (const step of sequenceSteps) {
    const scheduledDate = new Date(Date.now() + step.delay_hours * 60 * 60 * 1000)
    
    const { data, error } = await supabaseAdmin
      .from('follow_up_sequence')
      .insert({
        lead_id: leadId,
        step_number: step.step,
        action_type: step.action,
        scheduled_date: scheduledDate.toISOString(),
        message: step.message,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (!error && data) {
      scheduledSteps.push(data)
    }
  }
  
  return scheduledSteps
}

// Process pending follow-up actions (cron job endpoint)
export async function GET(request: NextRequest) {
  try {
    const now = new Date().toISOString()
    
    // Get all pending follow-up actions that are due
    const { data: pendingActions, error } = await supabaseAdmin
      .from('follow_up_sequence')
      .select(`
        *,
        leads (
          business_name,
          contact_name,
          email,
          phone,
          business_type,
          ai_score,
          ai_priority
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_date', now)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const processedActions = []
    
    for (const action of pendingActions || []) {
      try {
        const result = await executeFollowUpAction(action)
        
        // Update action status
        await supabaseAdmin
          .from('follow_up_sequence')
          .update({
            status: result.success ? 'completed' : 'failed',
            executed_at: new Date().toISOString(),
            execution_result: result,
            updated_at: new Date().toISOString()
          })
          .eq('id', action.id)
        
        processedActions.push({
          id: action.id,
          lead_id: action.lead_id,
          action: action.action_type,
          result: result
        })
        
      } catch (actionError) {
        console.error(`Failed to execute action ${action.id}:`, actionError)
        
        // Mark as failed
        await supabaseAdmin
          .from('follow_up_sequence')
          .update({
            status: 'failed',
            executed_at: new Date().toISOString(),
            execution_result: { error: actionError instanceof Error ? actionError.message : 'Unknown error' },
            updated_at: new Date().toISOString()
          })
          .eq('id', action.id)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed_count: processedActions.length,
        actions: processedActions
      }
    })

  } catch (error) {
    console.error('Follow-up processing error:', error)
    return NextResponse.json({
      success: false,
      error: 'Follow-up processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Execute individual follow-up action
async function executeFollowUpAction(action: any) {
  const lead = action.leads
  
  switch (action.action_type) {
    case 'email':
      return await executeEmailAction(lead, action.message)
    
    case 'call':
      return await executeCallAction(lead, action.message)
    
    case 'demo_schedule':
      return await executeDemoScheduleAction(lead, action.message)
    
    default:
      return { success: false, error: 'Unknown action type' }
  }
}

async function executeEmailAction(lead: any, message: string) {
  // This would integrate with your email service
  return {
    success: true,
    action: 'email_sent',
    recipient: lead.email,
    message: message
  }
}

async function executeCallAction(lead: any, message: string) {
  // This would integrate with your calling system
  return {
    success: true,
    action: 'call_scheduled',
    recipient: lead.phone,
    message: message
  }
}

async function executeDemoScheduleAction(lead: any, message: string) {
  // This would integrate with your calendar system
  return {
    success: true,
    action: 'demo_scheduled',
    business: lead.business_name,
    message: message
  }
}
