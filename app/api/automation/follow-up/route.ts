import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface FollowUpSequence {
  id: string
  name: string
  description: string
  isActive: boolean
  triggerEvent: 'lead_created' | 'no_response' | 'meeting_scheduled' | 'deal_closed' | 'custom'
  triggerDelay: number // in hours
  steps: FollowUpStep[]
  conditions: {
    field: string
    operator: string
    value: any
  }[]
  businessId: string
  createdAt: string
  updatedAt: string
}

interface FollowUpStep {
  id: string
  stepNumber: number
  actionType: 'email' | 'sms' | 'call' | 'task' | 'wait'
  subject?: string
  content: string
  delayHours: number
  isActive: boolean
  templateId?: string
  attachments?: string[]
  metadata?: Record<string, any>
}

interface Lead {
  id: string
  businessName: string
  contactName: string
  email: string
  phone: string
  status: string
  priority: string
  score: number
  source: string
  assignedTo?: string
  businessId: string
  createdAt: string
  updatedAt: string
}

interface NurtureCampaign {
  id: string
  name: string
  description: string
  isActive: boolean
  targetSegments: string[]
  sequences: FollowUpSequence[]
  performance: {
    totalSent: number
    totalOpened: number
    totalClicked: number
    totalConverted: number
    openRate: number
    clickRate: number
    conversionRate: number
  }
  businessId: string
  createdAt: string
  updatedAt: string
}

// GET /api/automation/follow-up - Get all follow-up sequences and campaigns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || 'default'

    // Get follow-up sequences
    const { data: sequences, error: sequencesError } = await supabase
      .from('follow_up_sequences')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (sequencesError) {
      throw new Error(`Failed to fetch sequences: ${sequencesError.message}`)
    }

    // Get nurture campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('nurture_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (campaignsError) {
      throw new Error(`Failed to fetch campaigns: ${campaignsError.message}`)
    }

    // Get sequence steps for each sequence
    const sequencesWithSteps = await Promise.all(
      sequences.map(async (sequence) => {
        const { data: steps, error: stepsError } = await supabase
          .from('follow_up_steps')
          .select('*')
          .eq('sequence_id', sequence.id)
          .order('step_number', { ascending: true })

        if (stepsError) {
          console.error(`Failed to fetch steps for sequence ${sequence.id}:`, stepsError.message)
        }

        return {
          ...sequence,
          steps: steps || []
        }
      })
    )

    // Get campaign performance
    const campaignsWithPerformance = await Promise.all(
      campaigns.map(async (campaign) => {
        const { data: performance, error: performanceError } = await supabase
          .from('campaign_performance')
          .select('*')
          .eq('campaign_id', campaign.id)
          .single()

        if (performanceError) {
          console.error(`Failed to fetch performance for campaign ${campaign.id}:`, performanceError.message)
        }

        return {
          ...campaign,
          performance: performance || {
            totalSent: 0,
            totalOpened: 0,
            totalClicked: 0,
            totalConverted: 0,
            openRate: 0,
            clickRate: 0,
            conversionRate: 0
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      sequences: sequencesWithSteps,
      campaigns: campaignsWithPerformance
    })
      } catch (error) {
    console.error('Follow-up automation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch follow-up data'
    }, { status: 500 })
  }
}

// POST /api/automation/follow-up - Create new follow-up sequence or campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (type === 'sequence') {
      return await createFollowUpSequence(data)
    } else if (type === 'campaign') {
      return await createNurtureCampaign(data)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "sequence" or "campaign"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Follow-up automation creation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create follow-up automation'
    }, { status: 500 })
  }
}

// PUT /api/automation/follow-up - Update follow-up sequence or campaign
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, data } = body

    if (type === 'sequence') {
      return await updateFollowUpSequence(id, data)
    } else if (type === 'campaign') {
      return await updateNurtureCampaign(id, data)
    } else {
    return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "sequence" or "campaign"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Follow-up automation update error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update follow-up automation'
    }, { status: 500 })
  }
}

