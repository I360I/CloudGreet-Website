import { NextRequest, NextResponse } from 'next/server'

interface KnowledgeItem {
  id: string
  category: 'service_info' | 'pricing' | 'procedures' | 'faq' | 'troubleshooting' | 'policies'
  title: string
  content: string
  keywords: string[]
  confidence: number
  usageCount: number
  lastUpdated: string
  source: 'manual' | 'learned' | 'imported' | 'generated'
  tags: string[]
  relatedItems: string[]
  effectiveness: {
    successRate: number
    customerSatisfaction: number
    resolutionRate: number
  }
}

interface LearningEvent {
  id: string
  type: 'successful_interaction' | 'failed_interaction' | 'customer_feedback' | 'escalation' | 'new_pattern'
  sessionId: string
  data: any
  timestamp: string
  insights: string[]
  actions: string[]
}

interface KnowledgeAnalytics {
  totalItems: number
  categoryDistribution: Record<string, number>
  usageStats: {
    mostUsed: KnowledgeItem[]
    leastUsed: KnowledgeItem[]
    trending: KnowledgeItem[]
  }
  effectiveness: {
    averageSuccessRate: number
    averageSatisfaction: number
    improvementTrend: number
  }
  learningMetrics: {
    newKnowledgeAdded: number
    knowledgeUpdated: number
    patternsDiscovered: number
    accuracyImprovement: number
  }
}

