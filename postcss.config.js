import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Vapi webhook received:", body)

    // Verify the webhook secret
    const signature = request.headers.get('x-vapi-secret')
    if (signature !== process.env.VAPI_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Handle different webhook events
    switch (body.message?.type) {
      case "function-call":
        return handleFunctionCall(body)
      case "end-of-call-report":
        return handleCallEnd(body)
      default:
        return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error("Vapi webhook error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}

async function handleFunctionCall(body: any) {
  const { functionCall } = body.message
  
  if (functionCall.name === "bookAppointment") {
    const { name, phone, email, businessType, appointmentType, preferredDate, preferredTime } = functionCall.parameters
    
    console.log("New booking:", { name, phone, email, businessType, appointmentType })
    
    // For now, just log the booking (we'll add database saving later)
    return NextResponse.json({
      result: `Perfect! I've scheduled your ${appointmentType} for ${preferredDate || 'soon'}. You'll receive a confirmation email at ${email}. Thank you for choosing CloudGreet!`
    })
  }

  return NextResponse.json({ result: "I'll help you with that." })
}

async function handleCallEnd(body: any) {
  const callData = body.message.call
  console.log("Call ended:", callData)
  
  // Log call metrics
  return NextResponse.json({ success: true })
}
