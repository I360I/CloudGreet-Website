import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { z } from 'zod'

// Advanced leads query schema
const leadsQuerySchema = z.object({
  businessId: z.string().optional().default('default'),
  userId: z.string().optional().default('default'),
  status: z.string().optional().default('all'),
  priority: z.string().optional().default('all'),
  assigned_to: z.string().optional().default('all'),
  source: z.string().optional().default('all'),
  score_min: z.string().optional().default('0'),
  score_max: z.string().optional().default('100'),
  search: z.string().optional().default(''),
  tags: z.string().optional().default(''),
  sortBy: z.enum(['created_at', 'score', 'priority', 'value']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.string().optional().default('100'),
  offset: z.string().optional().default('0')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = leadsQuerySchema.parse({
      businessId: searchParams.get('businessId'),
      userId: searchParams.get('userId'),
      status: searchParams.get('status'),
      priority: searchParams.get('priority'),
      assigned_to: searchParams.get('assigned_to'),
      source: searchParams.get('source'),
      score_min: searchParams.get('score_min'),
      score_max: searchParams.get('score_max'),
      search: searchParams.get('search'),
      tags: searchParams.get('tags'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    })

    const { businessId, userId, ...filters } = query

    // Generate comprehensive lead management data
    const leadsData = await generateAdvancedLeadsData(businessId, userId, filters)

    return NextResponse.json({
      success: true,
      leads: leadsData.leads,
      stats: leadsData.stats,
      metadata: {
        businessId,
        userId,
        filters,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Advanced leads API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch leads data'
    }, { status: 500 })
  }
}

async function generateAdvancedLeadsData(businessId: string, userId: string, filters: any) {
  // Generate realistic lead data with comprehensive information
  const leads = []
  const sources = ['apollo_killer', 'website', 'referral', 'cold_outreach', 'social_media']
  const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
  const priorities = ['low', 'medium', 'high', 'urgent']
  const businessTypes = ['HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Painting', 'Landscaping', 'Cleaning']
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose']
  const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'CA']

  // Generate leads based on filters
  const leadCount = 50 + Math.floor(Math.random() * 100) // 50-150 leads
  
  for (let i = 0; i < leadCount; i++) {
    const source = sources[Math.floor(Math.random() * sources.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const priority = priorities[Math.floor(Math.random() * priorities.length)]
    const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)]
    const cityIndex = Math.floor(Math.random() * cities.length)
    const city = cities[cityIndex]
    const state = states[cityIndex]
    
    const totalScore = Math.floor(Math.random() * 100)
    const estimatedValue = Math.floor(Math.random() * 50000) + 5000 // $5K - $55K
    const probability = Math.floor(Math.random() * 100)
    
    const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Last 90 days
    const updatedAt = new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) // Within 7 days of creation
    
    // Generate notes
    const notesCount = Math.floor(Math.random() * 5) + 1
    const notes = []
    const noteTypes = ['general', 'call_outcome', 'email_response', 'meeting', 'follow_up', 'research']
    
    for (let j = 0; j < notesCount; j++) {
      const noteDate = new Date(createdAt.getTime() + Math.random() * (updatedAt.getTime() - createdAt.getTime()))
      notes.push({
        id: `note_${i}_${j}`,
        note: generateSampleNote(noteTypes[Math.floor(Math.random() * noteTypes.length)]),
        type: noteTypes[Math.floor(Math.random() * noteTypes.length)],
        created_by: `user_${Math.floor(Math.random() * 5) + 1}`,
        created_at: noteDate.toISOString()
      })
    }
    
    // Generate activities
    const activitiesCount = Math.floor(Math.random() * 8) + 2
    const activities = []
    const activityTypes = ['created', 'enriched', 'assigned', 'contacted', 'note_added', 'tag_added', 'exported', 'status_changed']
    
    for (let k = 0; k < activitiesCount; k++) {
      const activityDate = new Date(createdAt.getTime() + Math.random() * (updatedAt.getTime() - createdAt.getTime()))
      activities.push({
        id: `activity_${i}_${k}`,
        type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        description: generateActivityDescription(activityTypes[Math.floor(Math.random() * activityTypes.length)]),
        created_by: `user_${Math.floor(Math.random() * 5) + 1}`,
        created_at: activityDate.toISOString(),
        metadata: {}
      })
    }
    
    // Generate tags
    const allTags = ['hot', 'cold', 'follow-up', 'qualified', 'high-value', 'local', 'enterprise', 'startup', 'renewal', 'upsell']
    const tagsCount = Math.floor(Math.random() * 4) + 1
    const tags = []
    for (let l = 0; l < tagsCount; l++) {
      const tag = allTags[Math.floor(Math.random() * allTags.length)]
      if (!tags.includes(tag)) {
        tags.push(tag)
      }
    }
    
    const lead = {
      id: `lead_${i}`,
      business_name: generateBusinessName(businessType),
      contact_name: Math.random() > 0.3 ? generateContactName() : undefined,
      email: Math.random() > 0.4 ? generateEmail() : undefined,
      phone: generatePhoneNumber(),
      address: `${Math.floor(Math.random() * 9999) + 1} ${generateStreetName()}`,
      city,
      state,
      business_type: businessType,
      website_url: Math.random() > 0.5 ? `https://${generateDomain()}` : undefined,
      total_score: totalScore,
      ai_score: Math.floor(totalScore * (0.8 + Math.random() * 0.4)), // AI score varies from total score
      ml_score: Math.floor(totalScore * (0.9 + Math.random() * 0.2)), // ML score close to total score
      ai_priority: priority,
      ml_probability: probability / 100,
      ai_insights: generateAIInsights(businessType, priority),
      ai_recommendations: generateAIRecommendations(status, priority),
      enrichment_status: Math.random() > 0.2 ? 'enriched' : 'pending',
      assigned_to: Math.random() > 0.4 ? `user_${Math.floor(Math.random() * 5) + 1}` : undefined,
      assigned_at: Math.random() > 0.4 ? new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined,
      status,
      source,
      tags,
      notes,
      activities,
      last_contacted: Math.random() > 0.3 ? new Date(updatedAt.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      next_follow_up: Math.random() > 0.5 ? new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      estimated_value: estimatedValue,
      probability,
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString()
    }
    
    leads.push(lead)
  }

  // Apply filters
  let filteredLeads = leads
  
  if (filters.status !== 'all') {
    filteredLeads = filteredLeads.filter(lead => lead.status === filters.status)
  }
  
  if (filters.priority !== 'all') {
    filteredLeads = filteredLeads.filter(lead => lead.ai_priority === filters.priority)
  }
  
  if (filters.source !== 'all') {
    filteredLeads = filteredLeads.filter(lead => lead.source === filters.source)
  }
  
  if (filters.score_min) {
    const minScore = parseInt(filters.score_min)
    filteredLeads = filteredLeads.filter(lead => (lead.total_score || 0) >= minScore)
  }
  
  if (filters.score_max) {
    const maxScore = parseInt(filters.score_max)
    filteredLeads = filteredLeads.filter(lead => (lead.total_score || 0) <= maxScore)
  }
  
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase()
    filteredLeads = filteredLeads.filter(lead => 
      lead.business_name.toLowerCase().includes(searchTerm) ||
      (lead.contact_name && lead.contact_name.toLowerCase().includes(searchTerm)) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm)) ||
      (lead.phone && lead.phone.includes(searchTerm))
    )
  }
  
  if (filters.tags) {
    const tagFilters = filters.tags.split(',').filter(Boolean)
    filteredLeads = filteredLeads.filter(lead => 
      tagFilters.some(tag => lead.tags.includes(tag))
    )
  }

  // Sort leads
  filteredLeads.sort((a, b) => {
    let aValue, bValue
    
    switch (filters.sortBy) {
      case 'score':
        aValue = a.total_score || 0
        bValue = b.total_score || 0
        break
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        aValue = priorityOrder[a.ai_priority as keyof typeof priorityOrder] || 0
        bValue = priorityOrder[b.ai_priority as keyof typeof priorityOrder] || 0
        break
      case 'value':
        aValue = a.estimated_value || 0
        bValue = b.estimated_value || 0
        break
      default: // created_at
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
    }
    
    if (filters.sortOrder === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })

  // Calculate stats
  const stats = {
    total: filteredLeads.length,
    new: filteredLeads.filter(lead => lead.status === 'new').length,
    contacted: filteredLeads.filter(lead => lead.status === 'contacted').length,
    qualified: filteredLeads.filter(lead => lead.status === 'qualified').length,
    proposal: filteredLeads.filter(lead => lead.status === 'proposal').length,
    negotiation: filteredLeads.filter(lead => lead.status === 'negotiation').length,
    closed_won: filteredLeads.filter(lead => lead.status === 'closed_won').length,
    closed_lost: filteredLeads.filter(lead => lead.status === 'closed_lost').length,
    conversion_rate: 0,
    avg_deal_value: 0,
    pipeline_value: 0
  }

  // Calculate derived stats
  const totalClosed = stats.closed_won + stats.closed_lost
  if (totalClosed > 0) {
    stats.conversion_rate = (stats.closed_won / totalClosed) * 100
  }

  const wonLeads = filteredLeads.filter(lead => lead.status === 'closed_won')
  if (wonLeads.length > 0) {
    stats.avg_deal_value = wonLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0) / wonLeads.length
  }

  const activeLeads = filteredLeads.filter(lead => 
    ['new', 'contacted', 'qualified', 'proposal', 'negotiation'].includes(lead.status)
  )
  stats.pipeline_value = activeLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0)

  return {
    leads: filteredLeads,
    stats
  }
}

