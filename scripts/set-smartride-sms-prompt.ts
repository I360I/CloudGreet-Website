/**
 * Set Steve's agent_sms_prompt to the unified airport+non-airport SMS/web-chat
 * prompt (scripts/smartride/sms-prompt.md). Backs up the current one first.
 * Run: npx tsx --env-file=.env.local scripts/set-smartride-sms-prompt.ts
 * Rollback: the backup file printed below (paste it back with a similar update).
 */
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BIZ = '650406c3-5585-446e-958d-0fbcccf54795'
const S = '/Users/anthony/Projects/cloudgreet/scripts/smartride'

async function main() {
  const next = readFileSync(`${S}/sms-prompt.md`, 'utf8')
  const { data: cur } = await supabase.from('businesses').select('agent_sms_prompt').eq('id', BIZ).single()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = `${S}/backup-sms-prompt.${stamp}.txt`
  writeFileSync(backupPath, (cur as any)?.agent_sms_prompt || '')
  console.log('backed up old SMS prompt (' + ((cur as any)?.agent_sms_prompt || '').length + ' chars) to', backupPath)

  const { error } = await supabase.from('businesses').update({ agent_sms_prompt: next }).eq('id', BIZ)
  if (error) throw error
  const { data: after } = await supabase.from('businesses').select('agent_sms_prompt').eq('id', BIZ).single()
  console.log('new SMS prompt set:', ((after as any)?.agent_sms_prompt || '').length, 'chars |',
    'has smartride tools ref:', /smartride_(airport|nonairport)_(quote|book)/.test((after as any)?.agent_sms_prompt || ''))
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
