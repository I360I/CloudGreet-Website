import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Convert a lead to an active client account
 * Creates user account, business profile, and AI agent
 */
export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { leadId, password, plan = 'pro' } = await request.json()

    // Input validation
    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json({
        error: 'leadId is required and must be a string'
      }, { status: 400 })
    }

    if (password && (typeof password !== 'string' || password.length < 8)) {
      return NextResponse.json({
        error: 'Password must be at least 8 characters long'
      }, { status: 400 })
    }

    if (plan && !['basic', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({
        error: 'Plan must be basic, pro, or enterprise'
      }, { status: 400 })
    }

    // Get lead data
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('enriched_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({
        error: 'Lead not found'
      }, { status: 404 })
    }

    // Check if already converted
    if (lead.outreach_status === 'converted') {
      return NextResponse.json({
        error: 'Lead already converted to client'
      }, { status: 400 })
    }

    // Generate secure password if not provided
    const clientPassword = password || generateSecurePassword()
    const hashedPassword = await bcrypt.hash(clientPassword, 12)

    // Generate email from business name if no owner email
    const clientEmail = lead.owner_email || generateEmailFromBusiness(lead.business_name)

    // Create user account
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: clientEmail,
      password: clientPassword,
      email_confirm: true,
      user_metadata: {
        first_name: lead.owner_name?.split(' ')[0] || 'Business',
        last_name: lead.owner_name?.split(' ').slice(1).join(' ') || 'Owner',
        business_name: lead.business_name,
        converted_from_lead: true,
        lead_id: leadId
      }
    })

    if (userError || !user) {
      logger.error('Failed to create user account', {
        leadId,
        error: userError?.message
      })
      return NextResponse.json({
        error: 'Failed to create user account'
      }, { status: 500 })
    }

    // Generate business ID
    const businessId = crypto.randomUUID()
    
    // Create business profile
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        id: businessId,
        business_name: lead.business_name,
        business_type: lead.business_type || 'General Services',
        phone_number: lead.phone || lead.owner_phone,
        website: lead.website,
        address: `${lead.city || ''}, ${lead.state || ''}`,
        owner_id: user.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_completed: true,
        account_status: 'active',
        subscription_status: 'active',
        billing_plan: plan,
      })
      .select()
      .single()

    if (businessError || !business) {
      logger.error('Failed to create business profile', {
        leadId,
        userId: user.user.id,
        error: businessError?.message
      })
      
      // Cleanup: delete user if business creation failed
      await supabaseAdmin.auth.admin.deleteUser(user.user.id)
      
      return NextResponse.json({
        error: 'Failed to create business profile'
      }, { status: 500 })
    }

    // Update user with business_id
    await supabaseAdmin.auth.admin.updateUserById(user.user.id, {
      user_metadata: {
        ...user.user.user_metadata,
        business_id: business.id
      }
    })

    // Create AI agent
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .insert({
        business_id: business.id,
        agent_name: `${lead.business_name} AI Receptionist`,
        business_name: lead.business_name,
        is_active: true,
        status: 'active',
        phone_number: lead.phone || lead.owner_phone,
        tone: 'professional',
        prompt_template: generateAgentPrompt(lead),
        configuration: {
          business_type: lead.business_type,
          services: [lead.business_type || 'General Services'],
          voice: 'alloy',
          language: 'en'
        }
      })
      .select()
      .single()

    if (agentError) {
      logger.error('Failed to create AI agent', {
        leadId,
        businessId: business.id,
        error: agentError.message
      })
      // Don't fail the conversion if agent creation fails
    }

    // Update lead status
    await supabaseAdmin
      .from('enriched_leads')
      .update({
        outreach_status: 'converted',
        last_contact_date: new Date().toISOString(),
        notes: `Converted to client on ${new Date().toISOString()}. Business ID: ${business.id}`
      })
      .eq('id', leadId)

    // Send welcome email (optional)
    try {
      await sendWelcomeEmail(clientEmail, lead.business_name, clientPassword)
    } catch (emailError) {
      logger.error('Failed to send welcome email', {
        leadId,
        email: clientEmail,
        error: emailError instanceof Error ? emailError.message : 'Unknown'
      })
      // Don't fail conversion if email fails
    }

    logger.info('Lead converted to client successfully', {
      leadId,
      businessId: business.id,
      userId: user.user.id,
      businessName: lead.business_name
    })

    return NextResponse.json({
      success: true,
      message: 'Lead converted to client successfully',
      data: {
        client: {
          id: user.user.id,
          email: clientEmail,
          password: clientPassword, // Include password for admin reference
          business_id: business.id,
          business_name: lead.business_name
        },
        business: {
          id: business.id,
          name: lead.business_name,
          type: lead.business_type,
          phone: lead.phone || lead.owner_phone
        },
        agent: agent ? {
          id: agent.id,
          name: agent.agent_name,
          status: agent.status
        } : null
      }
    })

  } catch (error) {
    logger.error('Convert lead to client error', {
      error: error instanceof Error ? error.message : 'Unknown',
      endpoint: 'admin/convert-lead-to-client'
    })

    return NextResponse.json({
      error: 'Failed to convert lead to client'
    }, { status: 500 })
  }
}

/**
 * Generate secure password
 */
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Generate email from business name
 */
function generateEmailFromBusiness(businessName: string): string {
  const cleanName = businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .substring(0, 20)
  
  const randomSuffix = Math.floor(Math.random() * 1000)
  return `${cleanName}${randomSuffix}@cloudgreet.com`
}

/**
 * Generate AI agent prompt
 */
function generateAgentPrompt(lead: any): string {
  return `You are the AI receptionist for ${lead.business_name}, a ${lead.business_type || 'service'} business.

Your role:
- Answer calls professionally and warmly
- Qualify leads by understanding their needs
- Schedule appointments when appropriate
- Provide basic information about services
- Transfer to human when needed

Business details:
- Name: ${lead.business_name}
- Type: ${lead.business_type || 'General Services'}
- Location: ${lead.city || ''} ${lead.state || ''}
- Website: ${lead.website || 'Not available'}

Always be helpful, professional, and focused on understanding the caller's needs.`
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(email: string, businessName: string, password: string): Promise<void> {
  // This would integrate with your email service (Resend, SendGrid, etc.)
  // For now, just log the email details
  logger.info('Welcome email would be sent', {
    to: email,
    businessName,
    password
  })
  
  // TODO: Implement actual email sending
  // await resend.emails.send({
  //   from: 'welcome@cloudgreet.com',
  //   to: email,
  //   subject: `Welcome to CloudGreet, ${businessName}!`,
  //   html: generateWelcomeEmailHTML(businessName, password)
  // })
}
