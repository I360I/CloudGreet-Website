// lib/email.ts
// Email utility functions for CloudGreet using Resend

import { Resend } from 'resend'
import { logger } from '@/lib/monitoring'
import { resendWithRetry } from '@/lib/retry-logic'

interface EmailData {
  to: string
  subject: string
  html: string
  text?: string
}

// Initialize Resend with API key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export class EmailService {
  private fromEmail: string

  constructor() {
    // Resend requires format: "Name <email@domain.com>" or "email@domain.com"
    const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@cloudgreet.com'
    // Clean any whitespace
    const cleanEmail = email.trim()
    // Format as "CloudGreet <email@domain.com>"
    this.fromEmail = cleanEmail.includes('<') ? cleanEmail : `CloudGreet <${cleanEmail}>`
  }

  async sendEmail(emailData: EmailData): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Check if Resend is configured
      if (!resend) {
        logger.error('Email service not configured', { 
          reason: 'RESEND_API_KEY not set',
          to: emailData.to,
          subject: emailData.subject 
        })
        return { 
          success: false, 
          error: 'Email service not configured. Please set RESEND_API_KEY environment variable.' 
        }
      }

      // Clean the 'to' email address (remove any whitespace)
      const cleanTo = emailData.to.trim()

      // Send email via Resend with retry logic
      const { data, error } = await resendWithRetry(
        () => resend.emails.send({
          from: this.fromEmail,
          to: cleanTo,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text || emailData.subject
        }),
        { to: cleanTo, subject: emailData.subject }
      )

      if (error) {
        logger.error('Failed to send email via Resend', { error, emailData })
        return { 
          success: false, 
          error: error.message || 'Failed to send email' 
        }
      }

      logger.info('Email sent successfully', { 
        to: emailData.to, 
        subject: emailData.subject,
        messageId: data?.id 
      })

      return { success: true, message: 'Email sent successfully' }
    } catch (error) {
      logger.error('Email send error', { error, emailData })
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      }
    }
  }

  async sendWelcomeEmail(to: string, businessName: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const emailData: EmailData = {
      to,
      subject: `Welcome to CloudGreet, ${businessName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .feature { margin: 15px 0; padding-left: 25px; position: relative; }
            .feature:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; }
            .cta { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to CloudGreet!</h1>
            </div>
            <div class="content">
              <p>Hi ${businessName},</p>
              <p>Your AI receptionist is now active and ready to handle calls and messages for your business.</p>
              <p><strong>Key features now available:</strong></p>
              <div class="feature">24/7 AI receptionist</div>
              <div class="feature">Call handling and routing</div>
              <div class="feature">SMS automation</div>
              <div class="feature">Lead qualification</div>
              <div class="feature">Appointment booking</div>
              <div class="feature">Real-time analytics</div>
              <a href="https://cloudgreet.com/dashboard" class="cta">Go to Dashboard</a>
              <p style="margin-top: 30px;">Best regards,<br><strong>The CloudGreet Team</strong></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to CloudGreet! Your AI receptionist is now active for ${businessName}. Visit https://cloudgreet.com/dashboard to get started.`
    }

    return this.sendEmail(emailData)
  }

  async sendNotificationEmail(to: string, subject: string, message: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const emailData: EmailData = {
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h2>CloudGreet Notification</h2>
              <p>${message}</p>
              <p style="margin-top: 30px;">Best regards,<br><strong>The CloudGreet Team</strong></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: message
    }

    return this.sendEmail(emailData)
  }
}

// Export singleton instance
export const emailService = new EmailService()

// Export helper functions
export const sendEmail = async (emailData: EmailData) => {
  return emailService.sendEmail(emailData)
}

export const sendWelcomeEmail = async (to: string, businessName: string) => {
  return emailService.sendWelcomeEmail(to, businessName)
}

export const sendNotificationEmail = async (to: string, subject: string, message: string) => {
  return emailService.sendNotificationEmail(to, subject, message)
}

export const sendContactEmail = async (to: string, subject: string, message: string, fromEmail?: string) => {
  const emailData: EmailData = {
    to,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
          .field { margin: 15px 0; }
          .label { font-weight: bold; color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <h2>New Contact Form Submission</h2>
            <div class="field">
              <span class="label">From:</span> ${fromEmail || 'Contact Form'}
            </div>
            <div class="field">
              <span class="label">Subject:</span> ${subject}
            </div>
            <div class="field">
              <span class="label">Message:</span>
              <p>${message}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `New contact form submission from ${fromEmail || 'Contact Form'}: ${subject} - ${message}`
  }
  return emailService.sendEmail(emailData)
}
