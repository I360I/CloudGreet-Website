import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const updateSchema = z.object({
  tone: z.enum(['professional', 'friendly', 'casual']).optional(),
  greetingMessage: z.string().min(10).max(500).optional(),
  escalationMessage: z.string().min(10).max(500).optional(),
  confidenceThreshold: z.number().min(0.1).max(0.99).optional(),
  maxSilenceSeconds: z.number().min(1).max(20).optional(),
  additionalInstructions: z.string().max(2000).optional()
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select(
        'tone, greeting_message, ai_confidence_threshold, ai_max_silence_seconds, ai_escalation_message, ai_additional_instructions'
      )
      .eq('id', auth.businessId)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      settings: {
        tone: data?.tone ?? 'professional',
        greetingMessage: data?.greeting_message ?? 'Hello! Thanks for calling.',
        confidenceThreshold: Number(data?.ai_confidence_threshold ?? 0.6),
        maxSilenceSeconds: data?.ai_max_silence_seconds ?? 5,
        escalationMessage:
          data?.ai_escalation_message ?? "I'm going to connect you with a teammate who can help further.",
        additionalInstructions: data?.ai_additional_instructions ?? ''
      }
    })
  } catch (error) {
    logger.error('Failed to load AI settings', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to load AI settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = updateSchema.parse(await request.json())
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (payload.tone !== undefined) updates.tone = payload.tone
    if (payload.greetingMessage !== undefined) updates.greeting_message = payload.greetingMessage
    if (payload.escalationMessage !== undefined) updates.ai_escalation_message = payload.escalationMessage
    if (payload.confidenceThreshold !== undefined) updates.ai_confidence_threshold = payload.confidenceThreshold
    if (payload.maxSilenceSeconds !== undefined) updates.ai_max_silence_seconds = payload.maxSilenceSeconds
    if (payload.additionalInstructions !== undefined) {
      updates.ai_additional_instructions = payload.additionalInstructions || null
    }

    const { error } = await supabaseAdmin
      .from('businesses')
      .update(updates)
      .eq('id', auth.businessId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 422 })
    }

    logger.error('Failed to update AI settings', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 })
  }
}


