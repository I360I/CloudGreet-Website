import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { handleApiError, createSuccessResponse } from '../../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) {
      return NextResponse.json({ 
        success: false,
        error: 'Admin configuration missing' 
      }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const businessType = searchParams.get('business_type')
    const search = searchParams.get('search')

    const offset = (page - 1) * limit

    // Build query for users
    let userQuery = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        business_name,
        business_type,
        phone_number,
        created_at,
        last_active,
        status
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      userQuery = userQuery.eq('status', status)
    }
    if (businessType) {
      userQuery = userQuery.eq('business_type', businessType)
    }
    if (search) {
      userQuery = userQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,business_name.ilike.%${search}%`)
    }

    const { data: users, error: usersError } = await userQuery

    if (usersError) {
      throw new Error('Failed to fetch users')
    }

    // Get additional data for each user
    const clientsWithStats = await Promise.all(
      users.map(async (user) => {
        // Get user's appointments for revenue calculation
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('amount, start_time')
          .eq('user_id', user.id)
          .gte('start_time', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

        // Get user's calls
        const { data: calls, error: callsError } = await supabase
          .from('calls')
          .select('id')
          .eq('user_id', user.id)

        // Get user's voice agent
        const { data: agent, error: agentError } = await supabase
          .from('voice_agents')
          .select('agent_id, status')
          .eq('user_id', user.id)
          .single()

        // Get user's subscription
        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('plan_name, status')
          .eq('user_id', user.id)
          .single()

        const monthlyRevenue = appointments?.reduce((sum, apt) => sum + (apt.amount || 0), 0) || 0
        const totalCalls = calls?.length || 0
        const totalBookings = appointments?.length || 0
        const conversionRate = totalCalls > 0 ? (totalBookings / totalCalls) * 100 : 0

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          company: user.business_name,
          businessType: user.business_type,
          phoneNumber: user.phone_number,
          status: user.status || 'active',
          subscriptionPlan: subscription?.plan_name || 'basic',
          monthlyRevenue: monthlyRevenue,
          totalCalls: totalCalls,
          totalBookings: totalBookings,
          conversionRate: Math.round(conversionRate * 100) / 100,
          lastActive: user.last_active,
          createdAt: user.created_at,
          agentId: agent?.agent_id || null,
          onboardingStatus: agent?.status === 'active' ? 'completed' : 'pending'
        }
      })
    )

    // Get total count for pagination
    let countQuery = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })

    if (status) {
      countQuery = countQuery.eq('status', status)
    }
    if (businessType) {
      countQuery = countQuery.eq('business_type', businessType)
    }
    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,business_name.ilike.%${search}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      throw new Error('Failed to get total count')
    }

    return createSuccessResponse({
      clients: clientsWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: page * limit < (count || 0),
        hasPrev: page > 1
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, data } = body

    // Check admin access
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) {
      return NextResponse.json({ 
        success: false,
        error: 'Admin configuration missing' 
      }, { status: 503 })
    }

    if (!action || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Action and user ID are required'
      }, { status: 400 })
    }

    switch (action) {
      case 'update_status':
        const { error: statusError } = await supabase
          .from('users')
          .update({
            status: data.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (statusError) {
          throw new Error('Failed to update user status')
        }

        return createSuccessResponse({
          message: 'User status updated successfully'
        })

      case 'suspend':
        const { error: suspendError } = await supabase
          .from('users')
          .update({
            status: 'suspended',
            suspension_reason: data.reason,
            suspended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (suspendError) {
          throw new Error('Failed to suspend user')
        }

        // Log suspension for compliance
        await supabase
          .from('admin_actions')
          .insert({
            admin_email: adminEmail,
            action: 'user_suspension',
            user_id: userId,
            reason: data.reason,
            created_at: new Date().toISOString()
          })

        return createSuccessResponse({
          message: 'User suspended successfully'
        })

      case 'reactivate':
        const { error: reactivateError } = await supabase
          .from('users')
          .update({
            status: 'active',
            suspension_reason: null,
            suspended_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (reactivateError) {
          throw new Error('Failed to reactivate user')
        }

        // Log reactivation
        await supabase
          .from('admin_actions')
          .insert({
            admin_email: adminEmail,
            action: 'user_reactivation',
            user_id: userId,
            reason: data.reason,
            created_at: new Date().toISOString()
          })

        return createSuccessResponse({
          message: 'User reactivated successfully'
        })

      case 'update_subscription':
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .update({
            plan_name: data.planName,
            status: data.status,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (subscriptionError) {
          throw new Error('Failed to update subscription')
        }

        return createSuccessResponse({
          message: 'Subscription updated successfully'
        })

      case 'send_notification':
        // Send notification to user
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'admin_message',
            title: data.title,
            message: data.message,
            created_at: new Date().toISOString()
          })

        if (notificationError) {
          throw new Error('Failed to send notification')
        }

        return createSuccessResponse({
          message: 'Notification sent successfully'
        })

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