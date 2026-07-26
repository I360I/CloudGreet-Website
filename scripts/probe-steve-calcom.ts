/**
 * Read-only probe of Steve's Cal.com state to find why his Saturday-
 * blocks aren't reflected in lookup_availability. Reports:
 *
 *   1. Connected calendars + which are marked "selected" (conflict-check)
 *   2. The two event types (regular + emergency) + their availability
 *      schedule references
 *   3. The actual schedules (weekly hours + date overrides) so we can
 *      see whether Saturday is open at the schedule level
 *
 * Nothing is changed.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const STEVE_BUSINESS_ID = '650406c3-5585-446e-958d-0fbcccf54795'

const VERSIONS = {
  default: '2026-02-25',
  schedules: '2024-06-11',
  calendars: '2024-06-14',
  eventTypes: '2024-06-14',
}

async function call(apiKey: string, path: string, version: string) {
  const res = await fetch(`https://api.cal.com/v2${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'cal-api-version': version,
    },
  })
  const txt = await res.text()
  let body: any
  try { body = JSON.parse(txt) } catch { body = txt }
  return { status: res.status, body }
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: biz } = await supabase
    .from('businesses')
    .select('cal_com_api_key, cal_com_event_type_id, cal_com_event_type_id_emergency')
    .eq('id', STEVE_BUSINESS_ID)
    .maybeSingle()
  const apiKey: string = (biz as any).cal_com_api_key
  const eventTypeId: number = (biz as any).cal_com_event_type_id
  const eventTypeIdEm: number = (biz as any).cal_com_event_type_id_emergency

  console.log('\n=== /calendars (connected integrations) ===')
  const cals = await call(apiKey, '/calendars', VERSIONS.calendars)
  console.log(JSON.stringify(cals.body, null, 2).slice(0, 4000))

  console.log('\n=== /event-types/' + eventTypeId + ' (regular) ===')
  const et = await call(apiKey, `/event-types/${eventTypeId}`, VERSIONS.eventTypes)
  const etd = et.body?.data
  console.log('id:', etd?.id, 'title:', etd?.title, 'lengthInMinutes:', etd?.lengthInMinutes)
  console.log('scheduleId:', etd?.scheduleId)
  console.log('minimumBookingNotice:', etd?.minimumBookingNotice)
  console.log('beforeEventBuffer:', etd?.beforeEventBuffer, 'afterEventBuffer:', etd?.afterEventBuffer)

  console.log('\n=== /event-types/' + eventTypeIdEm + ' (emergency) ===')
  const ete = await call(apiKey, `/event-types/${eventTypeIdEm}`, VERSIONS.eventTypes)
  const eted = ete.body?.data
  console.log('id:', eted?.id, 'title:', eted?.title, 'scheduleId:', eted?.scheduleId, 'minimumBookingNotice:', eted?.minimumBookingNotice)

  console.log('\n=== /schedules (all his availability schedules) ===')
  const sch = await call(apiKey, '/schedules', VERSIONS.schedules)
  const schedules = sch.body?.data || []
  for (const s of schedules) {
    console.log(`\n--- Schedule ${s.id}: "${s.name}" ${s.isDefault ? '(DEFAULT)' : ''} tz=${s.timeZone} ---`)
    if (s.availability) {
      for (const a of s.availability) {
        const days = (a.days || []).join(',')
        console.log(`  days=[${days}]  ${a.startTime} - ${a.endTime}`)
      }
    }
    if (s.overrides && s.overrides.length) {
      console.log(`  overrides (${s.overrides.length}):`)
      for (const o of s.overrides) {
        console.log(`    ${o.date}: ${o.startTime || '(unavailable)'}${o.endTime ? ` - ${o.endTime}` : ''}`)
      }
    }
  }

  // Cross-check: probe /slots for next Saturday and see what comes back
  console.log('\n=== /slots for next Saturday (sanity check) ===')
  const now = new Date()
  const sat = new Date(now)
  sat.setUTCDate(sat.getUTCDate() + ((6 - sat.getUTCDay() + 7) % 7 || 7))
  const start = `${sat.toISOString().slice(0,10)}T00:00:00.000Z`
  const end = new Date(sat); end.setUTCDate(end.getUTCDate() + 1)
  const endIso = `${end.toISOString().slice(0,10)}T00:00:00.000Z`
  const qs = `eventTypeId=${eventTypeId}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(endIso)}&timeZone=America/New_York&format=time`
  const slots = await call(apiKey, `/slots?${qs}`, '2024-09-04')
  console.log('status:', slots.status)
  console.log(JSON.stringify(slots.body, null, 2).slice(0, 2000))
}

main().catch((e) => { console.error(e); process.exit(1) })
