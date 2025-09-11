import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    // If no userId provided, return error
    if (!userId || userId === 'undefined') {
      return NextResponse.json({
        success: false,
        error: 'User ID is required to fetch business stats'
      }, { status: 400 })
    }

    // Fetch real user data from database
    try {
      // Get user data from users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (userError || !user) {
        console.log('User not found. Error:', userError)
        return NextResponse.json({
          success: false,
          error: 'User not found in database'
        }, { status: 404 })
      }
      
      // Get call statistics
      const { data: calls, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', userId)

      // Get customer count
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)

      // Get appointment count
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id')
        .eq('user_id', userId)

      // Calculate real statistics
      const totalCalls = calls?.length || 0
      const totalCustomers = customers?.length || 0
      const activeAppointments = appointments?.length || 0
      
      // Calculate average satisfaction score
      const avgSatisfaction = calls?.length > 0 
        ? calls.reduce((sum, call) => sum + (call.satisfaction_score || 5), 0) / calls.length 
        : 4.8

      // Calculate total revenue (estimated based on calls and appointments)
      const estimatedRevenue = (totalCalls * 75) + (activeAppointments * 200)

      // Try to fetch real Retell AI stats if agent ID exists
      let retellStats = null
      if (user.retell_agent_id) {
        try {
          const retellResponse = await fetch(`https://api.retellai.com/v2/get-agent/${user.retell_agent_id}`, {
            headers: {
              'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (retellResponse.ok) {
            retellStats = await retellResponse.json()
          }
        } catch (error) {
          console.log('Retell API not available, using default data')
        }
      }

      // Calculate business stats based on real data
      const businessStats = {
        totalRevenue: estimatedRevenue,
        totalCalls: totalCalls,
        activeJobs: activeAppointments,
        customerRating: Math.round(avgSatisfaction * 10) / 10,
        monthlySubscription: 200,
        bookingFee: 50,
        phoneNumber: user.phone_number || null,
        retellAgentId: user.retell_agent_id || null,
        onboardingStatus: user.onboarding_status || 'pending',
        lastUpdated: new Date().toISOString(),
        // Additional real data
        businessName: user.company_name || 'Your Business',
        businessType: user.business_type || 'HVAC',
        agentStatus: retellStats ? 'active' : (user.retell_agent_id ? 'configured' : 'pending'),
        lastCallDate: calls?.length > 0 ? calls[0].created_at : null
      }

      return NextResponse.json(businessStats)
      
    } catch (error) {
      console.error('Error fetching business stats:', error)
      
      // Return default stats on error
      return NextResponse.json({
        totalRevenue: 0,
        totalCalls: 0,
        activeJobs: 0,
        customerRating: 0,
        monthlySubscription: 200,
        bookingFee: 50,
        phoneNumber: null,
        retellAgentId: null,
        onboardingStatus: 'pending',
        lastUpdated: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching business stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business statistics' }, 
      { status: 500 }
    )
  }
}
