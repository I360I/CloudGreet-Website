import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AttributionModel {
  id: string
  name: string
  description: string
  modelType: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based' | 'custom'
  weights: Record<string, number>
  isDefault: boolean
  businessId: string
  createdAt: string
  updatedAt: string
}

interface LeadSource {
  id: string
  name: string
  type: 'organic' | 'paid' | 'social' | 'email' | 'referral' | 'direct' | 'other'
  category: string
  subcategory?: string
  cost: number
  isActive: boolean
  businessId: string
  createdAt: string
  updatedAt: string
}

interface AttributionData {
  leadId: string
  touchpoints: Array<{
    source: string
    medium: string
    campaign?: string
    timestamp: string
    value: number
    interactionType: 'visit' | 'click' | 'form_submit' | 'call' | 'email_open' | 'email_click'
  }>
  attributionScore: number
  attributedSource: string
  attributedValue: number
  conversionPath: string[]
  totalTouchpoints: number
  daysToConversion: number
}

interface ROIMetrics {
  sourceId: string
  sourceName: string
  totalCost: number
  totalLeads: number
  totalConversions: number
  totalRevenue: number
  costPerLead: number
  costPerConversion: number
  revenuePerLead: number
  roi: number
  conversionRate: number
  averageDealSize: number
  paybackPeriod: number
  lifetimeValue: number
  attributionWeight: number
}

interface AttributionAnalytics {
  totalRevenue: number
  totalCost: number
  overallROI: number
  sourcePerformance: ROIMetrics[]
  attributionBreakdown: Array<{
    sourceId: string
    sourceName: string
    attributedRevenue: number
    attributedLeads: number
    attributionPercentage: number
  }>
  conversionPaths: Array<{
    path: string[]
    frequency: number
    averageValue: number
    conversionRate: number
  }>
  timeToConversion: {
    average: number
    median: number
    p25: number
    p75: number
  }
  channelEffectiveness: Array<{
    channel: string
    totalTouchpoints: number
    uniqueLeads: number
    conversions: number
    revenue: number
    effectiveness: number
  }>
}

// GET /api/analytics/attribution - Get attribution and ROI data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || 'default'
    const attributionModel = searchParams.get('attributionModel') || 'last_touch'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true'

    // Get attribution models
    const { data: models, error: modelsError } = await supabase
      .from('attribution_models')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (modelsError) {
      throw new Error(`Failed to fetch attribution models: ${modelsError.message}`)
    }

    // Get lead sources
    const { data: sources, error: sourcesError } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (sourcesError) {
      throw new Error(`Failed to fetch lead sources: ${sourcesError.message}`)
    }

    // Get leads with attribution data
    let leadsQuery = supabase
      .from('enriched_leads')
      .select('*')
      .eq('business_id', businessId)

    if (dateFrom) {
      leadsQuery = leadsQuery.gte('created_at', dateFrom)
    }

    if (dateTo) {
      leadsQuery = leadsQuery.lte('created_at', dateTo)
    }

    const { data: leads, error: leadsError } = await leadsQuery

    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`)
    }

    // Get attribution data
    const { data: attributionData, error: attributionError } = await supabase
      .from('lead_attribution')
      .select('*')
      .eq('business_id', businessId)

    if (attributionError) {
      console.error('Failed to fetch attribution data:', attributionError.message)
    }

    let analytics = null
    if (includeAnalytics && leads && sources) {
      analytics = await calculateAttributionAnalytics(
        leads, 
        sources, 
        attributionData || [], 
        models?.find(m => m.id === attributionModel) || models?.find(m => m.isDefault) || models?.[0]
      )
    }

    return NextResponse.json({
      success: true,
      models: models || [],
      sources: sources || [],
      attributionData: attributionData || [],
      analytics
    })
  } catch (error) {
    console.error('Attribution API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch attribution data'
    }, { status: 500 })
  }
}

// POST /api/analytics/attribution - Create attribution model or source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (type === 'model') {
      return await createAttributionModel(data)
    } else if (type === 'source') {
      return await createLeadSource(data)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "model" or "source"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Attribution creation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create attribution item'
    }, { status: 500 })
  }
}

// PUT /api/analytics/attribution - Update attribution model or source
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, data } = body

    if (type === 'model') {
      return await updateAttributionModel(id, data)
    } else if (type === 'source') {
      return await updateLeadSource(id, data)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "model" or "source"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Attribution update error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update attribution item'
    }, { status: 500 })
  }
}

// DELETE /api/analytics/attribution - Delete attribution model or source
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

    if (type === 'model') {
      return await deleteAttributionModel(id)
    } else if (type === 'source') {
      return await deleteLeadSource(id)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "model" or "source"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Attribution deletion error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete attribution item'
    }, { status: 500 })
  }
}

// Helper functions
async function createAttributionModel(data: any) {
  const { businessId = 'default', ...modelData } = data

  const { data: model, error } = await supabase
    .from('attribution_models')
    .insert({
      ...modelData,
      business_id: businessId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create attribution model: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    model
  })
}

async function updateAttributionModel(id: string, data: any) {
  const { data: model, error } = await supabase
    .from('attribution_models')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update attribution model: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    model
  })
}

async function deleteAttributionModel(id: string) {
  const { error } = await supabase
    .from('attribution_models')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete attribution model: ${error.message}`)
  }

  return NextResponse.json({
    success: true
  })
}

