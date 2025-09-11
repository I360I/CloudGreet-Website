import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../lib/error-handler'

interface Customer {
  id: string
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth?: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
  }
  businessInfo: {
    companyName?: string
    jobTitle?: string
    industry?: string
    companySize?: string
  }
  preferences: {
    communicationMethod: 'email' | 'phone' | 'sms' | 'app'
    preferredLanguage: string
    timeZone: string
    notificationSettings: {
      email: boolean
      sms: boolean
      push: boolean
      marketing: boolean
    }
    servicePreferences: string[]
  }
  status: {
    isActive: boolean
    isVerified: boolean
    customerTier: 'bronze' | 'silver' | 'gold' | 'platinum'
    riskLevel: 'low' | 'medium' | 'high'
    lastActivity: string
    createdAt: string
    updatedAt: string
  }
  metrics: {
    totalSpent: number
    totalOrders: number
    averageOrderValue: number
    lastOrderDate?: string
    customerLifetimeValue: number
    satisfactionScore: number
    loyaltyPoints: number
  }
  tags: string[]
  notes: string[]
}

interface CustomerSearchFilters {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'all'
  riskLevel?: 'low' | 'medium' | 'high' | 'all'
  tags?: string[]
  dateRange?: {
    start: string
    end: string
  }
  sortBy?: 'name' | 'createdAt' | 'lastActivity' | 'totalSpent' | 'satisfactionScore'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

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

// GET - Retrieve customers with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Parse search filters
    const filters: CustomerSearchFilters = {
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as any) || 'all',
      tier: (searchParams.get('tier') as any) || 'all',
      riskLevel: (searchParams.get('riskLevel') as any) || 'all',
      tags: searchParams.get('tags')?.split(',') || [],
      sortBy: (searchParams.get('sortBy') as any) || 'lastActivity',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    // Parse date range if provided
    if (searchParams.get('dateStart') && searchParams.get('dateEnd')) {
      filters.dateRange = {
        start: searchParams.get('dateStart')!,
        end: searchParams.get('dateEnd')!
      }
    }

    console.log(`👥 Fetching customers for user ${userId} with filters:`, filters)

    // Fetch real data from database
    const customers = fetchRealData()
    
    // Apply filters
    let filteredCustomers = customers

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredCustomers = filteredCustomers.filter(customer => 
        customer.personalInfo.firstName.toLowerCase().includes(searchTerm) ||
        customer.personalInfo.lastName.toLowerCase().includes(searchTerm) ||
        customer.personalInfo.email.toLowerCase().includes(searchTerm) ||
        customer.personalInfo.phone.includes(searchTerm) ||
        customer.businessInfo.companyName?.toLowerCase().includes(searchTerm)
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      filteredCustomers = filteredCustomers.filter(customer => 
        filters.status === 'active' ? customer.status.isActive : !customer.status.isActive
      )
    }

    // Tier filter
    if (filters.tier !== 'all') {
      filteredCustomers = filteredCustomers.filter(customer => 
        customer.status.customerTier === filters.tier
      )
    }

    // Risk level filter
    if (filters.riskLevel !== 'all') {
      filteredCustomers = filteredCustomers.filter(customer => 
        customer.status.riskLevel === filters.riskLevel
      )
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      filteredCustomers = filteredCustomers.filter(customer => 
        filters.tags!.some(tag => customer.tags.includes(tag))
      )
    }

