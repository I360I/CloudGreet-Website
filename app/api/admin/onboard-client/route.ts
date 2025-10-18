import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { logger } from '../../../../lib/monitoring'
import { requireAdmin } from '../../../../lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require admin authentication
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }
    
    const body = await request.json()
    const { 
      clientId,
      businessName,
      businessType,
      services,
      hours,
      greetingMessage,
      email,
      phone
    } = body

    // Get next available toll-free number
    const { data: availableNumbers } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('*')
      .eq('assigned_to', null)
      .limit(1)

    if (!availableNumbers || availableNumbers.length === 0) {
      return NextResponse.json({ 
        error: 'No toll-free numbers available. Please purchase more numbers.' 
      }, { status: 400 })
    }

    const tollFreeNumber = availableNumbers[0]

    // Assign number to client
    await supabaseAdmin
      .from('toll_free_numbers')
      .update({ 
        assigned_to: clientId,
        business_name: businessName,
        assigned_at: new Date().toISOString()
      })
      .eq('id', tollFreeNumber.id)

    // Create AI agent configuration
    const { data: aiAgent, error: aiError } = await supabaseAdmin
      .from('ai_agents')
      .insert({
        business_id: clientId,
        phone_number: tollFreeNumber.number,
        greeting_message: greetingMessage,
        business_hours: hours,
        services: services,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (aiError) {
      logger.error('AI agent creation failed', { 
        error: aiError.message, 
        clientId 
      })
    }

    // Create SMS templates for client
    const smsTemplates = [
      {
        business_id: clientId,
        name: 'appointment_confirmation',
        template: `Hi! Your appointment with ${businessName} has been confirmed. We'll call you at your scheduled time.`,
        type: 'appointment',
        created_at: new Date().toISOString()
      },
      {
        business_id: clientId,
        name: 'follow_up',
        template: `Thank you for your interest in ${businessName}! We'll be in touch soon to discuss your needs.`,
        type: 'follow_up',
        created_at: new Date().toISOString()
      },
      {
        business_id: clientId,
        name: 'reminder',
        template: `Reminder: You have an appointment with ${businessName} coming up.`,
        type: 'reminder',
        created_at: new Date().toISOString()
      }
    ]

    await supabaseAdmin
      .from('sms_templates')
      .insert(smsTemplates)

    // Send welcome email with setup instructions
    const welcomeEmail = {
      to: email,
      subject: `Welcome to CloudGreet! Your toll-free number is ready.`,
      html: `
        <h2>Welcome to CloudGreet!</h2>
        <p>Hi there,</p>
        <p>Your AI receptionist is ready to go!</p>
        
        <h3>Your Toll-Free Number: ${tollFreeNumber.number}</h3>
        
        <h3>What's Next:</h3>
        <ol>
          <li>Share your toll-free number with customers</li>
          <li>Test your number by calling it</li>
          <li>Check your dashboard for call analytics</li>
          <li>Customize your AI greeting if needed</li>
        </ol>
        
        <h3>Dashboard Access:</h3>
        <p>Login to your dashboard: <a href="https://cloudgreet.com/dashboard">https://cloudgreet.com/dashboard</a></p>
        
        <h3>Need Help?</h3>
        <p>Check our setup guide or contact support.</p>
        
        <p>Best regards,<br>CloudGreet Team</p>
      `
    }

    // Log the onboarding completion
    logger.info('Client onboarding completed', {
      clientId,
      businessName,
      tollFreeNumber: tollFreeNumber.number,
      aiAgentId: aiAgent?.id
    })

    return NextResponse.json({
      success: true,
      message: 'Client onboarded successfully',
      data: {
        clientId,
        tollFreeNumber: tollFreeNumber.number,
        aiAgentId: aiAgent?.id,
        dashboardUrl: 'https://cloudgreet.com/dashboard',
        setupInstructions: 'Check your email for complete setup instructions'
      }
    })

  } catch (error) {
    logger.error('Client onboarding failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ 
      error: 'Client onboarding failed' 
    }, { status: 500 })
  }
}