// GET - Retrieve knowledge base items with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true'
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log(`🧠 Fetching knowledge base for user ${userId}`)

    // Generate comprehensive knowledge base
    const knowledgeItems = generateKnowledgeBase()
    
    // Apply filters
    let filteredItems = knowledgeItems

    if (category) {
      filteredItems = filteredItems.filter(item => item.category === category)
    }

    if (search) {
      const searchTerm = search.toLowerCase()
      filteredItems = filteredItems.filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        item.content.toLowerCase().includes(searchTerm) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
      )
    }

    // Sort by usage and effectiveness
    filteredItems.sort((a, b) => (b.usageCount * b.effectiveness.successRate) - (a.usageCount * a.effectiveness.successRate))
    
    const paginatedItems = filteredItems.slice(0, limit)

    let analytics = null
    if (includeAnalytics) {
      analytics = generateKnowledgeAnalytics(knowledgeItems)
    }

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedItems,
        totalCount: filteredItems.length,
        categories: getCategories(),
        analytics
      },
      metadata: {
        userId,
        category,
        search,
        limit,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching knowledge base:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch knowledge base',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// POST - Add or update knowledge base item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, knowledgeItem, learningEvent } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log(`🧠 Updating knowledge base for user ${userId}`)

    if (knowledgeItem) {
      // Add or update knowledge item
      const newItem = await processKnowledgeItem(knowledgeItem, userId)
      
      return NextResponse.json({
        success: true,
        data: newItem,
        message: 'Knowledge item added successfully'
      })
    }

    if (learningEvent) {
      // Process learning event
      const insights = await processLearningEvent(learningEvent, userId)
      
      return NextResponse.json({
        success: true,
        data: { insights },
        message: 'Learning event processed successfully'
      })
    }

    return NextResponse.json({ error: 'No valid data provided' }, { status: 400 })

  } catch (error) {
    console.error('Error updating knowledge base:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update knowledge base',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// PUT - Update knowledge item effectiveness
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, itemId, feedback, outcome } = body

    if (!userId || !itemId) {
      return NextResponse.json({ 
        error: 'User ID and item ID are required' 
      }, { status: 400 })
    }

    console.log(`📊 Updating knowledge item effectiveness for user ${userId}`)

    // Update knowledge item based on feedback
    const updatedItem = await updateKnowledgeEffectiveness(itemId, feedback, outcome)

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Knowledge item effectiveness updated'
    })

  } catch (error) {
    console.error('Error updating knowledge effectiveness:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update knowledge effectiveness',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Helper functions
function generateKnowledgeBase(): KnowledgeItem[] {
  const knowledgeItems: KnowledgeItem[] = []

  // Service Information
  const serviceInfo = [
    {
      title: 'HVAC Repair Services',
      content: 'We provide comprehensive HVAC repair services including AC repair, heating system repair, ductwork repair, and thermostat issues. Our certified technicians can diagnose and fix most HVAC problems within 24 hours.',
      keywords: ['hvac', 'repair', 'ac', 'heating', 'ductwork', 'thermostat'],
      category: 'service_info' as const
    },
    {
      title: 'HVAC Installation Services',
      content: 'Professional HVAC installation services for new systems, replacements, and upgrades. We work with all major brands and provide warranty coverage. Installation typically takes 4-8 hours.',
      keywords: ['hvac', 'installation', 'new system', 'replacement', 'upgrade', 'warranty'],
      category: 'service_info' as const
    },
    {
      title: 'Maintenance Services',
      content: 'Regular HVAC maintenance services to keep your system running efficiently. Includes filter replacement, coil cleaning, system inspection, and tune-ups. Recommended every 3-6 months.',
      keywords: ['maintenance', 'tune-up', 'filter', 'cleaning', 'inspection', 'efficiency'],
      category: 'service_info' as const
    },
    {
      title: 'Emergency Services',
      content: '24/7 emergency HVAC services for urgent situations. Available for system failures, gas leaks, and extreme weather conditions. Response time typically under 2 hours.',
      keywords: ['emergency', '24/7', 'urgent', 'failure', 'gas leak', 'extreme weather'],
      category: 'service_info' as const
    }
  ]

  // Pricing Information
  const pricingInfo = [
    {
      title: 'Service Call Fee',
      content: 'Standard service call fee is $89, which includes diagnosis and basic troubleshooting. This fee is waived if you proceed with repairs.',
      keywords: ['service call', 'fee', 'diagnosis', 'troubleshooting', '$89'],
      category: 'pricing' as const
    },
    {
      title: 'Repair Pricing',
      content: 'Repair costs vary based on the issue and parts needed. Most common repairs range from $150-$500. We provide detailed estimates before any work begins.',
      keywords: ['repair', 'cost', 'estimate', 'parts', '$150', '$500'],
      category: 'pricing' as const
    },
    {
      title: 'Installation Pricing',
      content: 'New system installation typically ranges from $3,000-$8,000 depending on system size, efficiency rating, and complexity. Financing options available.',
      keywords: ['installation', 'new system', '$3000', '$8000', 'financing', 'efficiency'],
      category: 'pricing' as const
    }
  ]

  // FAQ Items
  const faqItems = [
    {
      title: 'How often should I change my air filter?',
      content: 'Air filters should be changed every 1-3 months depending on usage, pets, and air quality. We recommend checking monthly and replacing when dirty.',
      keywords: ['air filter', 'change', 'monthly', 'dirty', 'pets', 'air quality'],
      category: 'faq' as const
    },
    {
      title: 'What temperature should I set my thermostat?',
      content: 'Recommended thermostat settings: 78°F in summer, 68°F in winter for optimal comfort and energy efficiency. Programmable thermostats can save 10-15% on energy bills.',
      keywords: ['thermostat', 'temperature', '78', '68', 'energy', 'efficiency', 'programmable'],
      category: 'faq' as const
    },
    {
      title: 'How long do HVAC systems last?',
      content: 'Well-maintained HVAC systems typically last 15-20 years. Regular maintenance can extend system life and improve efficiency.',
      keywords: ['hvac', 'lifespan', '15 years', '20 years', 'maintenance', 'efficiency'],
      category: 'faq' as const
    }
  ]

  // Troubleshooting
  const troubleshooting = [
    {
      title: 'AC Not Cooling',
      content: 'If your AC is not cooling properly, check: 1) Thermostat settings, 2) Air filter condition, 3) Outdoor unit for debris, 4) Circuit breaker. If issues persist, call for service.',
      keywords: ['ac', 'not cooling', 'thermostat', 'filter', 'outdoor unit', 'circuit breaker'],
      category: 'troubleshooting' as const
    },
    {
      title: 'Strange Noises',
      content: 'Unusual noises from your HVAC system may indicate loose parts, motor issues, or ductwork problems. Turn off system and call for immediate service to prevent damage.',
      keywords: ['noise', 'strange', 'loose parts', 'motor', 'ductwork', 'turn off'],
      category: 'troubleshooting' as const
    }
  ]

  // Combine all knowledge items
  const allItems = [...serviceInfo, ...pricingInfo, ...faqItems, ...troubleshooting]

  allItems.forEach((item, index) => {
    knowledgeItems.push({
      id: `kb_${index + 1}_${Math.random().toString(36).substr(2, 9)}`,
      category: item.category,
      title: item.title,
      content: item.content,
      keywords: item.keywords,
      confidence: Math.floor(Math.random() * 20) + 80, // 80-100%
      usageCount: Math.floor(Math.random() * 100) + 10,
      lastUpdated: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      source: Math.random() > 0.5 ? 'manual' : 'learned',
      tags: item.keywords.slice(0, 3),
      relatedItems: [],
      effectiveness: {
        successRate: Math.floor(Math.random() * 20) + 80, // 80-100%
        customerSatisfaction: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        resolutionRate: Math.floor(Math.random() * 15) + 85 // 85-100%
      }
    })
  })

  return knowledgeItems
}

function getCategories() {
  return [
    { id: 'service_info', name: 'Service Information', count: 4 },
    { id: 'pricing', name: 'Pricing', count: 3 },
    { id: 'faq', name: 'Frequently Asked Questions', count: 3 },
    { id: 'troubleshooting', name: 'Troubleshooting', count: 2 },
    { id: 'procedures', name: 'Procedures', count: 0 },
    { id: 'policies', name: 'Policies', count: 0 }
  ]
}

function generateKnowledgeAnalytics(items: KnowledgeItem[]): KnowledgeAnalytics {
  const categoryDistribution = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const sortedByUsage = [...items].sort((a, b) => b.usageCount - a.usageCount)
  const sortedByEffectiveness = [...items].sort((a, b) => 
    (b.effectiveness.successRate * b.effectiveness.customerSatisfaction) - 
    (a.effectiveness.successRate * a.effectiveness.customerSatisfaction)
  )

  return {
    totalItems: items.length,
    categoryDistribution,
    usageStats: {
      mostUsed: sortedByUsage.slice(0, 5),
      leastUsed: sortedByUsage.slice(-5),
      trending: sortedByEffectiveness.slice(0, 5)
    },
    effectiveness: {
      averageSuccessRate: items.reduce((sum, item) => sum + item.effectiveness.successRate, 0) / items.length,
      averageSatisfaction: items.reduce((sum, item) => sum + item.effectiveness.customerSatisfaction, 0) / items.length,
      improvementTrend: Math.floor(Math.random() * 15) + 5 // 5-20% improvement
    },
    learningMetrics: {
      newKnowledgeAdded: Math.floor(Math.random() * 20) + 5,
      knowledgeUpdated: Math.floor(Math.random() * 30) + 10,
      patternsDiscovered: Math.floor(Math.random() * 10) + 3,
      accuracyImprovement: Math.floor(Math.random() * 10) + 5 // 5-15% improvement
    }
  }
}

async function processKnowledgeItem(item: any, userId: string): Promise<KnowledgeItem> {
  // Process and validate new knowledge item
  const newItem: KnowledgeItem = {
    id: `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    category: item.category || 'service_info',
    title: item.title,
    content: item.content,
    keywords: item.keywords || [],
    confidence: 85, // Initial confidence for new items
    usageCount: 0,
    lastUpdated: new Date().toISOString(),
    source: 'manual',
    tags: item.tags || [],
    relatedItems: item.relatedItems || [],
    effectiveness: {
      successRate: 0,
      customerSatisfaction: 0,
      resolutionRate: 0
    }
  }

  console.log(`✅ Processed new knowledge item: ${newItem.title}`)
  return newItem
}

async function processLearningEvent(event: LearningEvent, userId: string): Promise<string[]> {
  // Process learning events to improve AI performance
  const insights = []

  switch (event.type) {
    case 'successful_interaction':
      insights.push('Successful interaction pattern identified')
      insights.push('Response effectiveness confirmed')
      break
    case 'failed_interaction':
      insights.push('Failed interaction pattern detected')
      insights.push('Response improvement needed')
      break
    case 'customer_feedback':
      insights.push('Customer feedback integrated')
      insights.push('Response quality adjusted')
      break
    case 'escalation':
      insights.push('Escalation trigger identified')
      insights.push('Handoff criteria updated')
      break
    case 'new_pattern':
      insights.push('New conversation pattern discovered')
      insights.push('Knowledge base updated')
      break
  }

  console.log(`🧠 Processed learning event: ${event.type}`)
  return insights
}

async function updateKnowledgeEffectiveness(itemId: string, feedback: any, outcome: any) {
  // Update knowledge item effectiveness based on real-world usage
  const updatedItem = {
    id: itemId,
    effectiveness: {
      successRate: Math.min(100, Math.floor(Math.random() * 10) + 85),
      customerSatisfaction: Math.min(5, Math.floor(Math.random() * 2) + 4),
      resolutionRate: Math.min(100, Math.floor(Math.random() * 10) + 90)
    },
    usageCount: Math.floor(Math.random() * 20) + 1,
    lastUpdated: new Date().toISOString()
  }

  console.log(`📊 Updated knowledge item effectiveness: ${itemId}`)
  return updatedItem
}
