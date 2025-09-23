import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Fetch real client data from Supabase
    const { data: businesses, error: businessesError } = await supabaseAdmin
      .from('businesses')
      .select(`
        id,
        business_name,
        email,
        phone_number,
        created_at,
        subscription_status,
        subscription_amount,
        owner_id
      `)

    if (businessesError) {
      // Business fetch error
      // Return empty clients array if database not ready yet
      return NextResponse.json({ clients: [] })
    }

    // Get additional data for each business
    const clientsWithStats = await Promise.all(
      businesses.map(async (business) => {
        // Get call count for this business
        const { data: calls } = await supabaseAdmin
          .from('call_logs')
          .select('id')
          .eq('business_id', business.id)

        // Get appointment count for this business
        const { data: appointments } = await supabaseAdmin
          .from('appointments')
          .select('id, estimated_value')
          .eq('business_id', business.id)

        // Get last activity (most recent call or appointment)
        const { data: lastCall } = await supabaseAdmin
          .from('call_logs')
          .select('created_at')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const { data: lastAppointment } = await supabaseAdmin
          .from('appointments')
          .select('created_at')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(1)

        // Calculate monthly revenue from appointments
        const monthlyRevenue = appointments?.reduce((sum, apt) => sum + (apt.estimated_value || 0), 0) || 0

        // Determine last activity
        let lastActivity = 'Never'
        if (lastCall?.[0] || lastAppointment?.[0]) {
          const lastCallDate = lastCall?.[0]?.created_at ? new Date(lastCall[0].created_at) : null
          const lastAppointmentDate = lastAppointment?.[0]?.created_at ? new Date(lastAppointment[0].created_at) : null
          
          if (lastCallDate && lastAppointmentDate) {
            const mostRecent = lastCallDate > lastAppointmentDate ? lastCallDate : lastAppointmentDate
            lastActivity = formatLastActivity(mostRecent)
          } else if (lastCallDate) {
            lastActivity = formatLastActivity(lastCallDate)
          } else if (lastAppointmentDate) {
            lastActivity = formatLastActivity(lastAppointmentDate)
          }
        }

        return {
          id: business.id,
          business_name: business.business_name,
          email: business.email,
          phone_number: business.phone_number,
          created_at: business.created_at,
          subscription_status: business.subscription_status,
          monthly_revenue: Math.round(monthlyRevenue),
          calls_count: calls?.length || 0,
          appointments_count: appointments?.length || 0,
          last_activity: lastActivity
        }
      })
    )

    return NextResponse.json({ clients: clientsWithStats })
  } catch (error) {
    // Admin clients error
    return NextResponse.json({ 
      success: false, 
      message: `Admin clients error: ${error.message}`,
      error: error.toString(),
      clients: [] 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { business_name, email, phone_number, subscription_amount = 99 } = body

    // Create new business in database
    const { data: newBusiness, error } = await supabase
      .from('businesses')
      .insert({
        business_name,
        email,
        phone_number,
        subscription_status: 'active',
        subscription_amount,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      // Console error removed for production
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      client: {
        id: newBusiness.id,
        business_name: newBusiness.business_name,
        email: newBusiness.email,
        phone_number: newBusiness.phone_number,
        created_at: newBusiness.created_at,
        subscription_status: newBusiness.subscription_status,
        monthly_revenue: subscription_amount,
        calls_count: 0,
        appointments_count: 0,
        last_activity: 'Just now'
      }
    })
  } catch (error) {
    // Console error removed for production
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, business_name, email, phone_number, subscription_status } = body

    // Update business in database
    const { data: updatedBusiness, error } = await supabase
      .from('businesses')
      .update({
        business_name,
        email,
        phone_number,
        subscription_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      // Console error removed for production
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      client: updatedBusiness
    })
  } catch (error) {
    // Console error removed for production
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    // Delete business from database
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id)

    if (error) {
      // Console error removed for production
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Console error removed for production
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function formatLastActivity(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}