import nodemailer from 'nodemailer'

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// Verify email configuration
export const verifyEmailConfig = async () => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      // Console warn removed for production
      return false
    }
    
    await transporter.verify()
    // Email configuration verified successfully
    return true
  } catch (error) {
    // Console error removed for production
    return false
  }
}

// Send contact form email
export const sendContactEmail = async (contactData: {
  firstName: string
  lastName: string
  email: string
  business?: string
  subject: string
  message: string
}) => {
  try {
    const isEmailConfigured = await verifyEmailConfig()
    if (!isEmailConfigured) {
      // Console warn removed for production
      return { success: false, error: 'Email service not configured' }
    }

    const mailOptions = {
      from: `"CloudGreet Contact Form" <${process.env.SMTP_USER}>`,
      to: 'support@cloudgreet.com',
      replyTo: contactData.email,
      subject: `Contact Form: ${contactData.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">New Contact Form Submission</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Contact Information</h3>
            <p><strong>Name:</strong> ${contactData.firstName} ${contactData.lastName}</p>
            <p><strong>Email:</strong> ${contactData.email}</p>
            ${contactData.business ? `<p><strong>Business:</strong> ${contactData.business}</p>` : ''}
            <p><strong>Subject:</strong> ${contactData.subject}</p>
          </div>
          
          <div style="background: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Message</h3>
            <p style="white-space: pre-wrap;">${contactData.message}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
            <p style="margin: 0; color: #1976d2; font-size: 14px;">
              This message was sent from the CloudGreet contact form. 
              Reply directly to this email to respond to the customer.
            </p>
          </div>
        </div>
      `,
      text: `
New Contact Form Submission

Contact Information:
Name: ${contactData.firstName} ${contactData.lastName}
Email: ${contactData.email}
${contactData.business ? `Business: ${contactData.business}` : ''}
Subject: ${contactData.subject}

Message:
${contactData.message}

---
This message was sent from the CloudGreet contact form.
Reply directly to this email to respond to the customer.
      `
    }

    const result = await transporter.sendMail(mailOptions)
    // Contact form email sent successfully

    return { success: true, messageId: result.messageId }
  } catch (error) {
    // Failed to send contact form email
    return { success: false, error: 'Failed to send email' }
  }
}