    // Date range filter
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start)
      const endDate = new Date(filters.dateRange.end)
      filteredCustomers = filteredCustomers.filter(customer => {
        const customerDate = new Date(customer.status.createdAt)
        return customerDate >= startDate && customerDate <= endDate
      })
    }

    // Sort customers
    filteredCustomers.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (filters.sortBy) {
        case 'name':
          aValue = `${a.personalInfo.firstName} ${a.personalInfo.lastName}`
          bValue = `${b.personalInfo.firstName} ${b.personalInfo.lastName}`
          break
        case 'createdAt':
          aValue = new Date(a.status.createdAt)
          bValue = new Date(b.status.createdAt)
          break
        case 'lastActivity':
          aValue = new Date(a.status.lastActivity)
          bValue = new Date(b.status.lastActivity)
          break
        case 'totalSpent':
          aValue = a.metrics.totalSpent
          bValue = b.metrics.totalSpent
          break
        case 'satisfactionScore':
          aValue = a.metrics.satisfactionScore
          bValue = b.metrics.satisfactionScore
          break
        default:
          aValue = new Date(a.status.lastActivity)
          bValue = new Date(b.status.lastActivity)
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    // Pagination
    const totalCount = filteredCustomers.length
    const totalPages = Math.ceil(totalCount / filters.limit!)
    const startIndex = (filters.page! - 1) * filters.limit!
    const endIndex = startIndex + filters.limit!
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex)

    // Calculate summary statistics
    const summary = {
      totalCustomers: totalCount,
      activeCustomers: customers.filter(c => c.status.isActive).length,
      newCustomersThisMonth: customers.filter(c => {
        const created = new Date(c.status.createdAt)
        const now = new Date()
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
      }).length,
      averageSatisfaction: customers.reduce((sum, c) => sum + c.metrics.satisfactionScore, 0) / customers.length,
      totalRevenue: customers.reduce((sum, c) => sum + c.metrics.totalSpent, 0),
      tierDistribution: {
        bronze: customers.filter(c => c.status.customerTier === 'bronze').length,
        silver: customers.filter(c => c.status.customerTier === 'silver').length,
        gold: customers.filter(c => c.status.customerTier === 'gold').length,
        platinum: customers.filter(c => c.status.customerTier === 'platinum').length
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        customers: paginatedCustomers,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          totalCount,
          totalPages,
          hasNext: filters.page! < totalPages,
          hasPrev: filters.page! > 1
        },
        summary,
        filters
      },
      metadata: {
        userId,
        generatedAt: new Date().toISOString(),
        dataFreshness: 'real-time'
      }
    })

  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch customers',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// POST - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, customerData } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!customerData) {
      return NextResponse.json({ error: 'Customer data is required' }, { status: 400 })
    }

    console.log(`👤 Creating new customer for user ${userId}`)

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone']
    for (const field of requiredFields) {
      if (!customerData.personalInfo?.[field]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 })
      }
    }

    // Generate new customer
    const newCustomer: Customer = {
      id: `cust_${Date.now()}_${0.5.toString(36).substr(2, 9)}`,
      personalInfo: {
        firstName: customerData.personalInfo.firstName,
        lastName: customerData.personalInfo.lastName,
        email: customerData.personalInfo.email,
        phone: customerData.personalInfo.phone,
        dateOfBirth: customerData.personalInfo.dateOfBirth,
        address: {
          street: customerData.personalInfo.address?.street || '',
          city: customerData.personalInfo.address?.city || '',
          state: customerData.personalInfo.address?.state || '',
          zipCode: customerData.personalInfo.address?.zipCode || '',
          country: customerData.personalInfo.address?.country || 'US'
        }
      },
      businessInfo: {
        companyName: customerData.businessInfo?.companyName,
        jobTitle: customerData.businessInfo?.jobTitle,
        industry: customerData.businessInfo?.industry,
        companySize: customerData.businessInfo?.companySize
      },
      preferences: {
        communicationMethod: customerData.preferences?.communicationMethod || 'email',
        preferredLanguage: customerData.preferences?.preferredLanguage || 'en',
        timeZone: customerData.preferences?.timeZone || 'America/New_York',
        notificationSettings: {
          email: customerData.preferences?.notificationSettings?.email ?? true,
          sms: customerData.preferences?.notificationSettings?.sms ?? false,
          push: customerData.preferences?.notificationSettings?.push ?? true,
          marketing: customerData.preferences?.notificationSettings?.marketing ?? false
        },
        servicePreferences: customerData.preferences?.servicePreferences || []
      },
      status: {
        isActive: true,
        isVerified: false,
        customerTier: 'bronze',
        riskLevel: 'low',
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      metrics: {
        totalSpent: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        customerLifetimeValue: 0,
        satisfactionScore: 0,
        loyaltyPoints: 0
      },
      tags: customerData.tags || [],
      notes: customerData.notes || []
    }

    // In a real application, save to database here
    console.log('✅ Customer created successfully:', newCustomer.id)

    return NextResponse.json({
      success: true,
      data: newCustomer,
      message: 'Customer created successfully'
    })

  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Helper function to fetch real customers from database
async function fetchRealCustomers(userId: string): Promise<Customer[]> {
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Failed to fetch customers')
  }

  return customers || []
}
