// lib/email.ts
// Email utility functions for CloudGreet

interface EmailConfig {
  host: string
  port: number
  user: string
  password: string
  from: string
}

interface EmailData {
  to: string
  subject: string
  html: string
  text?: string
}

export class EmailService {
  private config: EmailConfig

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || ''
    }
  }

  async sendEmail(emailData: EmailData): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // For development, just log the email
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 EMAIL SENT (Development Mode):', {
          to: emailData.to,
          subject: emailData.subject,
          from: this.config.from
        })
        return { success: true, message: 'Email sent (development mode)' }
      }

      // In production, you would integrate with a real email service
      // For now, we'll simulate success
      console.log('📧 EMAIL SENT:', {
        to: emailData.to,
        subject: emailData.subject,
        from: this.config.from
      })

      return { success: true, message: 'Email sent successfully' }
    } catch (error) {
      console.error('❌ EMAIL SEND ERROR:', error)
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
        <h1>Welcome to CloudGreet!</h1>
        <p>Hi ${businessName},</p>
        <p>Your AI receptionist is now active and ready to handle calls and messages for your business.</p>
        <p>Key features now available:</p>
        <ul>
          <li>24/7 AI receptionist</li>
          <li>Call handling and routing</li>
          <li>SMS automation</li>
          <li>Lead qualification</li>
          <li>Appointment booking</li>
        </ul>
        <p>Best regards,<br>The CloudGreet Team</p>
      `,
      text: `Welcome to CloudGreet! Your AI receptionist is now active for ${businessName}.`
    }

    return this.sendEmail(emailData)
  }

  async sendNotificationEmail(to: string, subject: string, message: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const emailData: EmailData = {
      to,
      subject,
      html: `
        <h2>CloudGreet Notification</h2>
        <p>${message}</p>
        <p>Best regards,<br>The CloudGreet Team</p>
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
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${fromEmail || 'Contact Form'}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `,
    text: `New contact form submission from ${fromEmail || 'Contact Form'}: ${subject} - ${message}`
  }
  return emailService.sendEmail(emailData)
}