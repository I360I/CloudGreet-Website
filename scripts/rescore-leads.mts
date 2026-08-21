/**
 * Re-tier + re-score EVERY lead against lib/lead-ops/scoring.ts, then enforce
 * queue standards for active dialers:
 *   - queue ordering follows tier rank then score (via assigned_at stamps,
 *     since the rep workspace sorts newest-first)
 *   - 'excluded' leads are pulled out of active reps' queues entirely
 * Run: npx tsx --env-file=.env.local scripts/rescore-leads.mts
 * Scheduled nightly via .github/workflows/lead-quality.yml
 */
import { createClient } from '@supabase/supabase-js'
import { scoreLead, TIER_RANK, type LeadTier } from '../lib/lead-ops/scoring'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Active dialers whose queues get standards enforcement.
const ACTIVE_DIALERS: Record<string, string> = {
  '4fcaa417-21f9-4df8-8f5f-18c6fcf42bd1': 'Masen',
}

async function main() {
  // 1) rescore the whole pool (paginated - Supabase caps selects at 1000)
  const all: any[] = []
  for (let off = 0; ; off += 1000) {
    const { data } = await sb
      .from('leads')
      .select('id,business_name,business_type,phone,state,contact_name,email,notes,google_rating,google_review_count,google_business_status,lead_tier,lead_score')
      .range(off, off + 999)
    if (!data?.length) break
    all.push(...data)
    if (data.length < 1000) break
  }
  const now = new Date().toISOString()
  const counts: Record<string, number> = {}
  let changed = 0
  for (const l of all) {
    const { tier, score } = scoreLead(l)
    counts[tier] = (counts[tier] || 0) + 1
    if (l.lead_tier !== tier || l.lead_score !== score) {
      await sb.from('leads').update({ lead_tier: tier, lead_score: score, scored_at: now }).eq('id', l.id)
      changed++
    }
  }
  console.log(`rescored ${all.length} leads (${changed} changed):`, JSON.stringify(counts))

  // 2) enforce queue standards for each active dialer
  for (const [repId, name] of Object.entries(ACTIVE_DIALERS)) {
    const { data: asg } = await sb.from('lead_assignments').select('lead_id,status,disposition').eq('rep_id', repId)
    const ids = (asg || []).map((a) => a.lead_id)
    const leads: any[] = []
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await sb.from('leads').select('id,lead_tier,lead_score').in('id', ids.slice(i, i + 100))
      leads.push(...(data || []))
    }
    // pull excluded out of the queue
    const excluded = leads.filter((l) => l.lead_tier === 'excluded')
    for (const l of excluded) await sb.from('lead_assignments').delete().eq('rep_id', repId).eq('lead_id', l.id)
    // order: tier rank, then score (stamp best NEWEST since workspace sorts desc)
    const keep = leads
      .filter((l) => l.lead_tier !== 'excluded')
      .sort((a, b) =>
        (TIER_RANK[a.lead_tier as LeadTier] ?? 0) - (TIER_RANK[b.lead_tier as LeadTier] ?? 0) ||
        (a.lead_score ?? 0) - (b.lead_score ?? 0),
      )
    const base = Date.now()
    for (let i = 0; i < keep.length; i++) {
      await sb.from('lead_assignments').update({ assigned_at: new Date(base + i * 1000).toISOString() })
        .eq('rep_id', repId).eq('lead_id', keep[i].id)
    }
    const tiers: Record<string, number> = {}
    for (const l of keep) tiers[l.lead_tier] = (tiers[l.lead_tier] || 0) + 1
    console.log(`${name}: queue ${keep.length} (removed ${excluded.length} excluded) | ${JSON.stringify(tiers)}`)
  }
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
