/**
 * Admin Leads API
 * Manages lead generation and CRM functionality for admins
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('businesses')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status !== 'all') {
      // Map status to database fields
      if (status === 'cold') {
        query = query.is('onboarding_completed', false)
      } else if (status === 'contacted') {
        query = query.eq('onboarding_completed', true).is('phone_number', null)
      } else if (status === 'active') {
        query = query.eq('is_active', true)
      }
    }

    // Search filter
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,owner_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: businesses, error, count } = await query

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch leads'
      }, { status: 500 })
    }

    // Transform businesses into lead format
    const leads = (businesses || []).map(business => {
      // Determine status
      let leadStatus = 'cold'
      if (business.is_active) {
        leadStatus = 'active'
      } else if (business.onboarding_completed) {
        leadStatus = 'contacted'
      }

      // Calculate estimated revenue (based on plan or defaults)
      const estimatedRevenue = business.is_active ? 299 : 0

      return {
        id: business.id,
        business_name: business.business_name || 'Unknown',
        owner_name: business.owner_name || 'Unknown',
        email: business.email || '',
        phone: business.phone_number || '',
        business_type: business.business_type || 'Service',
        location: business.location || 'Unknown',
        estimated_revenue: estimatedRevenue,
        status: leadStatus,
        last_contact: business.onboarding_completed ? 'Onboarded' : 'Never',
        notes: business.is_active ? 'Active customer' : 'Pending activation',
        source: 'Sign Up',
        created_at: business.created_at
      }
    })

    return NextResponse.json({
      success: true,
      leads,
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Admin leads API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { business_name, owner_name, email, phone, business_type, location, notes } = body

    if (!business_name || !email) {
      return NextResponse.json({
        success: false,
        error: 'Business name and email are required'
      }, { status: 400 })
    }

    // Create new lead (business record)
    const { data: newLead, error } = await supabase
      .from('businesses')
      .insert({
        business_name,
        owner_name,
        email,
        phone_number: phone,
        business_type: business_type || 'Service',
        location,
        notes,
        onboarding_completed: false,
        is_active: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to create lead'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      lead: newLead
    })

  } catch (error) {
    console.error('Admin create lead error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

