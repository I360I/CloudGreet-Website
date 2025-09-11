import { NextRequest, NextResponse } from 'next/server'
import { withPublic } from '@/lib/middleware'
import { Logger } from '@/lib/logger'
import { db } from '@/lib/database/connection'
import { handleCallEvent } from '@/lib/azure-communication'

async function handleAzureWebhook(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate webhook signature (in production, verify Azure signature)
    const signature = request.headers.get('x-azure-signature')
    if (!signature && process.env.NODE_ENV === 'production') {
      Logger.warn('Azure webhook signature missing', { body })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log the webhook event
    Logger.info('Azure webhook received', { 
      eventType: body.eventType,
      callConnectionId: body.callConnectionId,
      timestamp: body.timestamp
    })

    // Handle different event types
    switch (body.eventType) {
      case 'CallConnected':
        await handleCallConnected(body)
        break
      case 'CallDisconnected':
        await handleCallDisconnected(body)
        break
      case 'PlayCompleted':
        await handlePlayCompleted(body)
        break
      case 'RecognizeCompleted':
        await handleRecognizeCompleted(body)
        break
      case 'IncomingCall':
        await handleIncomingCall(body)
        break
      default:
        Logger.warn('Unknown Azure webhook event type', { eventType: body.eventType })
    }

    // Process the event through Azure Communication handler
    handleCallEvent(body)

    return NextResponse.json({ success: true })

  } catch (error) {
    Logger.error('Azure webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      body: await request.text()
    })
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCallConnected(event: any) {
  try {
    // Update call status in database
    await db.query(
      'UPDATE calls SET status = $1, start_time = $2 WHERE call_connection_id = $3',
      ['connected', new Date(), event.callConnectionId]
    )

    Logger.info('Call connected', { callConnectionId: event.callConnectionId })
  } catch (error) {
    Logger.error('Error handling call connected', { error, callConnectionId: event.callConnectionId })
  }
}

async function handleCallDisconnected(event: any) {
  try {
    // Update call status and calculate duration
    const call = await db.query(
      'SELECT start_time FROM calls WHERE call_connection_id = $1',
      [event.callConnectionId]
    )

    if (call.rows.length > 0) {
      const startTime = new Date(call.rows[0].start_time)
      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      await db.query(
        'UPDATE calls SET status = $1, end_time = $2, duration_seconds = $3 WHERE call_connection_id = $4',
        ['completed', endTime, duration, event.callConnectionId]
      )

      Logger.info('Call disconnected', { 
        callConnectionId: event.callConnectionId,
        duration: `${duration}s`
      })
    }
  } catch (error) {
    Logger.error('Error handling call disconnected', { error, callConnectionId: event.callConnectionId })
  }
}

async function handlePlayCompleted(event: any) {
  try {
    Logger.info('Audio playback completed', { 
      callConnectionId: event.callConnectionId,
      operationId: event.operationId
    })
  } catch (error) {
    Logger.error('Error handling play completed', { error, callConnectionId: event.callConnectionId })
  }
}

async function handleRecognizeCompleted(event: any) {
  try {
    // Store speech recognition results
    if (event.recognitionResult) {
      await db.query(
        'INSERT INTO ai_conversations (call_id, turn_number, speaker, message, intent, entities, confidence_score) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          event.callConnectionId, // This would be the actual call ID
          1, // Turn number
          'user',
          event.recognitionResult.text,
          event.recognitionResult.intent,
          JSON.stringify(event.recognitionResult.entities),
          event.recognitionResult.confidence
        ]
      )

      Logger.info('Speech recognition completed', { 
        callConnectionId: event.callConnectionId,
        text: event.recognitionResult.text,
        confidence: event.recognitionResult.confidence
      })
    }
  } catch (error) {
    Logger.error('Error handling recognize completed', { error, callConnectionId: event.callConnectionId })
  }
}

async function handleIncomingCall(event: any) {
  try {
    // Create new call record
    const result = await db.query(
      'INSERT INTO calls (business_id, call_connection_id, caller_number, direction, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [
        'temp-business-id', // This would come from phone number lookup
        event.callConnectionId,
        event.from?.phoneNumber,
        'inbound',
        'ringing'
      ]
    )

    Logger.info('Incoming call received', { 
      callConnectionId: event.callConnectionId,
      callerNumber: event.from?.phoneNumber,
      callId: result.rows[0]?.id
    })
  } catch (error) {
    Logger.error('Error handling incoming call', { error, callConnectionId: event.callConnectionId })
  }
}

export const POST = withPublic(handleAzureWebhook)