// DELETE /api/automation/follow-up - Delete follow-up sequence or campaign
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({
        success: false,
        error: 'Type and ID are required'
      }, { status: 400 })
    }

    if (type === 'sequence') {
      return await deleteFollowUpSequence(id)
    } else if (type === 'campaign') {
      return await deleteNurtureCampaign(id)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "sequence" or "campaign"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Follow-up automation deletion error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete follow-up automation'
    }, { status: 500 })
  }
}

// Helper functions
async function createFollowUpSequence(data: any) {
  const { businessId = 'default', ...sequenceData } = data

  // Create sequence
  const { data: sequence, error: sequenceError } = await supabase
    .from('follow_up_sequences')
    .insert({
      ...sequenceData,
      business_id: businessId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (sequenceError) {
    throw new Error(`Failed to create sequence: ${sequenceError.message}`)
  }

  // Create steps if provided
  if (data.steps && data.steps.length > 0) {
    const stepsData = data.steps.map((step: any) => ({
      ...step,
      sequence_id: sequence.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error: stepsError } = await supabase
      .from('follow_up_steps')
      .insert(stepsData)

    if (stepsError) {
      console.error('Failed to create steps:', stepsError.message)
    }
  }

  return NextResponse.json({
    success: true,
    sequence
  })
}

async function updateFollowUpSequence(id: string, data: any) {
  const { data: sequence, error: sequenceError } = await supabase
    .from('follow_up_sequences')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (sequenceError) {
    throw new Error(`Failed to update sequence: ${sequenceError.message}`)
  }

  // Update steps if provided
  if (data.steps) {
    // Delete existing steps
    await supabase
      .from('follow_up_steps')
      .delete()
      .eq('sequence_id', id)

    // Insert new steps
    if (data.steps.length > 0) {
      const stepsData = data.steps.map((step: any) => ({
        ...step,
        sequence_id: id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: stepsError } = await supabase
        .from('follow_up_steps')
        .insert(stepsData)

      if (stepsError) {
        console.error('Failed to update steps:', stepsError.message)
      }
    }
  }

  return NextResponse.json({
    success: true,
    sequence
  })
}

async function deleteFollowUpSequence(id: string) {
  // Delete steps first
  await supabase
    .from('follow_up_steps')
    .delete()
    .eq('sequence_id', id)

  // Delete sequence
  const { error } = await supabase
    .from('follow_up_sequences')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete sequence: ${error.message}`)
  }

  return NextResponse.json({
    success: true
  })
}

async function createNurtureCampaign(data: any) {
  const { businessId = 'default', ...campaignData } = data

  const { data: campaign, error: campaignError } = await supabase
    .from('nurture_campaigns')
    .insert({
      ...campaignData,
      business_id: businessId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (campaignError) {
    throw new Error(`Failed to create campaign: ${campaignError.message}`)
  }

  // Initialize performance tracking
  await supabase
    .from('campaign_performance')
    .insert({
      campaign_id: campaign.id,
      total_sent: 0,
      total_opened: 0,
      total_clicked: 0,
      total_converted: 0,
      open_rate: 0,
      click_rate: 0,
      conversion_rate: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

  return NextResponse.json({
    success: true,
    campaign
  })
}

async function updateNurtureCampaign(id: string, data: any) {
  const { data: campaign, error: campaignError } = await supabase
    .from('nurture_campaigns')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (campaignError) {
    throw new Error(`Failed to update campaign: ${campaignError.message}`)
  }

  return NextResponse.json({
    success: true,
    campaign
  })
}

async function deleteNurtureCampaign(id: string) {
  // Delete performance tracking
  await supabase
    .from('campaign_performance')
    .delete()
    .eq('campaign_id', id)

  // Delete campaign
  const { error } = await supabase
    .from('nurture_campaigns')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete campaign: ${error.message}`)
  }

  return NextResponse.json({
    success: true
  })
}