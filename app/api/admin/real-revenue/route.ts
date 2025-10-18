import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  console.log('🚀 REAL REVENUE API CALLED')
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No auth header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify JWT token instead of raw password
    const { verifyAdminToken } = require('@/lib/admin-auth')
    const adminPayload = verifyAdminToken(token)
    
    if (!adminPayload) {
      console.log('❌ Invalid JWT token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ Auth passed, proceeding with Stripe...')

    // Get REAL revenue data from Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ 
        error: 'Stripe not configured',
        message: 'Cannot fetch real revenue data without Stripe integration'
      }, { status: 503 })
    }

    // Fetch real Stripe data
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    
    // Get real revenue from Stripe
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfMonthTimestamp = Math.floor(startOfMonth.getTime() / 1000)

    console.log('🔍 DEBUG: Fetching Stripe data...')
    console.log('🔍 DEBUG: Start of month timestamp:', startOfMonthTimestamp)

    // Get this month's revenue from Stripe
    const monthlyRevenue = await stripe.balanceTransactions.list({
      created: {
        gte: startOfMonthTimestamp
      },
      limit: 100
    })

    console.log('🔍 DEBUG: Monthly revenue response:', monthlyRevenue.data.length, 'transactions')

    // Calculate real monthly revenue
    const realMonthlyRevenue = monthlyRevenue.data.reduce((total: number, transaction: any) => {
      if (transaction.type === 'charge' && transaction.status === 'available') {
        return total + (transaction.amount / 100) // Convert from cents
      }
      return total
    }, 0)

    // Get total revenue from Stripe
    const totalRevenue = await stripe.balanceTransactions.list({
      limit: 100
    })

    const realTotalRevenue = totalRevenue.data.reduce((total: number, transaction: any) => {
      if (transaction.type === 'charge' && transaction.status === 'available') {
        return total + (transaction.amount / 100)
      }
      return total
    }, 0)

    // Get real client count from Stripe customers
    const customers = await stripe.customers.list({
      limit: 100
    })

    const realClientCount = customers.data.length

    // Get real conversion data from database
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('enriched_leads')
      .select('id, outreach_status')
      .eq('outreach_status', 'converted')

    const { count: totalLeads } = await supabaseAdmin
      .from('enriched_leads')
      .select('id', { count: 'exact' })

    const realConversionRate = totalLeads && totalLeads > 0 
      ? Math.round(((leads?.length || 0) / totalLeads) * 100) 
      : 0

    // Only show meaningful data - if no revenue, show 0 and indicate it's real
    const realRevenueData = {
      monthlyRevenue: Math.round(realMonthlyRevenue * 100) / 100,
      totalRevenue: Math.round(realTotalRevenue * 100) / 100,
      totalClients: realClientCount,
      conversionRate: realConversionRate,
      dataSource: 'Stripe API',
      lastUpdated: new Date().toISOString(),
      meaningfulData: realMonthlyRevenue > 0 || realTotalRevenue > 0,
      message: realMonthlyRevenue === 0 && realTotalRevenue === 0 
        ? 'No revenue data found in Stripe - this may be a test account or new business'
        : 'Real revenue data from Stripe'
    }

    logger.info('Real revenue data fetched from Stripe', {
      monthlyRevenue: realMonthlyRevenue,
      totalClients: realClientCount,
      conversionRate: realConversionRate
    })

    console.log('🔍 DEBUG: Returning real data:', realRevenueData)
    
    return NextResponse.json({
      success: true,
      data: realRevenueData,
      debug: 'This is the real-revenue API'
    })

  } catch (error) {
    logger.error('Real revenue API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'real_revenue'
    })

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch real revenue data',
      message: 'Stripe integration required for real revenue tracking'
    }, { status: 500 })
  }
}
