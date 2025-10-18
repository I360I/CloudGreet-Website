import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

// Helper function to determine next steps based on setup status
function getNextSteps(status: any): string[] {
  const steps: string[] = []
  
  if (!status.onboardingCompleted) {
    steps.push('Complete onboarding to configure your AI agent')
  }
  
  if (!status.hasAgent) {
    steps.push('Create your AI agent after onboarding')
  }
  
  if (status.hasAgent && !status.subscriptionActive) {
    steps.push('Subscribe to activate your AI receptionist')
  }
  
  if (status.subscriptionActive && !status.hasPhoneNumber) {
    steps.push('Get your phone number to start receiving calls')
  }
  
  if (status.readyToReceiveCalls) {
    steps.push('Test your AI agent')
    steps.push('Forward your existing number to CloudGreet')
    steps.push('Start receiving calls!')
  }
  
  return steps
}

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
      case 'check_setup_status':
        // Return current setup status without generating fake data
        const { data: agent } = await supabaseAdmin
          .from('ai_agents')
          .select('*')
          .eq('business_id', targetBusinessId)
          .single()

        const { data: phoneNumber } = await supabaseAdmin
          .from('toll_free_numbers')
          .select('*')
          .eq('business_id', targetBusinessId)
          .eq('status', 'assigned')
          .single()

        const setupStatus = {
          onboardingCompleted: business.onboarding_completed,
          hasAgent: !!agent,
          hasPhoneNumber: !!phoneNumber,
          subscriptionActive: business.subscription_status === 'active',
          readyToReceiveCalls: !!agent && !!phoneNumber && business.subscription_status === 'active'
        }

        return NextResponse.json({
          success: true,
          status: setupStatus,
          nextSteps: getNextSteps(setupStatus)
        })

      case 'activate_agent':
        // Activate the AI agent if all requirements met
        if (!business.onboarding_completed) {
          return NextResponse.json({
            success: false,
            error: 'Please complete onboarding first'
          }, { status: 400 })
        }

        const { data: agentToActivate, error: agentError } = await supabaseAdmin
          .from('ai_agents')
          .select('*')
          .eq('business_id', targetBusinessId)
          .single()

        if (agentError || !agentToActivate) {
          return NextResponse.json({
            success: false,
            error: 'AI agent not found'
          }, { status: 404 })
        }

        // Activate agent
        await supabaseAdmin
          .from('ai_agents')
          .update({
            is_active: true,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', agentToActivate.id)

        logger.info('AI agent activated', {
          businessId: targetBusinessId,
          agentId: agentToActivate.id
        })

        return NextResponse.json({
          success: true,
          message: 'AI agent activated successfully'
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
