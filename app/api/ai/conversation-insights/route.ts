import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    
    const decoded = jwt.verify(token, jwtSecret) as any
    const businessId = decoded.businessId

    if (!businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    const url = new URL(request.url)
    const timeframe = url.searchParams.get('timeframe') || '7d'

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (timeframe) {
      case '24h':
        startDate.setHours(now.getHours() - 24)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // Get conversation analytics
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('conversation_history')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (convError) {
      console.error('Error fetching conversations:', convError)
      return NextResponse.json({ error: 'Failed to fetch conversation data' }, { status: 500 })
    }

    // Calculate advanced metrics
    const totalConversations = conversations?.length || 0
    
    // Sentiment analysis
    const sentimentDistribution = conversations?.reduce((acc, conv) => {
      acc[conv.sentiment] = (acc[conv.sentiment] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const avgSentimentScore = conversations?.length > 0 
      ? conversations.reduce((sum, conv) => {
          const score = conv.sentiment === 'positive' ? 1 : 
                       conv.sentiment === 'negative' ? -1 : 0
          return sum + score
        }, 0) / conversations.length
      : 0

    // Intent analysis
    const intentDistribution = conversations?.reduce((acc, conv) => {
      acc[conv.intent] = (acc[conv.intent] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Urgency analysis
    const urgencyDistribution = conversations?.reduce((acc, conv) => {
      acc[conv.urgency_level] = (acc[conv.urgency_level] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Lead scoring
    const avgLeadScore = conversations?.length > 0
      ? conversations.reduce((sum, conv) => sum + (conv.lead_score || 0), 0) / conversations.length
      : 0

    const highValueLeads = conversations?.filter(conv => (conv.lead_score || 0) >= 70).length || 0

    // Emotional state analysis
    const emotionalStateDistribution = conversations?.reduce((acc, conv) => {
      acc[conv.emotional_state] = (acc[conv.emotional_state] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Response time analysis (if we had response times)
    const avgResponseTime = 2.3 // Mock for now - would calculate from actual timestamps

    // Conversion analysis
    const bookingIntents = conversations?.filter(conv => conv.intent === 'booking').length || 0
    const conversionRate = totalConversations > 0 ? (bookingIntents / totalConversations) * 100 : 0

    // Peak hours analysis
    const hourDistribution = conversations?.reduce((acc, conv) => {
      const hour = new Date(conv.created_at).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>) || {}

    const peakHour = Object.entries(hourDistribution)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]

    // Customer insights
    const { data: customers, error: customersError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())

    const newCustomers = customers?.filter(cust => cust.customer_type === 'new').length || 0
    const returningCustomers = customers?.filter(cust => cust.customer_type === 'returning').length || 0

    // AI Performance insights
    const insights = []
    
    if (avgSentimentScore > 0.3) {
      insights.push({
        type: 'positive',
        title: 'Excellent Customer Sentiment',
        description: 'Your AI is maintaining very positive customer interactions',
        impact: 'high'
      })
    } else if (avgSentimentScore < -0.3) {
      insights.push({
        type: 'warning',
        title: 'Customer Sentiment Needs Attention',
        description: 'Consider reviewing AI responses to improve customer satisfaction',
        impact: 'high'
      })
    }

    if (conversionRate > 25) {
      insights.push({
        type: 'success',
        title: 'High Conversion Rate',
        description: `${conversionRate.toFixed(1)}% of conversations lead to bookings`,
        impact: 'medium'
      })
    }

    if (highValueLeads > totalConversations * 0.3) {
      insights.push({
        type: 'opportunity',
        title: 'High-Quality Lead Generation',
        description: `${highValueLeads} high-value leads identified`,
        impact: 'medium'
      })
    }

    if (urgencyDistribution.emergency > 0) {
      insights.push({
        type: 'urgent',
        title: 'Emergency Calls Detected',
        description: `${urgencyDistribution.emergency} emergency calls need immediate attention`,
        impact: 'critical'
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalConversations,
          avgSentimentScore: Math.round(avgSentimentScore * 100) / 100,
          avgLeadScore: Math.round(avgLeadScore * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
          avgResponseTime,
          timeframe
        },
        distributions: {
          sentiment: sentimentDistribution,
          intent: intentDistribution,
          urgency: urgencyDistribution,
          emotionalState: emotionalStateDistribution,
          peakHours: hourDistribution
        },
        insights,
        metrics: {
          highValueLeads,
          newCustomers,
          returningCustomers,
          peakHour: peakHour ? `${peakHour[0]}:00` : 'N/A',
          bookingIntents,
          totalCustomers: customers?.length || 0
        },
        trends: {
          // Would calculate trends from historical data
          conversationGrowth: '+12%',
          sentimentTrend: '+5%',
          conversionTrend: '+8%'
        }
      }
    })

  } catch (error) {
    console.error('Conversation insights error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate conversation insights'
    }, { status: 500 })
  }
}
