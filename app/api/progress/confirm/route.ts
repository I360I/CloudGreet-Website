import { NextRequest, NextResponse } from 'next/server'
import { globalProgressManager } from '@/lib/progress/ProgressManager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      stepId: string
      requestId: string
      status: 'confirmed' | 'failed'
      error?: string
    }

    if (!body?.stepId || !body?.requestId || !body?.status) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    if (body.status === 'confirmed') {
      const step = globalProgressManager.confirm(body.stepId, body.requestId)
      return NextResponse.json({ ok: true, step })
    }

    const step = globalProgressManager.fail(body.stepId, body.requestId, body.error ?? 'Unknown error')
    return NextResponse.json({ ok: true, step })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}