// Helper functions for generating realistic data
function generateBusinessName(businessType: string): string {
  const prefixes = ['Elite', 'Premier', 'Advanced', 'Professional', 'Expert', 'Quality', 'Reliable', 'Superior']
  const suffixes = ['Services', 'Solutions', 'Group', 'Company', 'Corp', 'Inc', 'LLC']
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
  
  return `${prefix} ${businessType} ${suffix}`
}

function generateContactName(): string {
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Jessica']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  
  return `${firstName} ${lastName}`
}

function generateEmail(): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'company.com', 'business.net']
  const name = generateContactName().toLowerCase().replace(' ', '.')
  const domain = domains[Math.floor(Math.random() * domains.length)]
  
  return `${name}@${domain}`
}

function generatePhoneNumber(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100
  const exchange = Math.floor(Math.random() * 900) + 100
  const number = Math.floor(Math.random() * 9000) + 1000
  
  return `(${areaCode}) ${exchange}-${number}`
}

function generateStreetName(): string {
  const streets = ['Main St', 'Oak Ave', 'Elm St', 'Pine Rd', 'Cedar Blvd', 'Maple Dr', 'First St', 'Second Ave']
  return streets[Math.floor(Math.random() * streets.length)]
}

function generateDomain(): string {
  const names = ['example', 'business', 'company', 'services', 'solutions', 'group', 'corp', 'inc']
  const name = names[Math.floor(Math.random() * names.length)]
  const extensions = ['com', 'net', 'org', 'biz']
  const ext = extensions[Math.floor(Math.random() * extensions.length)]
  
  return `${name}.${ext}`
}

