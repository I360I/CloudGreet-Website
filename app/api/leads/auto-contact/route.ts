import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Real automation for lead contact and follow-up
export async function POST(request: NextRequest) {
  try {
    const { leadId, action, contactInfo } = await request.json()
    
    if (!leadId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 })
    }

    switch (action) {
      case 'send_email':
        return await sendAutomatedEmail(leadId, contactInfo)
      
      case 'schedule_call':
        return await scheduleAutomatedCall(leadId, contactInfo)
      
      case 'send_sms':
        return await sendAutomatedSMS(leadId, contactInfo)
      
      case 'add_to_crm':
        return await addToCRM(leadId, contactInfo)
      
      case 'create_follow_up':
        return await createFollowUpTask(leadId, contactInfo)
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Lead contact automation error', { error })
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Real email automation using Resend
async function sendAutomatedEmail(leadId: string, contactInfo: any) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (!resendApiKey) {
      // Email service not configured
      logger.error('Email service not configured', { leadId, contactEmail: contactInfo.email })
      return NextResponse.json({
        success: false,
        error: 'Email service not configured. Please configure RESEND_API_KEY environment variable.',
        email_content: generateEmailContent(contactInfo)
      }, { status: 503 })
    }

    const emailContent = generateEmailContent(contactInfo)
    
    const emailData = {
      from: 'CloudGreet AI <noreply@cloudgreet.com>',
      to: [contactInfo.email],
      subject: emailContent.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; font-weight: 800; margin: 0;">CloudGreet</h1>
              <p style="color: #6B7280; margin: 8px 0 0 0; font-size: 16px;">AI Receptionist Platform</p>
            </div>
            
            <div style="background: #F9FAFB; padding: 30px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #3B82F6;">
              <h2 style="color: #1F2937; margin-top: 0; font-size: 24px;">Never Miss Another Call!</h2>
              
              <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">
                Hi ${contactInfo.name},
              </p>
              
              <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">
                I noticed ${contactInfo.business_name} has excellent reviews (${contactInfo.rating}/5 stars with ${contactInfo.review_count} reviews), and I have a solution that could help you capture even more customers.
              </p>
              
              <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">
                Our AI receptionist answers every call 24/7, qualifies leads automatically, and books appointments in your calendar. This means you'll never miss a potential customer again.
              </p>
              
              <div style="background: #ECFDF5; border: 1px solid #10B981; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #065F46; font-size: 16px; margin: 0; font-weight: 600;">
                  🎯 Many businesses like yours see a 40-60% increase in bookings within the first month.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://cloudgreet.com/demo" 
                   style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); 
                          color: white; 
                          text-decoration: none; 
                          padding: 16px 32px; 
                          border-radius: 12px; 
                          font-weight: 600;
                          font-size: 16px;
                          display: inline-block;
                          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);">
                  🚀 Book Your Free Demo
                </a>
              </div>
              
              <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">
                Would you be interested in a quick 10-minute demo to see exactly how this works for ${contactInfo.business_name}?
              </p>
              
              <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #92400E; font-size: 14px; margin: 0;">
                  💰 <strong>Professional Service:</strong> AI receptionist service with no setup fees for qualified businesses.
                </p>
              </div>
              
              <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
                Best regards,<br>
                CloudGreet Team<br>
                <a href="https://cloudgreet.com" style="color: #3B82F6;">cloudgreet.com</a>
              </p>
            </div>
            
            <div style="text-align: center; color: #9CA3AF; font-size: 12px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0;">© 2024 CloudGreet. All rights reserved.</p>
              <p style="margin: 5px 0 0 0;">This email was sent to ${contactInfo.email}</p>
            </div>
          </div>
        </div>
      `
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Resend error: ${errorData}`)
    }

    const result = await response.json()

    // Log the email in database
    await logContactActivity(leadId, 'email_sent', {
      recipient: contactInfo.email,
      subject: emailContent.subject,
      status: 'sent',
      email_id: result.id,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      email_content: emailContent,
      email_id: result.id
      })
      
    } catch (error) {
    logger.error('Email automation error', { error })
    return NextResponse.json({
        success: false,
      error: 'Email sending failed',
        details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Real SMS automation using Telnyx
async function sendAutomatedSMS(leadId: string, contactInfo: any) {
  try {
    const telnyxApiKey = process.env.TELYNX_API_KEY
    
    if (!telnyxApiKey) {
      logger.error('SMS service not configured', { leadId, contactPhone: contactInfo.phone })
      return NextResponse.json({
        success: false,
        error: 'SMS service not configured. Please configure TELYNX_API_KEY environment variable.',
        sms_content: generateSMSContent(contactInfo)
      }, { status: 503 })
    }

    const smsContent = generateSMSContent(contactInfo)
    
    const smsData = {
      from: process.env.TELYNX_PHONE_NUMBER,
      to: contactInfo.phone,
      text: smsContent.text,
      messaging_profile_id: process.env.TELYNX_MESSAGING_PROFILE_ID
    }

    const response = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(smsData)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Telnyx error: ${JSON.stringify(result)}`)
    }

    // Log the SMS in database
    await logContactActivity(leadId, 'sms_sent', {
      recipient: contactInfo.phone,
      message: smsContent.text,
      status: 'sent',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully',
      sms_content: smsContent
    })

  } catch (error) {
    logger.error('SMS automation error', { error })
    return NextResponse.json({
      success: false,
      error: 'SMS sending failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Real CRM integration
async function addToCRM(leadId: string, contactInfo: any) {
  try {
    // Add to our internal CRM (database)
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        business_name: contactInfo.business_name,
        contact_name: contactInfo.name,
        email: contactInfo.email,
        phone: contactInfo.phone,
        business_type: contactInfo.business_type,
        location: contactInfo.location,
        rating: contactInfo.rating,
        review_count: contactInfo.review_count,
        estimated_revenue: contactInfo.estimated_revenue,
        status: 'new',
        source: 'automated_research',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Create follow-up task
    await createFollowUpTask(leadId, {
      ...contactInfo,
      lead_id: data.id,
      follow_up_type: 'initial_contact',
      scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    })

    return NextResponse.json({
      success: true,
      message: 'Lead added to CRM successfully',
      lead_id: data.id
    })

  } catch (error) {
    logger.error('CRM automation error', { error })
    return NextResponse.json({
      success: false,
      error: 'CRM integration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Real follow-up task automation
async function createFollowUpTask(leadId: string, contactInfo: any) {
  try {
    const { data, error } = await supabaseAdmin
      .from('follow_up_tasks')
      .insert({
        lead_id: contactInfo.lead_id || leadId,
        task_type: contactInfo.follow_up_type || 'initial_contact',
        scheduled_date: contactInfo.scheduled_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        status: 'pending',
        notes: `Automated follow-up for ${contactInfo.business_name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Follow-up task created successfully',
      task_id: data.id
    })

    } catch (error) {
    logger.error('Follow-up automation error', { error })
    return NextResponse.json({
        success: false,
      error: 'Follow-up task creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Real call scheduling automation
async function scheduleAutomatedCall(leadId: string, contactInfo: any) {
  try {
    // This would integrate with a real calendar system like Calendly
    // For now, we'll create a database entry for call scheduling
    
    const { data, error } = await supabaseAdmin
      .from('scheduled_calls')
      .insert({
        lead_id: leadId,
        business_name: contactInfo.business_name,
        contact_name: contactInfo.name,
        phone: contactInfo.phone,
        scheduled_date: contactInfo.scheduled_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        call_type: 'cold_call',
        status: 'scheduled',
        notes: `Scheduled call for ${contactInfo.business_name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Call scheduled successfully',
      call_id: data.id,
      scheduled_date: data.scheduled_date
    })

  } catch (error) {
    logger.error('Call scheduling automation error', { error })
    return NextResponse.json({
      success: false,
      error: 'Call scheduling failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions
function generateEmailContent(contactInfo: any) {
  // Enhanced subject lines based on business type and urgency
  const businessType = contactInfo.business_type?.toLowerCase() || 'service'
  let subject = ''
  
  if (contactInfo.urgency_level === 'urgent') {
    subject = `🚨 URGENT: ${contactInfo.business_name} - Stop Missing $${Math.round(contactInfo.estimated_revenue * 0.15)}/month in Lost Revenue`
  } else if (businessType.includes('hvac') || businessType.includes('plumbing')) {
    subject = `Emergency calls = $$$ - AI Receptionist for ${contactInfo.business_name}`
  } else if (businessType.includes('painting') || businessType.includes('roofing')) {
    subject = `Project season is here - Never miss a quote request again, ${contactInfo.business_name}`
  } else {
    subject = `Never Miss Another Call - AI Receptionist for ${contactInfo.business_name}`
  }
  
  // Personalized message based on business data
  const personalized_message = generatePersonalizedEmailContent(contactInfo)

  return {
    subject,
    personalized_message
  }
}

function generatePersonalizedEmailContent(contactInfo: any) {
  const businessType = contactInfo.business_type?.toLowerCase() || 'service business'
  const rating = contactInfo.rating
  const reviews = contactInfo.review_count
  const estimatedRevenue = contactInfo.estimated_revenue
  const lostRevenue = Math.round(estimatedRevenue * 0.15) // Assume 15% lost revenue from missed calls
  
  // Business-specific messaging
  let businessSpecificPitch = ''
  if (businessType.includes('hvac')) {
    businessSpecificPitch = `As an HVAC business, you know that emergency calls after hours can make or break your revenue. With your ${rating}/5 star rating and ${reviews} reviews, you're clearly doing something right. But how many potential emergency calls are you missing at 2 AM?`
  } else if (businessType.includes('plumbing')) {
    businessSpecificPitch = `Plumbing emergencies don't wait for business hours. Your ${rating}/5 star rating shows you deliver quality service, but how many customers are calling your competitors when you can't answer?`
  } else if (businessType.includes('painting')) {
    businessSpecificPitch = `Painting season is peak revenue time. With your ${rating}/5 star rating, customers clearly love your work. But how many quote requests are you missing when you're on a job?`
  } else if (businessType.includes('roofing')) {
    businessSpecificPitch = `Roofing projects are high-value opportunities. Your ${rating}/5 star rating shows you're trusted, but how many storm damage calls are you missing?`
  } else {
    businessSpecificPitch = `With your impressive ${rating}/5 star rating and ${reviews} reviews, ${contactInfo.business_name} is clearly a trusted business. But how many potential customers are you missing when you can't answer the phone?`
  }
  
  return `Hi ${contactInfo.name},

${businessSpecificPitch}

Our AI receptionist answers every call 24/7, qualifies leads automatically, and books appointments in your calendar. This means you'll never miss a potential customer again.

💰 **The Math:** If you're missing just 15% of potential calls, that's roughly $${lostRevenue}/month in lost revenue for ${contactInfo.business_name}.

🎯 **Real Results:** Businesses like yours typically see a 40-60% increase in bookings within the first month.

⚡ **Professional Service:** AI receptionist with no setup fees. Professional results guaranteed.

Would you be interested in a quick 10-minute demo to see exactly how this works for ${contactInfo.business_name}?

Best regards,
CloudGreet Team

P.S. I noticed you're not currently using an AI receptionist. This could be costing you $${lostRevenue}/month in missed opportunities.`
}

function generateSMSContent(contactInfo: any) {
  const businessType = contactInfo.business_type?.toLowerCase() || 'service business'
  const rating = contactInfo.rating
  const reviews = contactInfo.review_count
  const lostRevenue = Math.round(contactInfo.estimated_revenue * 0.15)
  
  // Optimized SMS based on business type and urgency
  let text = ''
  
  if (contactInfo.urgency_level === 'urgent') {
    text = `🚨 Hi ${contactInfo.name}! ${contactInfo.business_name} is missing ~$${lostRevenue}/month in lost calls. Our AI receptionist captures every lead 24/7. Professional service available. Interested? Reply YES`
  } else if (businessType.includes('hvac') || businessType.includes('plumbing')) {
    text = `Hi ${contactInfo.name}! ${contactInfo.business_name} (${rating}/5 stars) - How many emergency calls do you miss after hours? Our AI answers 24/7. Free demo? Reply YES`
  } else if (businessType.includes('painting') || businessType.includes('roofing')) {
    text = `Hi ${contactInfo.name}! Peak season = more calls. ${contactInfo.business_name} (${rating}/5 stars) - Never miss a quote request again. AI receptionist demo? Reply YES`
  } else {
    text = `Hi ${contactInfo.name}! ${contactInfo.business_name} (${rating}/5 stars, ${reviews} reviews) - Never miss another call. AI receptionist captures every lead 24/7. Professional service? Reply YES`
  }

  return {
    text,
    character_count: text.length
  }
}

async function logContactActivity(leadId: string, activityType: string, details: any) {
  try {
    await supabaseAdmin
      .from('contact_activities')
      .insert({
        lead_id: leadId,
        activity_type: activityType,
        details: details,
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    logger.error('Failed to log contact activity', { error, leadId, activityType })
  }
}
