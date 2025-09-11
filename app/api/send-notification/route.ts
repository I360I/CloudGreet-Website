import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '../../../lib/email'

export async function POST(request: NextRequest) {
  try {
    const { type, userEmail, userName, businessName, data } = await request.json()

    let subject = ''
    let html = ''

    switch (type) {
      case 'booking':
        subject = `🎉 New Booking for ${businessName}!`
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 New Booking!</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
              <h2 style="color: #333; margin-top: 0;">Booking Details</h2>
              <p><strong>Customer:</strong> ${data.customerName}</p>
              <p><strong>Phone:</strong> ${data.customerPhone}</p>
              <p><strong>Service:</strong> ${data.service}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Time:</strong> ${data.time}</p>
              <p><strong>Estimated Value:</strong> $${data.estimatedValue}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; font-size: 14px;">
                This booking was automatically created by your AI receptionist.
              </p>
            </div>
          </div>
        `
        break

      case 'daily_summary':
        subject = `📊 Daily Summary for ${businessName}`
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📊 Daily Summary</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
              <h2 style="color: #333; margin-top: 0;">Today's Performance</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                  <h3 style="margin: 0; color: #667eea; font-size: 24px;">${data.totalCalls}</h3>
                  <p style="margin: 5px 0 0 0; color: #666;">Calls Answered</p>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                  <h3 style="margin: 0; color: #667eea; font-size: 24px;">${data.totalBookings}</h3>
                  <p style="margin: 5px 0 0 0; color: #666;">New Bookings</p>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                  <h3 style="margin: 0; color: #667eea; font-size: 24px;">$${data.estimatedRevenue}</h3>
                  <p style="margin: 5px 0 0 0; color: #666;">Est. Revenue</p>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                  <h3 style="margin: 0; color: #667eea; font-size: 24px;">${data.successRate}%</h3>
                  <p style="margin: 5px 0 0 0; color: #666;">Success Rate</p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; font-size: 14px;">
                Your AI receptionist worked 24/7 to grow your business today.
              </p>
            </div>
          </div>
        `
        break

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    const result = await sendEmail({
      to: userEmail,
      subject,
      html
    })

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Notification sent successfully',
        data: result.data 
      })
    } else {
      return NextResponse.json({ 
        error: 'Failed to send notification',
        details: result
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Notification sending error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
