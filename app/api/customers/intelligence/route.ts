import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const customerId = searchParams.get('customerId')

    validateUserId(userId)

    if (customerId) {
      // Get specific customer profile
      const profile = await getCustomerProfile(userId, customerId)
      return createSuccessResponse({ profile })
    } else {
      // Get customer intelligence overview
      const intelligence = await getCustomerIntelligence(userId)
      return createSuccessResponse({ intelligence })
    }

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, customerId, action, data } = body

    validateUserId(userId)

    if (!customerId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Customer ID and action are required'
      }, { status: 400 })
    }

    switch (action) {
      case 'update_profile':
        const updatedProfile = await updateCustomerProfile(userId, customerId, data)
        return createSuccessResponse({ profile: updatedProfile })

      case 'add_interaction':
        const interaction = await addCustomerInteraction(userId, customerId, data)
        return createSuccessResponse({ interaction })

      case 'update_preferences':
        const preferences = await updateCustomerPreferences(userId, customerId, data)
        return createSuccessResponse({ preferences })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

  } catch (error) {
    return handleApiError(error)
  }
}

async function getCustomerProfile(userId: string, customerId: string) {
  // Fetch real customer profile from database
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('user_id', userId)
    .single()

  if (customerError) {
    throw new Error('Customer not found')
  }

  // Fetch customer interactions
  const { data: interactions, error: interactionsError } = await supabase
    .from('customer_interactions')
    .select('*')
    .eq('customer_id', customerId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch service history
  const { data: services, error: servicesError } = await supabase
    .from('appointments')
    .select('*')
    .eq('customer_id', customerId)
    .eq('user_id', userId)
    .order('start_time', { ascending: false })

  // Fetch preferences
  const { data: preferences, error: preferencesError } = await supabase
    .from('customer_preferences')
    .select('*')
    .eq('customer_id', customerId)
    .eq('user_id', userId)
    .single()

  const totalSpent = services?.reduce((sum, service) => sum + (service.amount || 0), 0) || 0
  const averageServiceValue = services?.length ? totalSpent / services.length : 0

  return {
    customerId: customer.id,
    basicInfo: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      customerSince: customer.created_at,
      lastContact: interactions?.[0]?.created_at || customer.updated_at
    },
    demographics: {
      age: customer.age_range || 'Unknown',
      income: customer.income_range || 'Unknown',
      household: customer.household_type || 'Unknown',
      location: customer.location_type || 'Unknown',
      homeType: customer.home_type || 'Unknown'
    },
    serviceHistory: {
      totalServices: services?.length || 0,
      totalSpent: totalSpent,
      averageServiceValue: averageServiceValue,
      lastService: services?.[0]?.service_type || 'None',
      lastServiceDate: services?.[0]?.start_time || null,
      services: services?.map(service => ({
        id: service.id,
        type: service.service_type,
        date: service.start_time,
        amount: service.amount,
        status: service.status
      })) || []
    },
    interactions: interactions?.map(interaction => ({
      id: interaction.id,
      type: interaction.interaction_type,
      date: interaction.created_at,
      notes: interaction.notes,
      outcome: interaction.outcome
    })) || [],
    preferences: preferences || {
      communicationMethod: 'phone',
      preferredTime: 'morning',
      specialInstructions: '',
      marketingOptIn: false
    },
    insights: {
      customerValue: totalSpent > 1000 ? 'high' : totalSpent > 500 ? 'medium' : 'low',
      loyaltyScore: calculateLoyaltyScore(services?.length || 0, totalSpent),
      riskLevel: calculateRiskLevel(services?.length || 0, interactions?.length || 0),
      nextBestAction: determineNextBestAction(services?.length || 0, totalSpent, preferences)
    }
  }
}

