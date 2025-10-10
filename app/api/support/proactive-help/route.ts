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
    const jwtSecret = process.env.JWT_SECRET
    
    const decoded = jwt.verify(token, jwtSecret) as any
    const targetBusinessId = businessId || decoded.businessId

    if (!targetBusinessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    switch (action) {
      case 'check_setup_completion':
        // Check if business setup is complete and provide guidance
        const { data: business, error: businessError } = await supabaseAdmin
          .from('businesses')
          .select('*')
          .eq('id', targetBusinessId)
          .single()

        if (businessError || !business) {
          return NextResponse.json({ error: 'Business not found' }, { status: 404 })
        }

        const setupIssues = []
        const setupRecommendations = []

        // Check phone number
        if (!business.phone_number || business.phone_number === 'Not configured') {
          setupIssues.push({
            type: 'critical',
            title: 'Phone Number Missing',
            description: 'Your AI receptionist needs a phone number to receive calls',
            action: 'setup_phone',
            priority: 'high'
          })
          setupRecommendations.push('Set up your business phone number to start receiving calls')
        }

        // Check AI agent
        const { data: agent } = await supabaseAdmin
          .from('ai_agents')
          .select('*')
          .eq('business_id', targetBusinessId)
          .single()

        if (!agent || !agent.is_active) {
          setupIssues.push({
            type: 'critical',
            title: 'AI Agent Not Active',
            description: 'Your AI receptionist is not active and cannot handle calls',
            action: 'activate_agent',
            priority: 'high'
          })
          setupRecommendations.push('Activate your AI agent to start handling customer calls')
        }

        // Check recent activity
        const { data: recentCalls } = await supabaseAdmin
          .from('calls')
          .select('id')
          .eq('business_id', targetBusinessId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

        if (!recentCalls || recentCalls.length === 0) {
          setupIssues.push({
            type: 'warning',
            title: 'No Recent Activity',
            description: 'No calls have been received in the last 7 days',
            action: 'generate_leads',
            priority: 'medium'
          })
          setupRecommendations.push('Consider generating demo leads to test your system')
        }

        // Check business hours
        if (!business.business_hours || Object.keys(business.business_hours).length === 0) {
          setupIssues.push({
            type: 'warning',
            title: 'Business Hours Not Set',
            description: 'Set your business hours so the AI knows when you\'re available',
            action: 'setup_hours',
            priority: 'medium'
          })
          setupRecommendations.push('Configure your business hours for better AI responses')
        }

        return NextResponse.json({
          success: true,
          data: {
            setupComplete: setupIssues.length === 0,
            issues: setupIssues,
            recommendations: setupRecommendations,
            businessName: business.business_name,
            onboardingCompleted: business.onboarding_completed
          }
        })

      case 'get_success_tips':
        // Provide actionable tips for success
        const tips = [
          {
            id: 'test_agent',
            title: 'Test Your AI Agent',
            description: 'Use the test agent feature to ensure your AI is working properly',
            action: 'test_agent',
            impact: 'high',
            timeRequired: '2 minutes'
          },
          {
            id: 'customize_greeting',
            title: 'Customize Your Greeting',
            description: 'Personalize your AI\'s greeting message to match your brand',
            action: 'customize_greeting',
            impact: 'medium',
            timeRequired: '1 minute'
          },
          {
            id: 'set_business_hours',
            title: 'Set Business Hours',
            description: 'Configure when your business is open for better AI responses',
            action: 'set_hours',
            impact: 'medium',
            timeRequired: '1 minute'
          },
          {
            id: 'generate_leads',
            title: 'Generate Demo Leads',
            description: 'Create sample leads to see how lead management works',
            action: 'generate_leads',
            impact: 'high',
            timeRequired: '30 seconds'
          }
        ]

        return NextResponse.json({
          success: true,
          data: {
            tips,
            message: 'Here are some quick actions to maximize your success with CloudGreet'
          }
        })

      case 'schedule_demo_call':
        // Schedule a demo call with the business
        const { data: business2 } = await supabaseAdmin
          .from('businesses')
          .select('business_name, phone_number')
          .eq('id', targetBusinessId)
          .single()

        if (business2?.phone_number && business2.phone_number !== 'Not configured') {
          // Create a demo appointment
          const { data: demoAppointment } = await supabaseAdmin
            .from('appointments')
            .insert({
              business_id: targetBusinessId,
              customer_name: 'CloudGreet Support',
              customer_phone: '+15550000000',
              customer_email: 'support@cloudgreet.com',
              service_type: 'Demo Call',
              scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              estimated_value: 0,
              status: 'scheduled',
              notes: 'Demo call to test AI receptionist functionality',
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          return NextResponse.json({
            success: true,
            message: 'Demo call scheduled! We\'ll call your AI receptionist tomorrow to test it.',
            appointment: demoAppointment
          })
        } else {
          return NextResponse.json({
            success: false,
            message: 'Please set up your phone number first before scheduling a demo call'
          })
        }

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Proactive support API error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process support request'
    }, { status: 500 })
  }
}
