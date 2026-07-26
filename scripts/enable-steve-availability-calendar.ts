/**
 * Marks Steve's "Smart Ride Availability" Google Calendar as a
 * conflict-check source in Cal.com. Without this, events he adds to
 * that calendar to block out time (e.g. "Saturday off") are invisible
 * to Cal.com's /slots endpoint — so our lookup_availability tells the
 * SMS/voice agent the time is open and the agent books over the block.
 *
 * The other two of his calendars are already selected; this just
 * brings the missing one into the conflict-check set.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const STEVE_BUSINESS_ID = '650406c3-5585-446e-958d-0fbcccf54795'
const TARGET_EXTERNAL_ID = 'd44cbdf2ccea67d29aac303e21fdf2deb12ed91ecb66eb3dd26768032f796244@group.calendar.google.com'
const TARGET_NAME = 'Smart Ride Availability'

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: biz } = await supabase
    .from('businesses')
    .select('cal_com_api_key')
    .eq('id', STEVE_BUSINESS_ID)
    .maybeSingle()
  const apiKey: string = (biz as any).cal_com_api_key

  // Find the credentialId for the target calendar (from the connected
  // calendars listing).
  const calsRes = await fetch('https://api.cal.com/v2/calendars', {
    headers: { Authorization: `Bearer ${apiKey}`, 'cal-api-version': '2024-06-14' },
  })
  const cals = await calsRes.json() as any
  let credentialId: number | null = null
  for (const cc of cals?.data?.connectedCalendars || []) {
    const match = (cc.calendars || []).find((c: any) => c.externalId === TARGET_EXTERNAL_ID)
    if (match) { credentialId = match.credentialId; break }
  }
  if (!credentialId) throw new Error(`Calendar "${TARGET_NAME}" not found among connected calendars`)
  console.log(`Found ${TARGET_NAME} (credentialId=${credentialId})`)

  const body = {
    integration: 'google_calendar',
    externalId: TARGET_EXTERNAL_ID,
    credentialId,
  }
  const res = await fetch('https://api.cal.com/v2/selected-calendars', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'cal-api-version': '2024-06-14',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const txt = await res.text()
  console.log('POST /selected-calendars →', res.status, txt.slice(0, 500))

  // Re-read /calendars and confirm isSelected flipped to true.
  const verifyRes = await fetch('https://api.cal.com/v2/calendars', {
    headers: { Authorization: `Bearer ${apiKey}`, 'cal-api-version': '2024-06-14' },
  })
  const v = await verifyRes.json() as any
  for (const cc of v?.data?.connectedCalendars || []) {
    for (const c of (cc.calendars || [])) {
      console.log(`  ${c.name.padEnd(40)} isSelected=${c.isSelected}`)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
