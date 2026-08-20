/**
 * Preload Ashley's account with the 300 reviewed leads staged on 2026-08-13.
 *
 * Selection (already done, ids in the staged JSON): top 300 by quality score
 * from the pools of inactive reps Aaron Butler, BK Amon, Jesse Huerta, Briand
 * Kitchens, Randel Edwards, Aiden Crawson (176 after filtering DNC/dead/
 * in-flight/active-co-assigned/bad-phone/dupes) topped up with the 124 best
 * unassigned cold leads. 166 have owner names, 233 websites; heavy on
 * plumbing/HVAC/electrical/roofing, mostly TX.
 *
 * Ashley = sales rep, invite shleynm349@gmail.com (pending as of Aug 13).
 * RUN THIS AFTER SHE ACCEPTS THE INVITE (her custom_users row must exist):
 *   npx tsx --env-file=.env.local scripts/preload-ashley-leads.ts
 *
 * Transfer semantics: for leads held by an inactive rep, their assignment row
 * is DELETED and a fresh row is created for Ashley (clean slate, touch_count 0);
 * unassigned pool leads just get a fresh row. Idempotent: skips leads she
 * already holds.
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const ASHLEY_EMAIL = 'ashleynm349@gmail.com'
const STAGED = 'scripts/data/ashley-300-ids.json'
const INACTIVE_PREFIXES = ['8bfb0515', '5df1f86c', '481fdcfa', 'f0058412', '00347d72', '2124e384']

async function main() {
  const { data: ashley } = await sb.from('custom_users').select('id, first_name, role').eq('email', ASHLEY_EMAIL).maybeSingle()
  if (!ashley) throw new Error(`No account for ${ASHLEY_EMAIL} yet - she has not accepted the invite. Run again after she does.`)
  console.log(`Ashley: ${ashley.id} (${ashley.role})`)

  const ids: string[] = JSON.parse(readFileSync(STAGED, 'utf8'))
  console.log('staged leads:', ids.length)

  const { data: users } = await sb.from('custom_users').select('id')
  const inactiveIds = (users || []).map((u) => u.id).filter((id) => INACTIVE_PREFIXES.some((p) => id.startsWith(p)))

  let transferred = 0, fresh = 0, skipped = 0
  const now = new Date().toISOString()
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    const { data: existing } = await sb.from('lead_assignments').select('lead_id, rep_id').in('lead_id', batch)
    const byLead = new Map<string, string[]>()
    for (const a of existing || []) { if (!byLead.has(a.lead_id)) byLead.set(a.lead_id, []); byLead.get(a.lead_id)!.push(a.rep_id) }

    for (const leadId of batch) {
      const holders = byLead.get(leadId) || []
      if (holders.includes(ashley.id)) { skipped++; continue }
      const inactiveHolders = holders.filter((r) => inactiveIds.includes(r))
      if (inactiveHolders.length) {
        await sb.from('lead_assignments').delete().eq('lead_id', leadId).in('rep_id', inactiveHolders)
        transferred++
      } else {
        fresh++
      }
      const { error } = await sb.from('lead_assignments').insert({
        lead_id: leadId, rep_id: ashley.id, status: 'new', claimed: false, assigned_at: now, touch_count: 0,
      })
      if (error) console.log('insert failed', leadId, error.message)
    }
  }
  console.log(`DONE: transferred from inactive reps: ${transferred}, fresh from pool: ${fresh}, already hers: ${skipped}`)
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
