import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { retellAgentManager } from '@/lib/retell-agent-manager'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Edge-case CRUD for the rep portal. Each edit re-pushes the agent's
 * general_prompt to Retell so the change is live immediately.
 *
 * POST   /api/sales/clients/[id]/agent/edge-cases  { label?, instruction }
 * DELETE /api/sales/clients/[id]/agent/edge-cases?case_id=...
 * PUT    /api/sales/clients/[id]/agent/edge-cases  { cases: [{...}] }   (replace all)
 *
 * Each case is { id, label, instruction, created_at, created_by_rep_id }.
 * Caps:
 *   - max 25 cases per business
 *   - max 500 chars per instruction
 *   - max 60 chars per label
 */

const MAX_CASES = 25
const MAX_INSTRUCTION = 500
const MAX_LABEL = 60

type EdgeCase = {
  id: string
  label: string
  instruction: string
  created_at: string
  created_by_rep_id?: string
}

async function loadOwned(businessId: string, repId: string) {
  const { data } = await supabaseAdmin
    .from('businesses')
    .select('id, agent_edge_cases')
    .eq('id', businessId)
    .eq('rep_id', repId)
    .maybeSingle()
  return data
}

async function saveAndSync(
  businessId: string, repId: string, cases: EdgeCase[],
): Promise<{ ok: true; retell_warning: string | null } | { ok: false; status: number; error: string }> {
  const { error } = await supabaseAdmin
    .from('businesses')
    .update({
      agent_edge_cases: cases as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId)
  if (error) {
    return { ok: false, status: 500, error: error.message }
  }
  // Sync to Retell - passing agentEdgeCases triggers a prompt push.
  // Failures are non-fatal for the DB save but the rep needs to KNOW
  // when the live agent didn't actually pick up the change, otherwise
  // they'll show a customer a behavior the agent isn't doing.
  let retellWarning: string | null = null
  try {
    await retellAgentManager().updateBusinessAgent(businessId, {
      agentEdgeCases: cases.map((c) => ({ label: c.label, instruction: c.instruction })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    logger.warn('Edge-case Retell sync failed (DB updated)', {
      businessId, repId, error: msg,
    })
    retellWarning = msg
  }
  return { ok: true, retell_warning: retellWarning }
}

/* --- POST: add one --- */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const business = await loadOwned(params.id, auth.userId)
  if (!business) return NextResponse.json({ error: 'Not your client' }, { status: 404 })

  const body = await request.json().catch(() => ({} as any))
  const instruction = (body?.instruction ?? '').toString().trim()
  const label = (body?.label ?? '').toString().trim().slice(0, MAX_LABEL)

  if (!instruction) {
    return NextResponse.json({ error: 'instruction required' }, { status: 400 })
  }
  if (instruction.length > MAX_INSTRUCTION) {
    return NextResponse.json({
      error: `instruction must be ≤${MAX_INSTRUCTION} chars`,
    }, { status: 400 })
  }

  const current: EdgeCase[] = Array.isArray(business.agent_edge_cases)
    ? (business.agent_edge_cases as EdgeCase[])
    : []
  if (current.length >= MAX_CASES) {
    return NextResponse.json({
      error: `Edge-case cap reached (${MAX_CASES}). Remove one before adding another.`,
    }, { status: 409 })
  }

  const next: EdgeCase[] = [
    ...current,
    {
      id: crypto.randomBytes(8).toString('base64url'),
      label,
      instruction,
      created_at: new Date().toISOString(),
      created_by_rep_id: auth.userId,
    },
  ]

  const r = await saveAndSync(params.id, auth.userId, next)
  if (r.ok === false) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ success: true, edge_cases: next, retell_warning: r.retell_warning })
}

/* --- DELETE: remove one --- */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  const business = await loadOwned(params.id, auth.userId)
  if (!business) return NextResponse.json({ error: 'Not your client' }, { status: 404 })

  const caseId = new URL(request.url).searchParams.get('case_id')
  if (!caseId) return NextResponse.json({ error: 'case_id required' }, { status: 400 })

  const current: EdgeCase[] = Array.isArray(business.agent_edge_cases)
    ? (business.agent_edge_cases as EdgeCase[])
    : []
  const next = current.filter((c) => c.id !== caseId)
  if (next.length === current.length) {
    return NextResponse.json({ error: 'Edge case not found' }, { status: 404 })
  }

  const r = await saveAndSync(params.id, auth.userId, next)
  if (r.ok === false) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ success: true, edge_cases: next, retell_warning: r.retell_warning })
}

/* --- PUT: bulk replace (used for reorder + edits in place) --- */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  const business = await loadOwned(params.id, auth.userId)
  if (!business) return NextResponse.json({ error: 'Not your client' }, { status: 404 })

  const body = await request.json().catch(() => ({} as any))
  const incoming = Array.isArray(body?.cases) ? body.cases : null
  if (!incoming) return NextResponse.json({ error: 'cases array required' }, { status: 400 })
  if (incoming.length > MAX_CASES) {
    return NextResponse.json({ error: `Max ${MAX_CASES} cases` }, { status: 400 })
  }

  const cleaned: EdgeCase[] = incoming
    .map((c: any) => ({
      id: typeof c.id === 'string' && c.id ? c.id : crypto.randomBytes(8).toString('base64url'),
      label: (c.label ?? '').toString().trim().slice(0, MAX_LABEL),
      instruction: (c.instruction ?? '').toString().trim().slice(0, MAX_INSTRUCTION),
      created_at: typeof c.created_at === 'string' ? c.created_at : new Date().toISOString(),
      created_by_rep_id: c.created_by_rep_id || auth.userId,
    }))
    .filter((c: EdgeCase) => c.instruction)

  const r = await saveAndSync(params.id, auth.userId, cleaned)
  if (r.ok === false) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ success: true, edge_cases: cleaned, retell_warning: r.retell_warning })
}

/* --- PATCH: re-push current rules to Retell (retry button after a sync error) --- */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  const business = await loadOwned(params.id, auth.userId)
  if (!business) return NextResponse.json({ error: 'Not your client' }, { status: 404 })
  const current: EdgeCase[] = Array.isArray(business.agent_edge_cases)
    ? (business.agent_edge_cases as EdgeCase[])
    : []
  // Same save+sync path; the DB write is effectively a no-op (same
  // value) but the Retell push retries.
  const r = await saveAndSync(params.id, auth.userId, current)
  if (r.ok === false) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ success: true, edge_cases: current, retell_warning: r.retell_warning })
}
