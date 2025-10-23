import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * APOLLO KILLER: Email Outreach
 * 
 * Send personalized emails to leads
 * Tracks opens, clicks, and responses
 */

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { leadId, leadIds, template, subject, personalizedMessage } = await request.json()

    const ids = leadId ? [leadId] : leadIds

    if (!ids || ids.length === 0) {
      return NextResponse.json({
        error: 'leadId or leadIds required'
      }, { status: 400 })
    }

    if (!subject) {
      return NextResponse.json({
        error: 'subject required'
      }, { status: 400 })
    }

    const results = []

    for (const id of ids) {
      try {
        // Get lead data
        const { data: lead } = await supabaseAdmin
          .from('enriched_leads')
          .select('*')
          .eq('id', id)
          .single()

        if (!lead || !lead.owner_email) {
          results.push({
            leadId: id,
            success: false,
            error: 'No email address'
          })
          continue
        }

        // Generate personalized email content
        const emailContent = generateEmailContent(lead, template, personalizedMessage)

        // Send email via Resend
        const emailResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'CloudGreet <sales@cloudgreet.com>',
          to: lead.owner_email,
          subject: personalizeSubject(subject, lead),
          html: emailContent,
          // Add tracking pixel for opens
          headers: {
            'X-Lead-ID': id,
            'X-Campaign-Type': 'apollo-killer-outreach'
          }
        })

        // Update lead outreach status
        await supabaseAdmin
          .from('enriched_leads')
          .update({
            outreach_status: 'contacted',
            first_contact_date: lead.first_contact_date || new Date().toISOString(),
            last_contact_date: new Date().toISOString(),
            contact_attempts: (lead.contact_attempts || 0) + 1,
            emails_sent: (lead.emails_sent || 0) + 1,
            last_email_sent_at: new Date().toISOString()
          })
          .eq('id', id)

        logger.info('Outreach email sent', {
          leadId: id,
          business: lead.business_name,
          to: lead.owner_email
        })

        results.push({
          leadId: id,
          success: true,
          emailId: emailResult.data?.id
        })

      } catch (error) {
        logger.error('Failed to send outreach email', {
          leadId: id,
          error: error instanceof Error ? error.message : 'Unknown'
        })

        results.push({
          leadId: id,
          success: false,
          error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
        })
      }

      // Rate limit: wait 500ms between emails
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: results.length - successCount,
      results
    })

  } catch (error) {
    logger.error('Outreach email API error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to send emails'
    }, { status: 500 })
  }
}

/**
 * Generate personalized email content
 */
function generateEmailContent(lead: any, template?: string, personalizedMessage?: string): string {
  const name = lead.owner_name ? lead.owner_name.split(' ')[0] : 'there'
  const businessName = lead.business_name
  const rating = lead.google_rating ? `${lead.google_rating}★` : 'excellent'

  // Use custom pitch if available, otherwise use template
  const pitch = personalizedMessage || lead.personalized_pitch || generateDefaultPitch(lead)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">CloudGreet</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AI Receptionist for Service Businesses</p>
  </div>
  
  <div style="background: white; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${name},</p>
    
    <div style="margin-bottom: 25px; line-height: 1.8;">
      ${pitch.split('\n').map(p => `<p style="margin: 0 0 15px 0;">${p}</p>`).join('')}
    </div>

    ${lead.pain_points && lead.pain_points.length > 0 ? `
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
        <strong style="color: #856404;">We noticed:</strong>
        <ul style="margin: 10px 0 0 20px; color: #856404;">
          ${lead.pain_points.map(p => `<li style="margin: 5px 0;">${p}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="margin: 0 0 15px 0; color: #667eea;">What CloudGreet Does:</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li style="margin: 8px 0;">✅ Answers every call 24/7 (never miss a lead)</li>
        <li style="margin: 8px 0;">📅 Books appointments automatically</li>
        <li style="margin: 8px 0;">💬 Qualifies leads with smart questions</li>
        <li style="margin: 8px 0;">📊 Tracks ROI and missed call recovery</li>
        <li style="margin: 8px 0;">⚡ Setup in 10 minutes, no hardware needed</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/api/apollo-killer/tracking/email-click?leadId=${lead.id}&url=${encodeURIComponent('https://cloudgreet.com/demo?lead=' + lead.id)}&linkId=cta-demo" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        📞 Book a 15-Min Demo
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin: 30px 0 0 0;">
      Want to see it in action first? Call our AI receptionist: <strong>(833) 395-6731</strong>
    </p>

    <div style="border-top: 2px solid #e0e0e0; margin-top: 30px; padding-top: 20px;">
      <p style="margin: 0 0 10px 0;">Best regards,</p>
      <p style="margin: 0; font-weight: bold;">The CloudGreet Team</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
        📧 sales@cloudgreet.com | 🌐 cloudgreet.com
      </p>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
    <p style="margin: 0;">You're receiving this because ${businessName} matches our ideal customer profile.</p>
    <p style="margin: 10px 0 0 0;">
      <a href="{{unsubscribe}}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
    </p>
  </div>

  <!-- Tracking pixel -->
  <img src="${process.env.NEXT_PUBLIC_BASE_URL}/api/apollo-killer/tracking/email-open/${lead.id}" width="1" height="1" alt="" style="display: block;" />
</body>
</html>
  `.trim()
}

/**
 * Personalize email subject
 */
function personalizeSubject(subject: string, lead: any): string {
  const name = lead.owner_name ? lead.owner_name.split(' ')[0] : ''
  const business = lead.business_name

  return subject
    .replace('{name}', name)
    .replace('{first_name}', name)
    .replace('{business}', business)
    .replace('{business_name}', business)
}

/**
 * Generate default pitch if no personalized one exists
 */
function generateDefaultPitch(lead: any): string {
  const name = lead.owner_name ? lead.owner_name.split(' ')[0] : ''
  const rating = lead.google_rating ? `${lead.google_rating}★` : 'great'
  const reviews = lead.google_review_count || 'many'

  return `I came across ${lead.business_name} and saw your ${rating} rating with ${reviews} reviews - clearly you're doing great work!

Here's the challenge: Most ${lead.business_type || 'service'} businesses your size are missing 10-15 calls per month. That's $12,000-$18,000 in lost revenue annually.

CloudGreet's AI receptionist solves this by answering every call 24/7, qualifying leads, and booking appointments automatically - all for $299/month (way cheaper than a part-time receptionist).

Worth a quick 15-minute demo?`
}

