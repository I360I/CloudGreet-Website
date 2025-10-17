import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PipelineStage {
  id: string
  name: string
  description: string
  position: number
  color: string
  isActive: boolean
  isDefault: boolean
  criteria: {
    field: string
    operator: string
    value: any
  }[]
  automationRules: {
    trigger: string
    action: string
    conditions: any[]
  }[]
  businessId: string
  createdAt: string
  updatedAt: string
}

interface Pipeline {
  id: string
  name: string
  description: string
  isActive: boolean
  isDefault: boolean
  stages: PipelineStage[]
  settings: {
    allowStageSkipping: boolean
    requireApproval: boolean
    autoAdvance: boolean
    notifications: boolean
  }
  businessId: string
  createdAt: string
  updatedAt: string
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
  currentStage?: string
  pipelineId?: string
  estimatedValue: number
  probability: number
  expectedCloseDate?: string
  lastActivity?: string
  businessId: string
  createdAt: string
  updatedAt: string
}

interface PipelineAnalytics {
  totalLeads: number
  stageDistribution: Array<{
    stageId: string
    stageName: string
    leadCount: number
    percentage: number
    totalValue: number
    averageValue: number
  }>
  conversionRates: Array<{
    fromStage: string
    toStage: string
    rate: number
    count: number
  }>
  averageStageTime: Array<{
    stageId: string
    stageName: string
    averageDays: number
  }>
  velocityMetrics: {
    averageDealVelocity: number
    fastestDeal: number
    slowestDeal: number
    medianDealTime: number
  }
  revenueMetrics: {
    totalPipelineValue: number
    weightedPipelineValue: number
    expectedRevenue: number
    closedWonRevenue: number
  }
}

// GET /api/crm/pipeline - Get pipeline data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || 'default'
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true'

    // Get pipelines
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('crm_pipelines')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (pipelinesError) {
      throw new Error(`Failed to fetch pipelines: ${pipelinesError.message}`)
    }

    // Get pipeline stages
    const pipelinesWithStages = await Promise.all(
      pipelines.map(async (pipeline) => {
        const { data: stages, error: stagesError } = await supabase
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', pipeline.id)
          .order('position', { ascending: true })

        if (stagesError) {
          console.error(`Failed to fetch stages for pipeline ${pipeline.id}:`, stagesError.message)
        }

        return {
          ...pipeline,
          stages: stages || []
        }
      })
    )

    // Get leads for pipeline analytics
    const { data: leads, error: leadsError } = await supabase
      .from('enriched_leads')
      .select('*')
      .eq('business_id', businessId)

    if (leadsError) {
      console.error('Failed to fetch leads for analytics:', leadsError.message)
    }

    let analytics = null
    if (includeAnalytics && leads) {
      analytics = calculatePipelineAnalytics(pipelinesWithStages, leads)
    }

    return NextResponse.json({
      success: true,
      pipelines: pipelinesWithStages,
      analytics
    })
  } catch (error) {
    console.error('Pipeline API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pipeline data'
    }, { status: 500 })
  }
}

