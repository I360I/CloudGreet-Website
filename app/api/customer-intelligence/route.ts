import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get customer intelligence data from database
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    // Handle case where customers table doesn't exist or has no data
    const customerData = customers || []

    // Get call data for intelligence analysis
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000)

    // Handle case where calls table doesn't exist or has no data
    const callData = calls || []

    // Calculate intelligence metrics
    const totalCustomers = customerData.length
    const totalCalls = callData.length
    const avgCallDuration = callData.reduce((sum, call) => sum + (call.duration || 0), 0) / (totalCalls || 1)
    const satisfactionScore = callData.reduce((sum, call) => sum + (call.satisfaction_score || 5), 0) / (totalCalls || 1)
    
    // Calculate call completion rate
    const completedCalls = callData.filter(call => call.status === 'completed').length
    const callCompletionRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0
    
    // Calculate conversion rate (calls to appointments)
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('user_id', userId)
    
    const totalAppointments = appointments?.length || 0
    const conversionRate = totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0
    
    // Customer segmentation based on call frequency
    const customerCallCounts = {}
    callData.forEach(call => {
      if (call.customer_id) {
        customerCallCounts[call.customer_id] = (customerCallCounts[call.customer_id] || 0) + 1
      }
    })
    
    const highValueCustomers = Object.values(customerCallCounts).filter((count: number) => count >= 3).length
    const repeatCustomers = Object.values(customerCallCounts).filter((count: number) => count > 1).length
    
    // Calculate peak calling hours
    const hourCounts = {}
    callData.forEach(call => {
      const hour = new Date(call.created_at).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    
    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count: count as number,
        timeString: `${hour}:00`,
        percentage: Math.round(((count as number) / totalCalls) * 100)
      }))
    
    // Sentiment analysis based on satisfaction scores
    const positiveSentiment = callData.filter(c => (c.satisfaction_score || 5) >= 4).length
    const negativeSentiment = callData.filter(c => (c.satisfaction_score || 5) <= 3).length

    // Get top customers by call volume
    const topCustomers = Object.entries(customerCallCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([customerId, callCount]) => {
        const customer = customerData.find(c => c.id === customerId)
        return {
          id: customerId,
          name: customer?.name || 'Unknown',
          email: customer?.email || '',
          phone: customer?.phone || '',
          callCount: callCount,
          lastCall: callData.find(c => c.customer_id === customerId)?.created_at
        }
      })

    // Calculate revenue metrics
    const estimatedRevenue = (totalCalls * 75) + (totalAppointments * 200)
    const avgRevenuePerCall = totalCalls > 0 ? estimatedRevenue / totalCalls : 0

    // Generate dynamic insights
    const insights = []
    
    if (satisfactionScore >= 4.5) {
      insights.push({
        id: 1,
        type: 'positive',
        title: 'Excellent Customer Satisfaction',
        description: `Average satisfaction score of ${Math.round(satisfactionScore * 10) / 10}/5 indicates outstanding service quality.`,
        impact: 'positive',
        confidence: 95
      })
    } else if (satisfactionScore >= 4.0) {
      insights.push({
        id: 1,
        type: 'positive',
        title: 'Good Customer Satisfaction',
        description: `Average satisfaction score of ${Math.round(satisfactionScore * 10) / 10}/5 shows solid service quality.`,
        impact: 'positive',
        confidence: 85
      })
    } else {
      insights.push({
        id: 1,
        type: 'warning',
        title: 'Customer Satisfaction Needs Improvement',
        description: `Average satisfaction score of ${Math.round(satisfactionScore * 10) / 10}/5 indicates room for improvement.`,
        impact: 'negative',
        confidence: 90
      })
    }

    if (callCompletionRate >= 80) {
      insights.push({
        id: 2,
        type: 'positive',
        title: 'High Call Completion Rate',
        description: `${Math.round(callCompletionRate * 10) / 10}% completion rate shows effective call handling.`,
        impact: 'positive',
        confidence: 88
      })
    } else {
      insights.push({
        id: 2,
        type: 'warning',
        title: 'Call Completion Rate',
        description: `${Math.round(callCompletionRate * 10) / 10}% completion rate. Consider optimizing call handling.`,
        impact: 'negative',
        confidence: 85
      })
    }

    if (conversionRate >= 20) {
      insights.push({
        id: 3,
        type: 'positive',
        title: 'Strong Conversion Rate',
        description: `${Math.round(conversionRate * 10) / 10}% of calls convert to appointments.`,
        impact: 'positive',
        confidence: 82
      })
    } else {
      insights.push({
        id: 3,
        type: 'info',
        title: 'Conversion Rate',
        description: `${Math.round(conversionRate * 10) / 10}% of calls convert to appointments. Consider improving follow-up.`,
        impact: 'neutral',
        confidence: 78
      })
    }

    if (peakHours.length > 0) {
      insights.push({
        id: 4,
        type: 'info',
        title: 'Peak Calling Hours',
        description: `Most calls occur between ${peakHours[0]?.timeString || '9:00'} and ${peakHours[1]?.timeString || '17:00'}.`,
        impact: 'neutral',
        confidence: 92
      })
    }

    const intelligence = {
      totalCustomers,
      totalCalls,
      totalAppointments,
      avgCallDuration: Math.round(avgCallDuration),
      satisfactionScore: Math.round(satisfactionScore * 10) / 10,
      callCompletionRate: Math.round(callCompletionRate * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      estimatedRevenue,
      avgRevenuePerCall: Math.round(avgRevenuePerCall),
      highValueCustomers,
      repeatCustomers,
      customerRetentionRate: totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
      positiveSentimentRate: totalCalls > 0 ? Math.round((positiveSentiment / totalCalls) * 100) : 0,
      negativeSentimentRate: totalCalls > 0 ? Math.round((negativeSentiment / totalCalls) * 100) : 0,
      topCustomers,
      peakHours,
      insights
    }

    return NextResponse.json(intelligence)

  } catch (error) {
    console.error('Customer intelligence API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
