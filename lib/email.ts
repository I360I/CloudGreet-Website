/**
 * Email Service
 * Handles sending emails for contact forms, notifications, etc.
 */

import { logger } from './monitoring'

export interface EmailData {
  to: string
  subject: string
  html: string
  text?: string
}

export interface ContactFormData {
  firstName: string
  lastName: string
  email: string
  business?: string
  subject: string
  message: string
}

/**
 * Send email using configured email service
 */
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    // Check if email service is configured
    /**

     * if - Add description here

     * 

     * @param {...any} args - Method parameters

     * @returns {Promise<any>} Method return value

     * @throws {Error} When operation fails

     * 

     * @example

     * ```typescript

     * await this.if(param1, param2)

     * ```

     */

    if (!process.env.EMAIL_SERVICE_URL || !process.env.EMAIL_API_KEY) {
      logger.warn('Email service not configured, skipping email send', {
        to: emailData.to,
        subject: emailData.subject
      })
      return false
    }

    const response = await fetch(process.env.EMAIL_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`
      },
      body: JSON.stringify({
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      })
    })

    /**


     * if - Add description here


     * 


     * @param {...any} args - Method parameters


     * @returns {Promise<any>} Method return value


     * @throws {Error} When operation fails


     * 


     * @example


     * ```typescript


     * await this.if(param1, param2)


     * ```


     */


    if (!response.ok) {
      throw new Error(`Email service responded with ${response.status}`)
    }

    logger.info('Email sent successfully', {
      to: emailData.to,
      subject: emailData.subject
    })

    return true
  } catch (error) {
    logger.error('Failed to send email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      to: emailData.to,
      subject: emailData.subject
    })
    return false
  }
}

/**
 * Send contact form notification email
 */
export async function sendContactFormNotification(contactData: ContactFormData): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cloudgreet.com'
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Contact Form Submission</h2>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #666;">Contact Information</h3>
        <p><strong>Name:</strong> ${contactData.firstName} ${contactData.lastName}</p>
        <p><strong>Email:</strong> ${contactData.email}</p>
        ${contactData.business ? `<p><strong>Business:</strong> ${contactData.business}</p>` : ''}
        <p><strong>Subject:</strong> ${contactData.subject}</p>
      </div>
      
      <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #666;">Message</h3>
        <p style="white-space: pre-wrap;">${contactData.message}</p>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background: #e8f4fd; border-radius: 8px;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          This message was sent from the CloudGreet contact form.
        </p>
      </div>
    </div>
  `

  const text = `
New Contact Form Submission

Contact Information:
Name: ${contactData.firstName} ${contactData.lastName}
Email: ${contactData.email}
${contactData.business ? `Business: ${contactData.business}` : ''}
Subject: ${contactData.subject}

Message:
${contactData.message}

This message was sent from the CloudGreet contact form.
  `

  return await sendEmail({
    to: adminEmail,
    subject: `New Contact Form: ${contactData.subject}`,
    html,
    text
  })
}

/**
 * Send contact form auto-reply
 */
export async function sendContactFormAutoReply(contactData: ContactFormData): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Thank You for Contacting CloudGreet!</h2>
      
      <p>Hi ${contactData.firstName},</p>
      
      <p>Thank you for reaching out to us. We've received your message about "${contactData.subject}" and will get back to you within 24 hours.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #666;">What's Next?</h3>
        <ul>
          <li>Our team will review your message</li>
          <li>We'll respond within 24 hours</li>
          <li>If urgent, call us at (833) 395-6731</li>
        </ul>
      </div>
      
      <p>In the meantime, feel free to explore our <a href="https://cloudgreet.com/features" style="color: #007bff;">features</a> or try our <a href="https://cloudgreet.com/demo" style="color: #007bff;">live demo</a>.</p>
      
      <p>Best regards,<br>The CloudGreet Team</p>
      
      <div style="margin-top: 30px; padding: 15px; background: #e8f4fd; border-radius: 8px;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          This is an automated response. Please do not reply to this email.
        </p>
      </div>
    </div>
  `

  const text = `
Thank You for Contacting CloudGreet!

Hi ${contactData.firstName},

Thank you for reaching out to us. We've received your message about "${contactData.subject}" and will get back to you within 24 hours.

What's Next?
- Our team will review your message
- We'll respond within 24 hours  
- If urgent, call us at (833) 395-6731

In the meantime, feel free to explore our features or try our live demo.

Best regards,
The CloudGreet Team

This is an automated response. Please do not reply to this email.
  `

  return await sendEmail({
    to: contactData.email,
    subject: 'Thank You for Contacting CloudGreet!',
    html,
    text
  })
}
