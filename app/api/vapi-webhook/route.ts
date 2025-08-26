import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ message: "Vapi webhook endpoint is working!" })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("=== VAPI WEBHOOK RECEIVED ===")
    console.log(JSON.stringify(body, null, 2))

    // Verify the webhook secret
    const signature = request.headers.get('x-vapi-secret')
    if (signature !== process.env.VAPI_WEBHOOK_SECRET) {
      console.log("❌ Unauthorized webhook call")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Handle function calls (booking appointments)
    if (body.message?.type === "function-call") {
      const { functionCall } = body.message
      
      if (functionCall.name === "bookAppointment") {
        const { name, phone, email, businessType, appointmentType } = functionCall.parameters
        
        console.log("✅ Booking appointment for:", name)
        
        return NextResponse.json({
          result: `Perfect! I've noted your request for a ${appointmentType || 'consultation'}. Someone from our team will contact you at ${phone || 'your number'} within 24 hours to confirm the details. Thank you for choosing CloudGreet!`
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("💥 Vapi webhook error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