async function createLeadSource(data: any) {
  const { businessId = 'default', ...sourceData } = data

  const { data: source, error } = await supabase
    .from('lead_sources')
    .insert({
      ...sourceData,
      business_id: businessId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create lead source: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    source
  })
}

async function updateLeadSource(id: string, data: any) {
  const { data: source, error } = await supabase
    .from('lead_sources')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update lead source: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    source
  })
}

async function deleteLeadSource(id: string) {
  const { error } = await supabase
    .from('lead_sources')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete lead source: ${error.message}`)
  }

  return NextResponse.json({
    success: true
  })
}

async function calculateAttributionAnalytics(
  leads: any[], 
  sources: LeadSource[], 
  attributionData: any[], 
  model?: AttributionModel
): Promise<AttributionAnalytics> {
  const totalRevenue = leads
    .filter(lead => lead.status === 'closed_won')
    .reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0)

  const totalCost = sources.reduce((sum, source) => sum + source.cost, 0)
  const overallROI = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0

  // Calculate source performance
  const sourcePerformance: ROIMetrics[] = sources.map(source => {
    const sourceLeads = leads.filter(lead => lead.source === source.name)
    const convertedLeads = sourceLeads.filter(lead => lead.status === 'closed_won')
    
    const totalLeads = sourceLeads.length
    const totalConversions = convertedLeads.length
    const totalRevenueForSource = convertedLeads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0)
    
    const costPerLead = totalLeads > 0 ? source.cost / totalLeads : 0
    const costPerConversion = totalConversions > 0 ? source.cost / totalConversions : 0
    const revenuePerLead = totalLeads > 0 ? totalRevenueForSource / totalLeads : 0
    const roi = source.cost > 0 ? ((totalRevenueForSource - source.cost) / source.cost) * 100 : 0
    const conversionRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0
    const averageDealSize = totalConversions > 0 ? totalRevenueForSource / totalConversions : 0
    
    // Calculate payback period (simplified)
    const paybackPeriod = revenuePerLead > 0 ? costPerLead / revenuePerLead : 0
    const lifetimeValue = revenuePerLead * 12 // Assuming 12 months average lifetime

    return {
      sourceId: source.id,
      sourceName: source.name,
      totalCost: source.cost,
      totalLeads,
      totalConversions,
      totalRevenue: totalRevenueForSource,
      costPerLead,
      costPerConversion,
      revenuePerLead,
      roi,
      conversionRate,
      averageDealSize,
      paybackPeriod,
      lifetimeValue,
      attributionWeight: 1.0 // This would be calculated based on the attribution model
    }
  })

  // Calculate attribution breakdown
  const attributionBreakdown = sourcePerformance.map(source => ({
    sourceId: source.sourceId,
    sourceName: source.sourceName,
    attributedRevenue: source.totalRevenue,
    attributedLeads: source.totalLeads,
    attributionPercentage: totalRevenue > 0 ? (source.totalRevenue / totalRevenue) * 100 : 0
  }))

  // Calculate conversion paths (simplified)
  const conversionPaths = [
    {
      path: ['direct'],
      frequency: leads.filter(l => l.source === 'direct').length,
      averageValue: leads.filter(l => l.source === 'direct' && l.status === 'closed_won')
        .reduce((sum, l) => sum + (l.estimatedValue || 0), 0) / 
        Math.max(leads.filter(l => l.source === 'direct').length, 1),
      conversionRate: 0 // This would be calculated based on actual conversion data
    }
  ]

  // Calculate time to conversion (simplified)
  const convertedLeads = leads.filter(lead => lead.status === 'closed_won')
  const conversionTimes = convertedLeads.map(lead => {
    const createdDate = new Date(lead.createdAt)
    const closedDate = new Date(lead.updatedAt)
    return Math.floor((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
  })

  const averageTimeToConversion = conversionTimes.length > 0 ? 
    conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length : 0

  const sortedTimes = conversionTimes.sort((a, b) => a - b)
  const medianTime = sortedTimes.length > 0 ? 
    sortedTimes[Math.floor(sortedTimes.length / 2)] : 0

  const p25Time = sortedTimes.length > 0 ? 
    sortedTimes[Math.floor(sortedTimes.length * 0.25)] : 0

  const p75Time = sortedTimes.length > 0 ? 
    sortedTimes[Math.floor(sortedTimes.length * 0.75)] : 0

  // Calculate channel effectiveness (simplified)
  const channelEffectiveness = sources.map(source => ({
    channel: source.type,
    totalTouchpoints: leads.filter(l => l.source === source.name).length,
    uniqueLeads: leads.filter(l => l.source === source.name).length,
    conversions: leads.filter(l => l.source === source.name && l.status === 'closed_won').length,
    revenue: leads.filter(l => l.source === source.name && l.status === 'closed_won')
      .reduce((sum, l) => sum + (l.estimatedValue || 0), 0),
    effectiveness: 0 // This would be calculated based on touchpoint analysis
  }))

  return {
    totalRevenue,
    totalCost,
    overallROI,
    sourcePerformance,
    attributionBreakdown,
    conversionPaths,
    timeToConversion: {
      average: Math.round(averageTimeToConversion),
      median: medianTime,
      p25: p25Time,
      p75: p75Time
    },
    channelEffectiveness
  }
}
