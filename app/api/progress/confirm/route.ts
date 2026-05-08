import { NextRequest, NextResponse } from 'next/server'
import { globalProgressManager } from '@/lib/progress/ProgressManager'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
 // Was unauthenticated. Anyone could mark any progress step
 // confirmed/failed. Lock to authenticated session.
 const auth = await requireAuth(request)
 if (!auth.success) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

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















