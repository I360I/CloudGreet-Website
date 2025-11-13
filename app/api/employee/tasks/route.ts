import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth-middleware'
import { completeTask, listSalesTasks } from '@/lib/sales/activity-service'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireEmployee(request, { allowManager: true })
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const scopeParam = searchParams.get('scope')
    const limitParam = searchParams.get('limit')

    const scope = scopeParam === 'team' ? 'team' : 'self'
    const limit = limitParam ? Math.min(Number(limitParam) || 25, 100) : undefined

    const tasks = await listSalesTasks({
      userId: auth.userId,
      role: auth.role ?? 'user',
      businessId: auth.businessId,
      status,
      scope,
      limit
    })

    return NextResponse.json({ success: true, tasks })
  } catch (error) {
    logger.error('Failed to load sales tasks', { error })
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireEmployee(request, { allowManager: true })
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    if (!body?.taskId || body.status !== 'completed') {
      return NextResponse.json({ error: 'taskId and status=completed required' }, { status: 400 })
    }

    await completeTask(body.taskId, auth.userId, auth.role ?? 'user')

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to update task', { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 400 }
    )
  }
}


