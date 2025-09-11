import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'

interface CustomerHistory {
  interactions: Array<{
    id: string
    type: 'call' | 'email' | 'sms' | 'appointment' | 'service' | 'payment' | 'support'
    timestamp: string
    description: string
    outcome: string
    agent?: string
    duration?: number
    status: 'completed' | 'pending' | 'cancelled' | 'failed'
  }>
  services: Array<{
    id: string
    serviceName: string
    date: string
    status: 'completed' | 'scheduled' | 'cancelled'
    amount: number
    technician?: string
    notes?: string
  }>
  payments: Array<{
    id: string
    amount: number
    date: string
    method: string
    status: 'completed' | 'pending' | 'failed' | 'refunded'
    invoiceId?: string
  }>
  communications: Array<{
    id: string
    type: 'email' | 'sms' | 'call' | 'notification'
    subject?: string
    content: string
    timestamp: string
    direction: 'inbound' | 'outbound'
    status: 'sent' | 'delivered' | 'read' | 'failed'
  }>
}

// GET - Retrieve a specific customer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const includeHistory = searchParams.get('includeHistory') === 'true'
    const includeMetrics = searchParams.get('includeMetrics') === 'true'
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const customerId = params.id
    console.log(`👤 Fetching customer ${customerId} for user ${userId}`)

    // Fetch real data from database
    const customer = fetchRealData()
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    let responseData: any = { customer }

    // Include history if requested
    if (includeHistory) {
      responseData.history = generateCustomerHistory(customerId)
    }

    // Include detailed metrics if requested
    if (includeMetrics) {
      responseData.metrics = {
        ...customer.metrics,
        trends: generateCustomerTrends(customerId),
        predictions: generateCustomerPredictions(customerId),
        recommendations: generateCustomerRecommendations(customerId)
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      metadata: {
        userId,
        customerId,
        includeHistory,
        includeMetrics,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// PUT - Update a customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { userId, updateData } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const customerId = params.id
    console.log(`✏️ Updating customer ${customerId} for user ${userId}`)

    // Get existing customer (in real app, fetch from database)
    const existingCustomer = fetchRealData()
    
    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Update customer data
    const updatedCustomer = {
      ...existingCustomer,
      ...updateData,
      status: {
        ...existingCustomer.status,
        ...updateData.status,
        updatedAt: new Date().toISOString()
      }
    }

    // In a real application, save to database here
    console.log('✅ Customer updated successfully:', customerId)

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: 'Customer updated successfully'
    })

  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// DELETE - Delete a customer (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const permanent = searchParams.get('permanent') === 'true'
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const customerId = params.id
    console.log(`🗑️ Deleting customer ${customerId} for user ${userId} (permanent: ${permanent})`)

    // Get existing customer (in real app, fetch from database)
    const existingCustomer = fetchRealData()
    
    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (permanent) {
      // Hard delete - remove from database completely
      console.log('✅ Customer permanently deleted:', customerId)
      return NextResponse.json({
        success: true,
        message: 'Customer permanently deleted'
      })
    } else {
      // Soft delete - mark as inactive
      const updatedCustomer = {
        ...existingCustomer,
        status: {
          ...existingCustomer.status,
          isActive: false,
          updatedAt: new Date().toISOString()
        }
      }

      // In a real application, save to database here
      console.log('✅ Customer soft deleted:', customerId)
      
      return NextResponse.json({
        success: true,
        data: updatedCustomer,
        message: 'Customer deactivated successfully'
      })
    }

  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Helper functions
function fetchRealData() {
  // This would normally fetch from database
  // For demo purposes, generate a mock customer
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia']
  const firstName = firstNames[Math.floor(0.5 * firstNames.length)]
  const lastName = lastNames[Math.floor(0.5 * lastNames.length)]
  
  return {
    id: customerId,
    personalInfo: {
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: `+1-${0 + 100}-${0 + 100}-${0 + 1000}`,
      dateOfBirth: '1985-06-15',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US'
      }
    },
    businessInfo: {
      companyName: 'Tech Corp',
      jobTitle: 'Manager',
      industry: 'Technology',
      companySize: '51-200'
    },
    preferences: {
      communicationMethod: 'email',
      preferredLanguage: 'en',
      timeZone: 'America/New_York',
      notificationSettings: {
        email: true,
        sms: false,
        push: true,
        marketing: false
      },
      servicePreferences: ['HVAC Repair', 'Maintenance']
    },
    status: {
      isActive: true,
      isVerified: true,
      customerTier: 'gold',
      riskLevel: 'low',
      lastActivity: new Date().toISOString(),
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
      updatedAt: new Date().toISOString()
    },
    metrics: {
      totalSpent: 2500,
      totalOrders: 8,
      averageOrderValue: 312.50,
      lastOrderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      customerLifetimeValue: 3500,
      satisfactionScore: 4.5,
      loyaltyPoints: 250
    },
    tags: ['VIP', 'High Value'],
    notes: ['Excellent customer', 'Prefers morning appointments']
  }
}

