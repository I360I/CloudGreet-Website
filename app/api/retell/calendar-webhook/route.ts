import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log the incoming webhook for debugging
    console.log('Retell Calendar Webhook received:', JSON.stringify(body, null, 2))

    const { event_type, call_id, agent_id, customer_phone_number, transcript, end_reason } = body

    // Handle different event types
    switch (event_type) {
      case 'call_ended':
        await handleCallEnded({
          call_id,
          agent_id,
          customer_phone_number,
          transcript,
          end_reason
        })
        break

      case 'call_analyzed':
        await handleCallAnalyzed({
          call_id,
          agent_id,
          customer_phone_number,
          transcript
        })
        break

      default:
        console.log(`Unhandled event type: ${event_type}`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error processing Retell calendar webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

async function handleCallEnded(data: any) {
  const { call_id, agent_id, customer_phone_number, transcript, end_reason } = data
  
  console.log(`Call ended: ${call_id} - ${end_reason}`)
  
  // Check if the call resulted in a booking request
  if (transcript && containsBookingRequest(transcript)) {
    await processBookingRequest({
      call_id,
      agent_id,
      customer_phone_number,
      transcript
    })
  }
}

async function handleCallAnalyzed(data: any) {
  const { call_id, agent_id, customer_phone_number, transcript } = data
  
  console.log(`Call analyzed: ${call_id}`)
  
  // Extract booking information from transcript
  const bookingInfo = extractBookingInfo(transcript)
  
  if (bookingInfo) {
    await processBookingRequest({
      call_id,
      agent_id,
      customer_phone_number,
      transcript,
      bookingInfo
    })
  }
}

function containsBookingRequest(transcript: string): boolean {
  const bookingKeywords = [
    'book', 'schedule', 'appointment', 'meeting', 'available', 'time slot',
    'calendar', 'when can', 'what time', 'reserve', 'set up'
  ]
  
  const lowerTranscript = transcript.toLowerCase()
  return bookingKeywords.some(keyword => lowerTranscript.includes(keyword))
}

function extractBookingInfo(transcript: string): any {
  // Simple extraction logic - in production, you'd use more sophisticated NLP
  const lines = transcript.split('\n')
  const bookingInfo: any = {}
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase()
    
    // Extract date
    if (lowerLine.includes('date') || lowerLine.includes('day')) {
      const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
      if (dateMatch) {
        bookingInfo.date = dateMatch[1]
      }
    }
    
    // Extract time
    if (lowerLine.includes('time') || lowerLine.includes('hour')) {
      const timeMatch = line.match(/(\d{1,2}:\d{2}|\d{1,2}\s*(am|pm))/i)
      if (timeMatch) {
        bookingInfo.time = timeMatch[1]
      }
    }
    
    // Extract service type
    if (lowerLine.includes('service') || lowerLine.includes('need')) {
      if (lowerLine.includes('hvac')) bookingInfo.service = 'HVAC Service'
      else if (lowerLine.includes('paint')) bookingInfo.service = 'Painting Consultation'
      else if (lowerLine.includes('roof')) bookingInfo.service = 'Roofing Inspection'
      else bookingInfo.service = 'General Consultation'
    }
    
    // Extract customer name
    if (lowerLine.includes('name is') || lowerLine.includes('i am')) {
      const nameMatch = line.match(/(?:name is|i am)\s+([a-zA-Z\s]+)/i)
      if (nameMatch) {
        bookingInfo.customerName = nameMatch[1].trim()
      }
    }
  }
  
  return Object.keys(bookingInfo).length > 0 ? bookingInfo : null
}

async function processBookingRequest(data: any) {
  const { call_id, agent_id, customer_phone_number, transcript, bookingInfo } = data
  
  try {
    // Get available time slots
    const availableSlotsResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/calendar/available-slots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        date: bookingInfo?.date || new Date().toISOString().split('T')[0],
        duration: getServiceDuration(bookingInfo?.service || 'General Consultation')
      }),
    })
    
    if (availableSlotsResponse.ok) {
      const slotsData = await availableSlotsResponse.json()
      
      if (slotsData.available && slotsData.availableSlots.length > 0) {
        // Book the first available slot
        const selectedSlot = slotsData.availableSlots[0]
        
        const bookingResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/calendar/book-appointment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            startTime: selectedSlot.start,
            endTime: selectedSlot.end,
            summary: `${bookingInfo?.service || 'General Consultation'} - ${bookingInfo?.customerName || 'Customer'}`,
            description: `Appointment booked via AI receptionist\nCall ID: ${call_id}\nCustomer Phone: ${customer_phone_number}\nTranscript: ${transcript}`,
            customerName: bookingInfo?.customerName || 'Customer',
            customerPhone: customer_phone_number,
            serviceType: bookingInfo?.service || 'General Consultation'
          }),
        })
        
        if (bookingResponse.ok) {
          const bookingData = await bookingResponse.json()
          console.log('Appointment booked successfully:', bookingData)
          
          // Send confirmation to customer (you could integrate with SMS or email here)
          await sendBookingConfirmation({
            customerPhone: customer_phone_number,
            appointmentDetails: bookingData.event,
            serviceType: bookingInfo?.service || 'General Consultation'
          })
        }
      } else {
        console.log('No available slots found for the requested date')
        // Could send a message to customer about alternative dates
      }
    }
    
  } catch (error) {
    console.error('Error processing booking request:', error)
  }
}

function getServiceDuration(serviceType: string): number {
  const durations: { [key: string]: number } = {
    'HVAC Service': 90,
    'Painting Consultation': 60,
    'Roofing Inspection': 120,
    'General Consultation': 30
  }
  
  return durations[serviceType] || 60
}

async function sendBookingConfirmation(data: any) {
  const { customerPhone, appointmentDetails, serviceType } = data
  
  // In a real implementation, you would:
  // 1. Send SMS confirmation via Twilio or similar
  // 2. Send email confirmation
  // 3. Update your database with the booking
  
  console.log('Sending booking confirmation:', {
    customerPhone,
    appointmentDetails,
    serviceType
  })
  
  // Example SMS message
  const message = `Your ${serviceType} appointment has been confirmed for ${new Date(appointmentDetails.start?.dateTime).toLocaleString()}. You will receive a calendar invite shortly.`
  
  console.log('Confirmation message:', message)
}
