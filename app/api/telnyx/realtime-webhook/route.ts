import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    logger.info('Premium realtime webhook received', { 
      session_id: body.session_id,
      event: body.event,
      call_id: body.call_id
    })

    // Handle different realtime events
    switch (body.event) {
      case 'session.created':
        logger.info('Premium realtime session created', { 
          session_id: body.session_id 
        })
        break
        
      case 'session.updated':
        logger.info('Premium realtime session updated', { 
          session_id: body.session_id 
        })
        break
        
      case 'session.ended':
        logger.info('Premium realtime session ended', { 
          session_id: body.session_id,
          reason: body.reason
        })
        
        // Store call data in database
        if (body.call_id) {
          await supabaseAdmin
            .from('calls')
            .insert({
              business_id: '00000000-0000-0000-0000-000000000001', // Demo business
              call_id: body.call_id,
              customer_phone: body.from || 'unknown',
              call_status: 'completed',
              ai_session_id: body.session_id,
              transcript: body.transcript || '',
              call_duration: body.duration || 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
        }
        break
        
      case 'conversation.item.created':
        logger.info('Premium conversation item created', { 
          session_id: body.session_id,
          type: body.type
        })
        break
        
      case 'conversation.item.updated':
        logger.info('Premium conversation item updated', { 
          session_id: body.session_id,
          type: body.type
        })
        break
        
      default:
        logger.info('Premium realtime event received', { 
          event: body.event,
          session_id: body.session_id
        })
    }

    return NextResponse.json({ 
      status: 'received',
      message: 'Premium realtime webhook processed'
    })

  } catch (error) {
    logger.error('Premium realtime webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({ 
      error: 'Failed to process premium realtime webhook' 
    }, { status: 500 })
  }
}