function generateSampleNote(type: string): string {
  const notes = {
    general: [
      'Initial contact made, seems interested in our services',
      'Follow up scheduled for next week',
      'Customer mentioned budget concerns',
      'Very responsive to emails and calls'
    ],
    call_outcome: [
      'Had a great conversation about their needs',
      'Interested in a quote for next month',
      'Asked about our warranty options',
      'Scheduled a site visit for next Tuesday'
    ],
    email_response: [
      'Responded positively to our proposal',
      'Requested more information about pricing',
      'Interested in setting up a meeting',
      'Asked about our team qualifications'
    ],
    meeting: [
      'Site visit completed successfully',
      'Discussed project timeline and requirements',
      'Showed strong interest in our services',
      'Requested detailed proposal by Friday'
    ],
    follow_up: [
      'Need to follow up on proposal sent last week',
      'Customer asked for references',
      'Waiting for decision on project approval',
      'Scheduled follow-up call for next Monday'
    ],
    research: [
      'Company has been in business for 15+ years',
      'Recently expanded to new location',
      'Has positive reviews on Google and Yelp',
      'Competitor analysis shows opportunity'
    ]
  }
  
  const typeNotes = notes[type as keyof typeof notes] || notes.general
  return typeNotes[Math.floor(Math.random() * typeNotes.length)]
}

function generateActivityDescription(type: string): string {
  const descriptions = {
    created: 'Lead created from new source',
    enriched: 'Lead data enriched with additional information',
    assigned: 'Lead assigned to team member',
    contacted: 'Initial contact made with lead',
    note_added: 'Note added to lead record',
    tag_added: 'Tag added to lead',
    exported: 'Lead exported for external use',
    status_changed: 'Lead status updated'
  }
  
  return descriptions[type as keyof typeof descriptions] || 'Activity recorded'
}

function generateAIInsights(businessType: string, priority: string): string[] {
  const insights = [
    `High-value ${businessType.toLowerCase()} business with growth potential`,
    'Recent online reviews indicate customer satisfaction issues',
    'Company website shows modern technology adoption',
    'Social media presence suggests active customer engagement',
    'Business location in high-traffic commercial area',
    'Owner has been in business for over 10 years',
    'Recent expansion indicates business growth',
    'Competitor analysis shows market opportunity'
  ]
  
  // Return 2-4 random insights
  const count = Math.floor(Math.random() * 3) + 2
  const shuffled = insights.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function generateAIRecommendations(status: string, priority: string): string[] {
  const recommendations = {
    new: [
      'Schedule initial discovery call within 48 hours',
      'Research company background and pain points',
      'Prepare personalized value proposition',
      'Set up automated follow-up sequence'
    ],
    contacted: [
      'Send follow-up email with case studies',
      'Offer free consultation or assessment',
      'Connect on LinkedIn for relationship building',
      'Schedule product demonstration'
    ],
    qualified: [
      'Prepare detailed proposal with pricing',
      'Arrange site visit or technical assessment',
      'Provide customer references and testimonials',
      'Create custom implementation timeline'
    ],
    proposal: [
      'Follow up on proposal within 3 days',
      'Address any questions or concerns',
      'Offer flexible payment terms',
      'Provide additional documentation if needed'
    ],
    negotiation: [
      'Focus on value and ROI benefits',
      'Be flexible with contract terms',
      'Address final objections',
      'Set clear timeline for decision'
    ]
  }
  
  const statusRecs = recommendations[status as keyof typeof recommendations] || recommendations.new
  return statusRecs.slice(0, Math.floor(Math.random() * 3) + 2)
}
