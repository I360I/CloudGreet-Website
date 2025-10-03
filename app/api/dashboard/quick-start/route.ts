import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, businessId } = body

    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    
    const decoded = jwt.verify(token, jwtSecret) as any
    const targetBusinessId = businessId || decoded.businessId

    if (!targetBusinessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', targetBusinessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    switch (action) {
      case 'generate_demo_leads':
        // Generate realistic demo leads for immediate value
        const demoLeads = [
          {
            business_id: targetBusinessId,
            business_name: 'ABC Plumbing Services',
            contact_name: 'John Smith',
            phone: '+15551234567',
            email: 'john@abcplumbing.com',
            website: 'https://abcplumbing.com',
            address: '123 Main St, Anytown, ST 12345',
            business_type: 'Plumbing',
            rating: 4.2,
            review_count: 45,
            estimated_revenue: 2500,
            ai_score: 85,
            ai_priority: 'High',
            ai_insights: ['High volume business', 'Regular maintenance needs', 'Quick responder'],
            ai_recommendations: ['Offer maintenance contracts', 'Focus on emergency services'],
            status: 'new',
            source: 'demo_generation',
            notes: 'Demo lead - potential HVAC customer',
            created_at: new Date().toISOString()
          },
          {
            business_id: targetBusinessId,
            business_name: 'Smith & Sons Electrical',
            contact_name: 'Mike Smith',
            phone: '+15559876543',
            email: 'mike@smithsons.com',
            website: 'https://smithsons.com',
            address: '456 Oak Ave, Anytown, ST 12345',
            business_type: 'Electrical',
            rating: 4.5,
            review_count: 78,
            estimated_revenue: 3200,
            ai_score: 92,
            ai_priority: 'High',
            ai_insights: ['Premium service provider', 'Commercial focus', 'Growth stage'],
            ai_recommendations: ['Pitch commercial HVAC', 'Offer energy audits'],
            status: 'new',
            source: 'demo_generation',
            notes: 'Demo lead - electrical contractor',
            created_at: new Date().toISOString()
          },
          {
            business_id: targetBusinessId,
            business_name: 'Green Thumb Landscaping',
            contact_name: 'Sarah Johnson',
            phone: '+15555551234',
            email: 'sarah@greenthumb.com',
            website: 'https://greenthumb.com',
            address: '789 Pine St, Anytown, ST 12345',
            business_type: 'Landscaping',
            rating: 4.0,
            review_count: 32,
            estimated_revenue: 1800,
            ai_score: 76,
            ai_priority: 'Medium',
            ai_insights: ['Seasonal business', 'Local focus', 'Good reviews'],
            ai_recommendations: ['Target outdoor heating', 'Offer seasonal maintenance'],
            status: 'new',
            source: 'demo_generation',
            notes: 'Demo lead - landscaping company',
            created_at: new Date().toISOString()
          }
        ]

        const { data: insertedLeads, error: leadsError } = await supabaseAdmin
          .from('leads')
          .insert(demoLeads)
          .select()

        if (leadsError) {
          throw new Error(`Failed to insert demo leads: ${leadsError.message}`)
        }

        logger.info('Demo leads generated', {
          businessId: targetBusinessId,
          leadCount: demoLeads.length
        })

        return NextResponse.json({
          success: true,
          message: `Generated ${demoLeads.length} high-quality demo leads`,
          leads: insertedLeads
        })

      case 'schedule_demo_calls':
        // Create demo appointments to show immediate value
        const demoAppointments = [
          {
            business_id: targetBusinessId,
            customer_name: 'ABC Plumbing Services',
            customer_phone: '+15551234567',
            customer_email: 'john@abcplumbing.com',
            service_type: 'HVAC Maintenance',
            scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            estimated_value: 2500,
            status: 'scheduled',
            notes: 'Demo appointment - potential HVAC contract',
            created_at: new Date().toISOString()
          },
          {
            business_id: targetBusinessId,
            customer_name: 'Smith & Sons Electrical',
            customer_phone: '+15559876543',
            customer_email: 'mike@smithsons.com',
            service_type: 'Energy Audit',
            scheduled_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
            estimated_value: 3200,
            status: 'scheduled',
            notes: 'Demo appointment - electrical contractor',
            created_at: new Date().toISOString()
          }
        ]

        const { data: insertedAppointments, error: appointmentsError } = await supabaseAdmin
          .from('appointments')
          .insert(demoAppointments)
          .select()

        if (appointmentsError) {
          throw new Error(`Failed to insert demo appointments: ${appointmentsError.message}`)
        }

        logger.info('Demo appointments scheduled', {
          businessId: targetBusinessId,
          appointmentCount: demoAppointments.length
        })

        return NextResponse.json({
          success: true,
          message: `Scheduled ${demoAppointments.length} demo appointments`,
          appointments: insertedAppointments
        })

      case 'create_demo_calls':
        // Create demo call logs to show activity
        const demoCalls = [
          {
            business_id: targetBusinessId,
            caller_phone: '+15551234567',
            caller_name: 'John Smith',
            duration: 180, // 3 minutes
            status: 'completed',
            service_requested: 'HVAC Maintenance',
            satisfaction_rating: 5,
            transcript: 'Customer interested in annual HVAC maintenance contract. Discussed pricing and scheduling.',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
          },
          {
            business_id: targetBusinessId,
            caller_phone: '+15559876543',
            caller_name: 'Mike Smith',
            duration: 240, // 4 minutes
            status: 'completed',
            service_requested: 'Energy Audit',
            satisfaction_rating: 4,
            transcript: 'Electrical contractor interested in energy audit services. Scheduled consultation.',
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
          }
        ]

        const { data: insertedCalls, error: callsError } = await supabaseAdmin
          .from('call_logs')
          .insert(demoCalls)
          .select()

        if (callsError) {
          throw new Error(`Failed to insert demo calls: ${callsError.message}`)
        }

        logger.info('Demo calls created', {
          businessId: targetBusinessId,
          callCount: demoCalls.length
        })

        return NextResponse.json({
          success: true,
          message: `Created ${demoCalls.length} demo call records`,
          calls: insertedCalls
        })

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Quick start API error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to execute quick start action'
    }, { status: 500 })
  }
}
