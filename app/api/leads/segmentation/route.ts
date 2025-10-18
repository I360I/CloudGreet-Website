import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SegmentationRule {
  id: string
  name: string
  description: string
  isActive: boolean
  conditions: {
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between' | 'is_empty' | 'is_not_empty'
    value: any
    logicalOperator?: 'AND' | 'OR'
  }[]
  targetSegment: string
  priority: number
  businessId: string
  createdAt: string
  updatedAt: string
}

interface LeadSegment {
  id: string
  name: string
  description: string
  color: string
  isActive: boolean
  criteria: SegmentationRule[]
  leadCount: number
  conversionRate: number
  averageValue: number
  totalValue: number
  businessId: string
  createdAt: string
  updatedAt: string
}

interface TargetingCampaign {
  id: string
  name: string
  description: string
  isActive: boolean
  targetSegments: string[]
  campaignType: 'email' | 'sms' | 'call' | 'social' | 'retargeting' | 'nurture'
  content: {
    subject?: string
    message: string
    template?: string
    attachments?: string[]
  }
  schedule: {
    startDate: string
    endDate?: string
    frequency: 'once' | 'daily' | 'weekly' | 'monthly'
    timeOfDay: string
  }
  performance: {
    totalSent: number
    totalOpened: number
    totalClicked: number
    totalConverted: number
    openRate: number
    clickRate: number
    conversionRate: number
    cost: number
    revenue: number
    roi: number
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
  industry?: string
  companySize?: string
  location?: string
  assignedTo?: string
  currentStage?: string
  pipelineId?: string
  estimatedValue: number
  probability: number
  expectedCloseDate?: string
  lastActivity?: string
  tags?: string[]
  customFields?: Record<string, any>
  businessId: string
  createdAt: string
  updatedAt: string
}

interface SegmentationAnalytics {
  totalLeads: number
  segmentsDistribution: Array<{
    segmentId: string
    segmentName: string
    leadCount: number
    percentage: number
    averageValue: number
    conversionRate: number
  }>
  segmentPerformance: Array<{
    segmentId: string
    segmentName: string
    totalValue: number
    convertedValue: number
    conversionRate: number
    averageDealSize: number
  }>
  targetingEffectiveness: Array<{
    campaignId: string
    campaignName: string
    targetSegments: string[]
    conversionRate: number
    roi: number
    costPerLead: number
  }>
  demographicBreakdown: {
    industry: Array<{ name: string; count: number; percentage: number }>
    companySize: Array<{ name: string; count: number; percentage: number }>
    location: Array<{ name: string; count: number; percentage: number }>
    source: Array<{ name: string; count: number; percentage: number }>
  }
}

// GET /api/leads/segmentation - Get segmentation data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || 'default'
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true'
    const segmentId = searchParams.get('segmentId')

    // Get segments
    let segmentsQuery = supabase
      .from('lead_segments')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (segmentId) {
      segmentsQuery = segmentsQuery.eq('id', segmentId)
    }

    const { data: segments, error: segmentsError } = await segmentsQuery

    if (segmentsError) {
      throw new Error(`Failed to fetch segments: ${segmentsError.message}`)
    }

    // Get segmentation rules for each segment
    const segmentsWithRules = await Promise.all(
      segments.map(async (segment) => {
        const { data: rules, error: rulesError } = await supabase
          .from('segmentation_rules')
          .select('*')
          .eq('segment_id', segment.id)
          .order('priority', { ascending: true })

        if (rulesError) {
          console.error(`Failed to fetch rules for segment ${segment.id}:`, rulesError.message)
        }

        return {
          ...segment,
          criteria: rules || []
        }
      })
    )

    // Get targeting campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('targeting_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (campaignsError) {
      console.error('Failed to fetch campaigns:', campaignsError.message)
    }

    // Get leads for analytics
    const { data: leads, error: leadsError } = await supabase
      .from('enriched_leads')
      .select('*')
      .eq('business_id', businessId)

    if (leadsError) {
      console.error('Failed to fetch leads for analytics:', leadsError.message)
    }

    let analytics = null
    if (includeAnalytics && leads) {
      analytics = await calculateSegmentationAnalytics(segmentsWithRules, campaigns || [], leads)
    }

    return NextResponse.json({
      success: true,
      segments: segmentsWithRules,
      campaigns: campaigns || [],
      analytics
    })
  } catch (error) {
    console.error('Segmentation API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch segmentation data'
    }, { status: 500 })
  }
}