async function getCustomerIntelligence(userId: string) {
  // Fetch all customers for the user
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)

  if (customersError) {
    throw new Error('Failed to fetch customers')
  }

  // Fetch all appointments for revenue calculation
  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)

  if (appointmentsError) {
    throw new Error('Failed to fetch appointments')
  }

  const totalRevenue = appointments?.reduce((sum, apt) => sum + (apt.amount || 0), 0) || 0
  const averageOrderValue = appointments?.length ? totalRevenue / appointments.length : 0

  // Calculate customer segments
  const highValueCustomers = customers?.filter(customer => {
    const customerAppointments = appointments?.filter(apt => apt.customer_id === customer.id) || []
    const customerRevenue = customerAppointments.reduce((sum, apt) => sum + (apt.amount || 0), 0)
    return customerRevenue > 1000
  }).length || 0

  const mediumValueCustomers = customers?.filter(customer => {
    const customerAppointments = appointments?.filter(apt => apt.customer_id === customer.id) || []
    const customerRevenue = customerAppointments.reduce((sum, apt) => sum + (apt.amount || 0), 0)
    return customerRevenue > 500 && customerRevenue <= 1000
  }).length || 0

  const lowValueCustomers = customers?.filter(customer => {
    const customerAppointments = appointments?.filter(apt => apt.customer_id === customer.id) || []
    const customerRevenue = customerAppointments.reduce((sum, apt) => sum + (apt.amount || 0), 0)
    return customerRevenue <= 500
  }).length || 0

  return {
    overview: {
      totalCustomers: customers?.length || 0,
      totalRevenue: totalRevenue,
      averageOrderValue: averageOrderValue,
      customerRetentionRate: calculateRetentionRate(customers || [], appointments || [])
    },
    segments: {
      highValue: highValueCustomers,
      mediumValue: mediumValueCustomers,
      lowValue: lowValueCustomers
    },
    trends: {
      newCustomersThisMonth: customers?.filter(customer => {
        const createdDate = new Date(customer.created_at)
        const now = new Date()
        return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear()
      }).length || 0,
      revenueGrowth: calculateRevenueGrowth(appointments || []),
      topServices: getTopServices(appointments || [])
    }
  }
}

async function updateCustomerProfile(userId: string, customerId: string, data: any) {
  const { error } = await supabase
    .from('customers')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', customerId)
    .eq('user_id', userId)

  if (error) {
    throw new Error('Failed to update customer profile')
  }

  return await getCustomerProfile(userId, customerId)
}

async function addCustomerInteraction(userId: string, customerId: string, data: any) {
  const { data: interaction, error } = await supabase
    .from('customer_interactions')
    .insert({
      customer_id: customerId,
      user_id: userId,
      interaction_type: data.type,
      notes: data.notes,
      outcome: data.outcome,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to add customer interaction')
  }

  return interaction
}

async function updateCustomerPreferences(userId: string, customerId: string, data: any) {
  const { data: preferences, error } = await supabase
    .from('customer_preferences')
    .upsert({
      customer_id: customerId,
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to update customer preferences')
  }

  return preferences
}

// Helper functions
function calculateLoyaltyScore(serviceCount: number, totalSpent: number): number {
  const serviceScore = Math.min(serviceCount * 10, 50)
  const spendingScore = Math.min(totalSpent / 20, 50)
  return Math.round(serviceScore + spendingScore)
}

function calculateRiskLevel(serviceCount: number, interactionCount: number): string {
  if (serviceCount === 0) return 'high'
  if (serviceCount < 3 && interactionCount < 2) return 'medium'
  return 'low'
}

function determineNextBestAction(serviceCount: number, totalSpent: number, preferences: any): string {
  if (serviceCount === 0) return 'schedule_consultation'
  if (totalSpent > 1000) return 'offer_premium_service'
  if (preferences?.marketingOptIn) return 'send_promotional_offer'
  return 'schedule_follow_up'
}

function calculateRetentionRate(customers: any[], appointments: any[]): number {
  const customersWithMultipleServices = customers.filter(customer => {
    const customerAppointments = appointments.filter(apt => apt.customer_id === customer.id)
    return customerAppointments.length > 1
  }).length

  return customers.length > 0 ? (customersWithMultipleServices / customers.length) * 100 : 0
}

function calculateRevenueGrowth(appointments: any[]): number {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const lastMonthRevenue = appointments
    .filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= lastMonth && aptDate < thisMonth
    })
    .reduce((sum, apt) => sum + (apt.amount || 0), 0)

  const thisMonthRevenue = appointments
    .filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= thisMonth
    })
    .reduce((sum, apt) => sum + (apt.amount || 0), 0)

  return lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0
}

function getTopServices(appointments: any[]): Array<{ name: string; count: number }> {
  const serviceCounts: { [key: string]: number } = {}
  
  appointments.forEach(apt => {
    const serviceType = apt.service_type || 'Unknown'
    serviceCounts[serviceType] = (serviceCounts[serviceType] || 0) + 1
  })

  return Object.entries(serviceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}