import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../lib/error-handler'
import { Resend } from 'resend'

// Initialize Resend only if API key is available
const resendKey = process.env.RESEND_API_KEY
const resend = resendKey ? new Resend(resendKey) : null

export async function POST(request: NextRequest) {
  try {
    const { to, subject, businessData } = await request.json()

    // Check if Resend is properly configured
    if (!resend) {
      return NextResponse.json({
        error: 'Resend API key not configured. Please set RESEND_API_KEY in environment variables.'
      }, { status: 503 })
    }

    // Format the business data for the email
    const formatBusinessHours = (hours: any) => {
      if (!hours || typeof hours !== 'object') {
        return 'Business hours not specified'
      }
      return Object.entries(hours).map(([day, hour]: [string, any]) => {
        const dayName = day.charAt(0).toUpperCase() + day.slice(1)
        if (!hour || hour.closed) {
          return `${dayName}: Closed`
        }
        return `${dayName}: ${hour.open || 'N/A'} - ${hour.close || 'N/A'}`
      }).join('\n')
    }

    const formatServices = (services: string[]) => {
      if (!services || !Array.isArray(services)) {
        return 'Services not specified'
      }
      return services.map(service => `• ${service}`).join('\n')
    }

    const emailContent = `
New Business Onboarding Request

Business Details:
- Name: ${businessData.businessName}
- Type: ${businessData.businessType}
- Phone: ${businessData.phoneNumber}
- Email: ${businessData.email}

Business Hours:
${formatBusinessHours(businessData.businessHours)}

Services Offered:
${formatServices(businessData.services)}

AI Personality: ${businessData.aiPersonality}

This business has completed their onboarding setup and is ready for phone number connection and AI configuration.

Please review and take necessary actions to complete their setup.
    `.trim()

    // Send email to anthony@cloudgreet.com
    const { data, error } = await resend.emails.send({
      from: 'CloudGreet <noreply@cloudgreet.com>',
      to: ['anthony@cloudgreet.com'],
      subject: subject,
      text: emailContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Business Onboarding Request</h2>
          
          <h3 style="color: #374151;">Business Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Name:</strong> ${businessData.businessName}</li>
            <li><strong>Type:</strong> ${businessData.businessType}</li>
            <li><strong>Phone:</strong> ${businessData.phoneNumber}</li>
            <li><strong>Email:</strong> ${businessData.email}</li>
          </ul>
          
          <h3 style="color: #374151;">Business Hours:</h3>
          <pre style="background: #f3f4f6; padding: 15px; border-radius: 5px; font-family: monospace;">${formatBusinessHours(businessData.businessHours)}</pre>
          
          <h3 style="color: #374151;">Services Offered:</h3>
          <ul style="background: #f3f4f6; padding: 15px; border-radius: 5px;">
            ${(businessData.services || []).map(service => `<li>${service}</li>`).join('')}
          </ul>
          
          <h3 style="color: #374151;">AI Personality:</h3>
          <p>${businessData.aiPersonality || 'Professional'}</p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 14px;">
            This business has completed their onboarding setup and is ready for phone number connection and AI configuration.
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            Please review and take necessary actions to complete their setup.
          </p>
        </div>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      messageId: data?.id,
      message: 'Onboarding email sent successfully to anthony@cloudgreet.com'
    })

  } catch (error) {
    console.error('Error sending onboarding email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