// POST /api/leads/segmentation - Create new segment or campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (type === 'segment') {
      return await createLeadSegment(data)
    } else if (type === 'campaign') {
      return await createTargetingCampaign(data)
    } else if (type === 'rule') {
      return await createSegmentationRule(data)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "segment", "campaign", or "rule"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Segmentation creation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create segmentation item'
    }, { status: 500 })
  }
}

// PUT /api/leads/segmentation - Update segment or campaign
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, data } = body

    if (type === 'segment') {
      return await updateLeadSegment(id, data)
    } else if (type === 'campaign') {
      return await updateTargetingCampaign(id, data)
    } else if (type === 'rule') {
      return await updateSegmentationRule(id, data)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "segment", "campaign", or "rule"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Segmentation update error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update segmentation item'
    }, { status: 500 })
  }
}

// DELETE /api/leads/segmentation - Delete segment or campaign
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

    if (type === 'segment') {
      return await deleteLeadSegment(id)
    } else if (type === 'campaign') {
      return await deleteTargetingCampaign(id)
    } else if (type === 'rule') {
      return await deleteSegmentationRule(id)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "segment", "campaign", or "rule"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Segmentation deletion error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete segmentation item'
    }, { status: 500 })
  }
}

// Helper functions
async function createLeadSegment(data: any) {
  const { businessId = 'default', ...segmentData } = data

  const { data: segment, error } = await supabase
    .from('lead_segments')
    .insert({
      ...segmentData,
      business_id: businessId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create segment: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    segment
  })
}

async function updateLeadSegment(id: string, data: any) {
  const { data: segment, error } = await supabase
    .from('lead_segments')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update segment: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    segment
  })
}

async function deleteLeadSegment(id: string) {
  // Delete associated rules first
  await supabase
    .from('segmentation_rules')
    .delete()
    .eq('segment_id', id)

  // Delete segment
  const { error } = await supabase
    .from('lead_segments')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete segment: ${error.message}`)
  }

  return NextResponse.json({
    success: true
  })
}

async function createSegmentationRule(data: any) {
  const { data: rule, error } = await supabase
    .from('segmentation_rules')
    .insert({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create rule: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    rule
  })
}

async function updateSegmentationRule(id: string, data: any) {
  const { data: rule, error } = await supabase
    .from('segmentation_rules')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update rule: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    rule
  })
}

async function deleteSegmentationRule(id: string) {
  const { error } = await supabase
    .from('segmentation_rules')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete rule: ${error.message}`)
  }

  return NextResponse.json({
    success: true
  })
}

async function createTargetingCampaign(data: any) {
  const { businessId = 'default', ...campaignData } = data

  const { data: campaign, error } = await supabase
    .from('targeting_campaigns')
    .insert({
      ...campaignData,
      business_id: businessId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create campaign: ${campaignData.message}`)
  }

  return NextResponse.json({
    success: true,
    campaign
  })
}

async function updateTargetingCampaign(id: string, data: any) {
  const { data: campaign, error } = await supabase
    .from('targeting_campaigns')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update campaign: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    campaign
  })
}

async function deleteTargetingCampaign(id: string) {
  const { error } = await supabase
    .from('targeting_campaigns')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete campaign: ${error.message}`)
  }

  return NextResponse.json({
    success: true
  })
}