// POST /api/crm/pipeline - Create new pipeline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId = 'default', ...pipelineData } = body

    // Create pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('crm_pipelines')
      .insert({
        ...pipelineData,
        business_id: businessId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (pipelineError) {
      throw new Error(`Failed to create pipeline: ${pipelineError.message}`)
    }

    // Create default stages if provided
    if (pipelineData.stages && pipelineData.stages.length > 0) {
      const stagesData = pipelineData.stages.map((stage: any, index: number) => ({
        ...stage,
        pipeline_id: pipeline.id,
        position: index + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(stagesData)

      if (stagesError) {
        console.error('Failed to create stages:', stagesError.message)
      }
    }

    return NextResponse.json({
      success: true,
      pipeline
    })
  } catch (error) {
    console.error('Pipeline creation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create pipeline'
    }, { status: 500 })
  }
}

// PUT /api/crm/pipeline - Update pipeline
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    const { data: pipeline, error: pipelineError } = await supabase
      .from('crm_pipelines')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (pipelineError) {
      throw new Error(`Failed to update pipeline: ${pipelineError.message}`)
    }

    // Update stages if provided
    if (updateData.stages) {
      // Delete existing stages
      await supabase
        .from('pipeline_stages')
        .delete()
        .eq('pipeline_id', id)

      // Insert new stages
      if (updateData.stages.length > 0) {
        const stagesData = updateData.stages.map((stage: any, index: number) => ({
          ...stage,
          pipeline_id: id,
          position: index + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { error: stagesError } = await supabase
          .from('pipeline_stages')
          .insert(stagesData)

        if (stagesError) {
          console.error('Failed to update stages:', stagesError.message)
        }
      }
    }

    return NextResponse.json({
      success: true,
      pipeline
    })
  } catch (error) {
    console.error('Pipeline update error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update pipeline'
    }, { status: 500 })
  }
}

// DELETE /api/crm/pipeline - Delete pipeline
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Pipeline ID is required'
      }, { status: 400 })
    }

    // Delete stages first
    await supabase
      .from('pipeline_stages')
      .delete()
      .eq('pipeline_id', id)

    // Delete pipeline
    const { error } = await supabase
      .from('crm_pipelines')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete pipeline: ${error.message}`)
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Pipeline deletion error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete pipeline'
    }, { status: 500 })
  }
}

// Helper function to calculate pipeline analytics
function calculatePipelineAnalytics(pipelines: Pipeline[], leads: Lead[]): PipelineAnalytics {
  const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0]
  
  if (!defaultPipeline) {
    return {
      totalLeads: 0,
      stageDistribution: [],
      conversionRates: [],
      averageStageTime: [],
      velocityMetrics: {
        averageDealVelocity: 0,
        fastestDeal: 0,
        slowestDeal: 0,
        medianDealTime: 0
      },
      revenueMetrics: {
        totalPipelineValue: 0,
        weightedPipelineValue: 0,
        expectedRevenue: 0,
        closedWonRevenue: 0
      }
    }
  }

  const pipelineLeads = leads.filter(lead => lead.pipelineId === defaultPipeline.id)
  const totalLeads = pipelineLeads.length

  // Calculate stage distribution
  const stageDistribution = defaultPipeline.stages.map(stage => {
    const stageLeads = pipelineLeads.filter(lead => lead.currentStage === stage.id)
    const totalValue = stageLeads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0)
    const averageValue = stageLeads.length > 0 ? totalValue / stageLeads.length : 0

    return {
      stageId: stage.id,
      stageName: stage.name,
      leadCount: stageLeads.length,
      percentage: totalLeads > 0 ? (stageLeads.length / totalLeads) * 100 : 0,
      totalValue,
      averageValue
    }
  })

  // Calculate conversion rates (simplified)
  const conversionRates = defaultPipeline.stages.slice(0, -1).map((stage, index) => {
    const nextStage = defaultPipeline.stages[index + 1]
    const currentStageLeads = pipelineLeads.filter(lead => lead.currentStage === stage.id)
    const nextStageLeads = pipelineLeads.filter(lead => lead.currentStage === nextStage.id)
    
    const rate = currentStageLeads.length > 0 ? (nextStageLeads.length / currentStageLeads.length) * 100 : 0

    return {
      fromStage: stage.name,
      toStage: nextStage.name,
      rate,
      count: nextStageLeads.length
    }
  })

  // Calculate average stage time (simplified)
  const averageStageTime = defaultPipeline.stages.map(stage => {
    const stageLeads = pipelineLeads.filter(lead => lead.currentStage === stage.id)
    const averageDays = stageLeads.length > 0 ? 
      stageLeads.reduce((sum, lead) => {
        const daysSinceCreated = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        return sum + daysSinceCreated
      }, 0) / stageLeads.length : 0

    return {
      stageId: stage.id,
      stageName: stage.name,
      averageDays: Math.round(averageDays)
    }
  })

  // Calculate velocity metrics
  const closedLeads = pipelineLeads.filter(lead => lead.status === 'closed_won')
  const dealTimes = closedLeads.map(lead => {
    const createdDate = new Date(lead.createdAt)
    const closedDate = new Date(lead.lastActivity || lead.updatedAt)
    return Math.floor((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
  })

  const averageDealVelocity = dealTimes.length > 0 ? 
    dealTimes.reduce((sum, time) => sum + time, 0) / dealTimes.length : 0

  const fastestDeal = dealTimes.length > 0 ? Math.min(...dealTimes) : 0
  const slowestDeal = dealTimes.length > 0 ? Math.max(...dealTimes) : 0
  const medianDealTime = dealTimes.length > 0 ? 
    dealTimes.sort((a, b) => a - b)[Math.floor(dealTimes.length / 2)] : 0

  // Calculate revenue metrics
  const totalPipelineValue = pipelineLeads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0)
  const weightedPipelineValue = pipelineLeads.reduce((sum, lead) => {
    const probability = lead.probability || 0
    return sum + ((lead.estimatedValue || 0) * (probability / 100))
  }, 0)
  const expectedRevenue = weightedPipelineValue
  const closedWonRevenue = closedLeads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0)

  return {
    totalLeads,
    stageDistribution,
    conversionRates,
    averageStageTime,
    velocityMetrics: {
      averageDealVelocity: Math.round(averageDealVelocity),
      fastestDeal,
      slowestDeal,
      medianDealTime
    },
    revenueMetrics: {
      totalPipelineValue,
      weightedPipelineValue,
      expectedRevenue,
      closedWonRevenue
    }
  }
}
