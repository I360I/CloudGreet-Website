import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from = 'onboarding@resend.dev' }: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email sending error:', error)
    throw error
  }
}

export default sendEmail

// Additional email functions
export async function sendWelcomeEmail(to: string, userData: any) {
  const html = `
    <h1>Welcome to CloudGreet!</h1>
    <p>Hi ${userData.name},</p>
    <p>Welcome to CloudGreet! Your account has been created successfully.</p>
    <p>You can now log in and start using our AI receptionist service.</p>
    <p>Best regards,<br>The CloudGreet Team</p>
  `
  
  return sendEmail({
    to,
    subject: 'Welcome to CloudGreet!',
    html
  })
}

export async function sendOnboardingCompleteEmail(to: string, businessData: any) {
  const html = `
    <h1>Onboarding Complete!</h1>
    <p>Hi ${businessData.ownerName},</p>
    <p>Congratulations! Your CloudGreet onboarding for ${businessData.businessName} is now complete.</p>
    <p>Your AI receptionist is ready to handle calls and book appointments.</p>
    <p>Best regards,<br>The CloudGreet Team</p>
  `
  
  return sendEmail({
    to,
    subject: 'CloudGreet Onboarding Complete!',
    html
  })
}

export async function sendNewBookingNotification(to: string, bookingData: any) {
  const html = `
    <h1>New Booking Received!</h1>
    <p>You have received a new booking:</p>
    <ul>
      <li><strong>Customer:</strong> ${bookingData.customerName}</li>
      <li><strong>Service:</strong> ${bookingData.service}</li>
      <li><strong>Date:</strong> ${bookingData.date}</li>
      <li><strong>Time:</strong> ${bookingData.time}</li>
    </ul>
    <p>Best regards,<br>The CloudGreet Team</p>
  `
  
  return sendEmail({
    to,
    subject: 'New Booking Received',
    html
  })
}

export async function sendCallSummaryEmail(to: string, callData: any) {
  const html = `
    <h1>Call Summary</h1>
    <p>Here's a summary of your recent call:</p>
    <ul>
      <li><strong>Duration:</strong> ${callData.duration}</li>
      <li><strong>Outcome:</strong> ${callData.outcome}</li>
      <li><strong>Notes:</strong> ${callData.notes}</li>
    </ul>
    <p>Best regards,<br>The CloudGreet Team</p>
  `
  
  return sendEmail({
    to,
    subject: 'Call Summary',
    html
  })
}