// Send appointment confirmation email
export const sendAppointmentConfirmation = async (appointmentData: {
  customerName: string
  customerEmail: string
  service: string
  scheduledDate: string
  businessName: string
  businessPhone: string
  address?: string
  notes?: string
}) => {
  try {
    const isEmailConfigured = await verifyEmailConfig()
    if (!isEmailConfigured) {
      // Console warn removed for production
      return { success: false, error: 'Email service not configured' }
    }

    const formattedDate = new Date(appointmentData.scheduledDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const mailOptions = {
      from: `"${appointmentData.businessName}" <${process.env.SMTP_USER}>`,
      to: appointmentData.customerEmail,
      subject: `Appointment Confirmation - ${appointmentData.service}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">Appointment Confirmed!</h2>
          
          <p>Dear ${appointmentData.customerName},</p>
          
          <p>Your appointment has been successfully scheduled with ${appointmentData.businessName}.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Appointment Details</h3>
            <p><strong>Service:</strong> ${appointmentData.service}</p>
            <p><strong>Date & Time:</strong> ${formattedDate}</p>
            ${appointmentData.address ? `<p><strong>Address:</strong> ${appointmentData.address}</p>` : ''}
            <p><strong>Business Phone:</strong> ${appointmentData.businessPhone}</p>
            ${appointmentData.notes ? `<p><strong>Notes:</strong> ${appointmentData.notes}</p>` : ''}
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>Important:</strong> If you need to reschedule or cancel this appointment, 
              please contact us at ${appointmentData.businessPhone} at least 24 hours in advance.
            </p>
          </div>
          
          <p>We look forward to serving you!</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              This is an automated message from ${appointmentData.businessName}'s AI receptionist system.
            </p>
          </div>
        </div>
      `,
      text: `
Appointment Confirmed!

Dear ${appointmentData.customerName},

Your appointment has been successfully scheduled with ${appointmentData.businessName}.

Appointment Details:
Service: ${appointmentData.service}
Date & Time: ${formattedDate}
${appointmentData.address ? `Address: ${appointmentData.address}` : ''}
Business Phone: ${appointmentData.businessPhone}
${appointmentData.notes ? `Notes: ${appointmentData.notes}` : ''}

Important: If you need to reschedule or cancel this appointment, 
please contact us at ${appointmentData.businessPhone} at least 24 hours in advance.

We look forward to serving you!

---
This is an automated message from ${appointmentData.businessName}'s AI receptionist system.
      `
    }

    const result = await transporter.sendMail(mailOptions)
    // Appointment confirmation email sent successfully

    return { success: true, messageId: result.messageId }
  } catch (error) {
    // Failed to send appointment confirmation email
    return { success: false, error: 'Failed to send email' }
  }
}

// Send missed call notification email
export const sendMissedCallNotification = async (callData: {
  businessName: string
  businessEmail: string
  callerNumber: string
  callerName?: string
  callTime: string
  duration?: number
  transcript?: string
}) => {
  try {
    const isEmailConfigured = await verifyEmailConfig()
    if (!isEmailConfigured) {
      // Console warn removed for production
      return { success: false, error: 'Email service not configured' }
    }

    const formattedTime = new Date(callData.callTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const mailOptions = {
      from: `"CloudGreet AI" <${process.env.SMTP_USER}>`,
      to: callData.businessEmail,
      subject: `Missed Call Alert - ${callData.callerNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">Missed Call Alert</h2>
          
          <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
            <h3 style="color: #333; margin-top: 0;">Call Details</h3>
            <p><strong>Caller:</strong> ${callData.callerName || 'Unknown'}</p>
            <p><strong>Phone Number:</strong> ${callData.callerNumber}</p>
            <p><strong>Call Time:</strong> ${formattedTime}</p>
            ${callData.duration ? `<p><strong>Duration:</strong> ${callData.duration} seconds</p>` : ''}
          </div>
          
          ${callData.transcript ? `
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Call Transcript</h3>
            <p style="white-space: pre-wrap; background: #fff; padding: 15px; border-radius: 4px;">${callData.transcript}</p>
          </div>
          ` : ''}
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1976d2;">
              <strong>Action Required:</strong> Please follow up with this caller as soon as possible. 
              You can call them back or send an SMS through your CloudGreet dashboard.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              This alert was sent by your CloudGreet AI receptionist system.
            </p>
          </div>
        </div>
      `,
      text: `
Missed Call Alert

Call Details:
Caller: ${callData.callerName || 'Unknown'}
Phone Number: ${callData.callerNumber}
Call Time: ${formattedTime}
${callData.duration ? `Duration: ${callData.duration} seconds` : ''}

${callData.transcript ? `
Call Transcript:
${callData.transcript}
` : ''}

Action Required: Please follow up with this caller as soon as possible. 
You can call them back or send an SMS through your CloudGreet dashboard.

---
This alert was sent by your CloudGreet AI receptionist system.
      `
    }

    const result = await transporter.sendMail(mailOptions)
    // Missed call notification email sent successfully

    return { success: true, messageId: result.messageId }
  } catch (error) {
    // Failed to send missed call notification email
    return { success: false, error: 'Failed to send email' }
  }
}

// Send weekly report email
export const sendWeeklyReport = async (reportData: {
  businessName: string
  businessEmail: string
  weekStart: string
  weekEnd: string
  totalCalls: number
  completedCalls: number
  missedCalls: number
  appointmentsBooked: number
  estimatedRevenue: number
  topServices: Array<{ service: string; count: number }>
}) => {
  try {
    const isEmailConfigured = await verifyEmailConfig()
    if (!isEmailConfigured) {
      // Console warn removed for production
      return { success: false, error: 'Email service not configured' }
    }

    const mailOptions = {
      from: `"CloudGreet Analytics" <${process.env.SMTP_USER}>`,
      to: reportData.businessEmail,
      subject: `Weekly Report - ${reportData.businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">Weekly Performance Report</h2>
          
          <p>Dear ${reportData.businessName} Team,</p>
          
          <p>Here's your weekly performance summary for ${reportData.weekStart} to ${reportData.weekEnd}:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Key Metrics</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div style="text-align: center; padding: 15px; background: #fff; border-radius: 8px;">
                <h4 style="margin: 0; color: #8B5CF6; font-size: 24px;">${reportData.totalCalls}</h4>
                <p style="margin: 5px 0 0 0; color: #666;">Total Calls</p>
              </div>
              <div style="text-align: center; padding: 15px; background: #fff; border-radius: 8px;">
                <h4 style="margin: 0; color: #10b981; font-size: 24px;">${reportData.completedCalls}</h4>
                <p style="margin: 5px 0 0 0; color: #666;">Completed</p>
              </div>
              <div style="text-align: center; padding: 15px; background: #fff; border-radius: 8px;">
                <h4 style="margin: 0; color: #f59e0b; font-size: 24px;">${reportData.appointmentsBooked}</h4>
                <p style="margin: 5px 0 0 0; color: #666;">Appointments</p>
              </div>
              <div style="text-align: center; padding: 15px; background: #fff; border-radius: 8px;">
                <h4 style="margin: 0; color: #10b981; font-size: 24px;">$${reportData.estimatedRevenue.toLocaleString()}</h4>
                <p style="margin: 5px 0 0 0; color: #666;">Est. Revenue</p>
              </div>
            </div>
          </div>
          
          ${reportData.topServices.length > 0 ? `
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Top Services This Week</h3>
            <ul style="list-style: none; padding: 0;">
              ${reportData.topServices.map(service => `
                <li style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                  <strong>${service.service}</strong> - ${service.count} calls
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>Great job!</strong> Your AI receptionist is helping you capture more leads and grow your business.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              This report was generated by your CloudGreet AI receptionist system.
            </p>
          </div>
        </div>
      `,
      text: `
Weekly Performance Report

Dear ${reportData.businessName} Team,

Here's your weekly performance summary for ${reportData.weekStart} to ${reportData.weekEnd}:

Key Metrics:
- Total Calls: ${reportData.totalCalls}
- Completed Calls: ${reportData.completedCalls}
- Missed Calls: ${reportData.missedCalls}
- Appointments Booked: ${reportData.appointmentsBooked}
- Estimated Revenue: $${reportData.estimatedRevenue.toLocaleString()}

${reportData.topServices.length > 0 ? `
Top Services This Week:
${reportData.topServices.map(service => `- ${service.service}: ${service.count} calls`).join('\n')}
` : ''}

Great job! Your AI receptionist is helping you capture more leads and grow your business.

---
This report was generated by your CloudGreet AI receptionist system.
      `
    }

    const result = await transporter.sendMail(mailOptions)
    // Weekly report email sent successfully

    return { success: true, messageId: result.messageId }
  } catch (error) {
    // Failed to send weekly report email
    return { success: false, error: 'Failed to send email' }
  }
}