async function calculateSegmentationAnalytics(
  segments: LeadSegment[], 
  campaigns: TargetingCampaign[], 
  leads: Lead[]
): Promise<SegmentationAnalytics> {
  const totalLeads = leads.length

  // Calculate segment distribution
  const segmentsDistribution = segments.map(segment => {
    const segmentLeads = leads.filter(lead => evaluateLeadAgainstSegment(lead, segment))
    const convertedLeads = segmentLeads.filter(lead => lead.status === 'closed_won')
    
    return {
      segmentId: segment.id,
      segmentName: segment.name,
      leadCount: segmentLeads.length,
      percentage: totalLeads > 0 ? (segmentLeads.length / totalLeads) * 100 : 0,
      averageValue: segmentLeads.length > 0 ? 
        segmentLeads.reduce((sum, lead) => sum + lead.estimatedValue, 0) / segmentLeads.length : 0,
      conversionRate: segmentLeads.length > 0 ? 
        (convertedLeads.length / segmentLeads.length) * 100 : 0
    }
  })

  // Calculate segment performance
  const segmentPerformance = segments.map(segment => {
    const segmentLeads = leads.filter(lead => evaluateLeadAgainstSegment(lead, segment))
    const convertedLeads = segmentLeads.filter(lead => lead.status === 'closed_won')
    
    const totalValue = segmentLeads.reduce((sum, lead) => sum + lead.estimatedValue, 0)
    const convertedValue = convertedLeads.reduce((sum, lead) => sum + lead.estimatedValue, 0)
    
    return {
      segmentId: segment.id,
      segmentName: segment.name,
      totalValue,
      convertedValue,
      conversionRate: segmentLeads.length > 0 ? 
        (convertedLeads.length / segmentLeads.length) * 100 : 0,
      averageDealSize: convertedLeads.length > 0 ? 
        convertedValue / convertedLeads.length : 0
    }
  })

  // Calculate targeting effectiveness
  const targetingEffectiveness = campaigns.map(campaign => {
    const targetLeads = leads.filter(lead => 
      campaign.targetSegments.some(segmentId => {
        const segment = segments.find(s => s.id === segmentId)
        return segment && evaluateLeadAgainstSegment(lead, segment)
      })
    )
    
    const convertedLeads = targetLeads.filter(lead => lead.status === 'closed_won')
    
    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      targetSegments: campaign.targetSegments,
      conversionRate: targetLeads.length > 0 ? 
        (convertedLeads.length / targetLeads.length) * 100 : 0,
      roi: campaign.performance.roi || 0,
      costPerLead: campaign.performance.totalSent > 0 ? 
        campaign.performance.cost / campaign.performance.totalSent : 0
    }
  })

  // Calculate demographic breakdown
  const demographicBreakdown = {
    industry: calculateDemographicBreakdown(leads, 'industry'),
    companySize: calculateDemographicBreakdown(leads, 'companySize'),
    location: calculateDemographicBreakdown(leads, 'location'),
    source: calculateDemographicBreakdown(leads, 'source')
  }

  return {
    totalLeads,
    segmentsDistribution,
    segmentPerformance,
    targetingEffectiveness,
    demographicBreakdown
  }
}

function evaluateLeadAgainstSegment(lead: Lead, segment: LeadSegment): boolean {
  if (!segment.criteria || segment.criteria.length === 0) {
    return false
  }

  // For simplicity, we'll use AND logic between rules
  return segment.criteria.every(rule => evaluateRule(lead, rule))
}

function evaluateRule(lead: Lead, rule: SegmentationRule): boolean {
  // Evaluate all conditions in the rule
  return rule.conditions.every((condition, index) => {
    const fieldValue = getFieldValue(lead, condition.field)
    let result = false
    
    switch (condition.operator) {
      case 'equals':
        result = fieldValue === condition.value
        break
      case 'not_equals':
        result = fieldValue !== condition.value
        break
      case 'contains':
        result = String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase())
        break
      case 'not_contains':
        result = !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase())
        break
      case 'greater_than':
        result = Number(fieldValue) > Number(condition.value)
        break
      case 'less_than':
        result = Number(fieldValue) < Number(condition.value)
        break
      case 'in':
        result = Array.isArray(condition.value) && condition.value.includes(fieldValue)
        break
      case 'not_in':
        result = Array.isArray(condition.value) && !condition.value.includes(fieldValue)
        break
      case 'between':
        result = Array.isArray(condition.value) && condition.value.length === 2 &&
          Number(fieldValue) >= Number(condition.value[0]) && Number(fieldValue) <= Number(condition.value[1])
        break
      case 'is_empty':
        result = !fieldValue || String(fieldValue).trim() === ''
        break
      case 'is_not_empty':
        result = fieldValue && String(fieldValue).trim() !== ''
        break
      default:
        result = false
    }
    
    return result
  })
}

function getFieldValue(lead: Lead, field: string): any {
  const fieldMap: Record<string, any> = {
    'businessName': lead.businessName,
    'contactName': lead.contactName,
    'email': lead.email,
    'phone': lead.phone,
    'status': lead.status,
    'priority': lead.priority,
    'score': lead.score,
    'source': lead.source,
    'industry': lead.industry,
    'companySize': lead.companySize,
    'location': lead.location,
    'assignedTo': lead.assignedTo,
    'estimatedValue': lead.estimatedValue,
    'probability': lead.probability,
    'tags': lead.tags
  }

  return fieldMap[field] || lead.customFields?.[field]
}

function calculateDemographicBreakdown(leads: Lead[], field: string): Array<{ name: string; count: number; percentage: number }> {
  const counts = leads.reduce((acc, lead) => {
    const value = getFieldValue(lead, field) || 'Unknown'
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const total = leads.length

  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
}