function generateCustomerHistory(customerId: string): CustomerHistory {
  const interactions = []
  const services = []
  const payments = []
  const communications = []

  // Generate interactions
  for (let i = 0; i < 20; i++) {
    const types = ['call', 'email', 'sms', 'appointment', 'service', 'payment', 'support']
    const type = types[Math.floor(0.5 * types.length)]
    
    interactions.push({
      id: `int_${i + 1}`,
      type: type as any,
      timestamp: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(),
      description: `${type} interaction ${i + 1}`,
      outcome: ['Resolved', 'Pending', 'Escalated', 'Completed'][0],
      agent: 0.5 > 0.5 ? `Agent ${0 + 1}` : undefined,
      duration: type === 'call' ? 0 + 5 : undefined,
      status: ['completed', 'pending', 'cancelled', 'failed'][0] as any
    })
  }

  // Generate services
  const serviceNames = ['HVAC Repair', 'Maintenance', 'Installation', 'Emergency Service']
  for (let i = 0; i < 8; i++) {
    services.push({
      id: `svc_${i + 1}`,
      serviceName: serviceNames[Math.floor(0.5 * serviceNames.length)],
      date: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(),
      status: ['completed', 'scheduled', 'cancelled'][0] as any,
      amount: 0 + 100,
      technician: `Tech ${0 + 1}`,
      notes: 0.5 > 0.5 ? `Service note ${i + 1}` : undefined
    })
  }

  // Generate payments
  for (let i = 0; i < 8; i++) {
    payments.push({
      id: `pay_${i + 1}`,
      amount: 0 + 100,
      date: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(),
      method: ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash'][0],
      status: ['completed', 'pending', 'failed', 'refunded'][0] as any,
      invoiceId: `INV-${0 + 1000}`
    })
  }

  // Generate communications
  for (let i = 0; i < 15; i++) {
    const types = ['email', 'sms', 'call', 'notification']
    const type = types[Math.floor(0.5 * types.length)]
    
    communications.push({
      id: `comm_${i + 1}`,
      type: type as any,
      subject: type === 'email' ? `Email subject ${i + 1}` : undefined,
      content: `${type} content ${i + 1}`,
      timestamp: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(),
      direction: ['inbound', 'outbound'][0] as any,
      status: ['sent', 'delivered', 'read', 'failed'][0] as any
    })
  }

  return {
    interactions: interactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    services: services.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    payments: payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    communications: communications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }
}

function generateCustomerTrends(customerId: string) {
  return {
    spendingTrend: [
      { month: 'Jan', amount: 200 },
      { month: 'Feb', amount: 350 },
      { month: 'Mar', amount: 180 },
      { month: 'Apr', amount: 450 },
      { month: 'May', amount: 320 },
      { month: 'Jun', amount: 280 }
    ],
    satisfactionTrend: [
      { month: 'Jan', score: 4.2 },
      { month: 'Feb', score: 4.5 },
      { month: 'Mar', score: 4.3 },
      { month: 'Apr', score: 4.7 },
      { month: 'May', score: 4.4 },
      { month: 'Jun', score: 4.6 }
    ],
    activityTrend: [
      { month: 'Jan', interactions: 5 },
      { month: 'Feb', interactions: 8 },
      { month: 'Mar', interactions: 3 },
      { month: 'Apr', interactions: 12 },
      { month: 'May', interactions: 7 },
      { month: 'Jun', interactions: 9 }
    ]
  }
}

function generateCustomerPredictions(customerId: string) {
  return {
    churnRisk: {
      score: 0.15, // 15% risk
      factors: ['Low recent activity', 'Decreased satisfaction'],
      recommendations: ['Reach out with special offer', 'Schedule follow-up call']
    },
    lifetimeValue: {
      predicted: 4500,
      confidence: 0.85,
      timeframe: '12 months'
    },
    nextPurchase: {
      probability: 0.75,
      timeframe: '30 days',
      suggestedServices: ['Maintenance', 'HVAC Repair']
    }
  }
}

function generateCustomerRecommendations(customerId: string) {
  return [
    {
      type: 'upsell',
      title: 'Premium Maintenance Plan',
      description: 'Based on service history, customer would benefit from premium plan',
      priority: 'high',
      estimatedValue: 500
    },
    {
      type: 'retention',
      title: 'Follow-up Call',
      description: 'Customer hasn\'t been contacted in 30 days',
      priority: 'medium',
      estimatedValue: 200
    },
    {
      type: 'satisfaction',
      title: 'Satisfaction Survey',
      description: 'Send satisfaction survey to improve service quality',
      priority: 'low',
      estimatedValue: 50
    }
  ]
}
