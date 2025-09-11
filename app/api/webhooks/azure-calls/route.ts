import { NextRequest, NextResponse } from 'next/server'

async function handleAzureWebhook(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate webhook signature (in production, verify Azure signature)
    const signature = request.headers.get('x-azure-signature')
    if (!signature && process.env.NODE_ENV === 'production') {
      console.warn('Azure webhook signature missing', { body })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log the webhook event
    console.log('Azure webhook received', { 
      eventType: body.eventType,
      callConnectionId: body.callConnectionId,
      timestamp: body.timestamp
    })

    // Handle different event types
    switch (body.eventType) {
      case 'CallConnected':
        console.log('Call connected', { callConnectionId: body.callConnectionId })
        break
      case 'CallDisconnected':
        console.log('Call disconnected', { callConnectionId: body.callConnectionId })
        break
      case 'PlayCompleted':
        console.log('Audio playback completed', { callConnectionId: body.callConnectionId })
        break
      case 'RecognizeCompleted':
        console.log('Speech recognition completed', { callConnectionId: body.callConnectionId })
        break
      case 'IncomingCall':
        console.log('Incoming call received', { callConnectionId: body.callConnectionId })
        break
      default:
        console.warn('Unknown Azure webhook event type', { eventType: body.eventType })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Azure webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

export const POST = handleAzureWebhook