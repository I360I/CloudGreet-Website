import { NextResponse } from 'next/server'
import { lookupDriveTime } from '@/lib/quote-engine'
import { supabaseAdmin } from '@/lib/supabase'
import { telnyxClient } from '@/lib/telnyx'
import { logger } from '@/lib/monitoring'

/**
 * Demo agent tool webhook.
 *
 * The landing-page demo agents (HVAC / Electrical / Transport / Roofing / Law)
 * call this for their tools. Unlike the real /api/retell/voice-webhook, there is
 * NO client business, calendar, or phone behind a demo agent - so this endpoint
 * SIMULATES the booking suite with realistic results (never touching a real
 * calendar, never sending a real SMS) and does ONE genuinely-real thing: it
 * routes transport drive-time/distance through the Google Routes API so the
 * "calculate the drive" demo actually computes a real number.
 *
 * Safe by construction with ONE deliberate exception: send_booking_sms sends
 * a REAL text to the number the visitor gave during the demo - prefixed
 * "(Demo SMS)" - so prospects experience the confirmation text their own
 * customers would get. Hard rate-limited (2/number/day, global daily cap),
 * fixed server-side template (the agent can't freetext it), and it falls
 * back to the old simulation if anything is unavailable.
 */

/** The five landing demo agents - used to brand the demo text. */
const DEMO_AGENTS: Record<string, { company: string; agentName: string; vertical: string }> = {
  agent_1a0104f504c5b963146a6d98f3: { company: 'Apex Air & Heat', agentName: 'Mia', vertical: 'hvac' },
  agent_2800f2b423ddb542ef96a6db76: { company: 'Bright Spark Electric', agentName: 'Dave', vertical: 'electrical' },
  agent_070b63dd536ee3d27d16c05a45: { company: 'Executive Transport', agentName: 'Sam', vertical: 'transport' },
  agent_c6d94b0755392d61c9c2c21e45: { company: 'Summit Roofing', agentName: 'Ava', vertical: 'roofing' },
  agent_a5136ab4471231cd16e79c29ec: { company: 'Hale & Co. Law', agentName: 'Paul', vertical: 'law' },
}

const clean = (v: unknown, max: number) =>
  String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max)

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// pull {name, args} out of whatever shape Retell sends (it has shipped 3)
function parseTool(body: any): { name: string; args: Record<string, any> } {
  if (body?.tool_call?.name) return { name: body.tool_call.name, args: body.tool_call.arguments || body.tool_call.args || {} }
  if (body?.function_call?.name) return { name: body.function_call.name, args: body.function_call.arguments || body.function_call.args || {} }
  if (typeof body?.name === 'string') return { name: body.name, args: body.args || body.arguments || {} }
  return { name: '', args: {} }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// next N weekday slots from now, returned as natural spoken strings
function nextSlots(count = 4): string[] {
  const out: string[] = []
  const times = ['9:00 AM', '11:30 AM', '2:00 PM', '4:00 PM']
  const d = new Date()
  let added = 0, dayOffset = 1
  while (added < count && dayOffset < 14) {
    const day = new Date(d.getTime() + dayOffset * 86400000)
    const dow = day.getDay()
    if (dow !== 0 && dow !== 6) {
      const label = added === 0 && dayOffset === 1 ? 'tomorrow'
        : `${DAYS[dow]}, ${MONTHS[day.getMonth()]} ${ordinal(day.getDate())}`
      out.push(`${label} at ${times[added % times.length]}`)
      added++
    }
    dayOffset++
  }
  return out
}

function fakeId(prefix: string): string {
  // deterministic-ish short id without Math.random dependency on the hot path
  return `${prefix}_${Date.now().toString(36).slice(-6)}`
}

export async function POST(req: Request) {
  let body: any = {}
  try { body = await req.json() } catch {}
  const { name, args } = parseTool(body)

  switch (name) {
    case 'lookup_availability': {
      const slots = nextSlots(4)
      return NextResponse.json({
        ok: true,
        slots,
        result: `Open times: ${slots.join('; ')}. (Demo calendar.)`,
      })
    }

    case 'book_appointment': {
      const when = args.datetime || args.time || 'the time you picked'
      const appt_id = fakeId('appt')
      return NextResponse.json({
        ok: true,
        appt_id,
        result: `Booked${args.name ? ` for ${args.name}` : ''}${args.service ? `, ${args.service}` : ''} on ${when}. This is a demo, so it's not a real calendar entry, but in production it would land on the business's calendar and text a confirmation.`,
      })
    }

    case 'send_booking_sms': {
      const simulated = NextResponse.json({
        ok: true,
        result: 'Confirmation text sent (demo). Tell the caller their confirmation is on its way.',
      })

      // REAL demo text. Guardrails: only to a plausible US mobile the
      // visitor gave on the call, fixed template, strict rate limits.
      const fromNumber = process.env.CLOUDGREET_NOTIFICATIONS_FROM
      if (!fromNumber) return simulated

      const phoneRaw = clean(args.phone || args.phone_number || args.mobile, 24)
      let digits = phoneRaw.replace(/\D/g, '')
      if (digits.length === 10) digits = `1${digits}`
      if (digits.length !== 11 || !digits.startsWith('1')) {
        return NextResponse.json({
          ok: false,
          result: "That phone number didn't look right. Ask the caller to repeat their mobile number digit by digit, then try again.",
        })
      }
      const e164 = `+${digits}`

      const agentId: string = body?.call?.agent_id || body?.agent_id || ''
      const brand = DEMO_AGENTS[agentId] || { company: 'CloudGreet', agentName: 'your AI receptionist', vertical: 'demo' }

      try {
        // Per-number cap: 2 per 24h. Re-asks just get reassured.
        const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
        const { count: perPhone } = await supabaseAdmin
          .from('demo_sms_log')
          .select('id', { count: 'exact', head: true })
          .eq('phone_digits', digits)
          .gte('created_at', dayAgo)
        if ((perPhone ?? 0) >= 2) {
          return NextResponse.json({
            ok: true,
            result: 'A demo text already went to that number recently - tell the caller to check their messages.',
          })
        }
        // Global abuse cap: 150/day across all demos.
        const { count: globalCount } = await supabaseAdmin
          .from('demo_sms_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', dayAgo)
        if ((globalCount ?? 0) >= 150) {
          logger.warn('demo sms global cap hit')
          return simulated
        }

        const name = clean(args.name, 40)
        const service = clean(args.service, 60)
        const when = clean(args.datetime || args.time, 60)
        const text =
          `(Demo SMS) ${brand.company}: ${name ? `Hi ${name}, you` : 'You'}'re booked` +
          `${service ? ` for ${service}` : ''}${when ? ` on ${when}` : ''}. ` +
          `Reply here with any changes - ${brand.agentName} has you on the schedule.\n\n` +
          'Sent by the CloudGreet demo. Your customers get these automatically.'

        await telnyxClient.sendSMS(e164, text, fromNumber)
        void supabaseAdmin
          .from('demo_sms_log')
          .insert({ phone_digits: digits, agent_id: agentId || null, vertical: brand.vertical })
          .then(({ error }) => { if (error) logger.warn('demo_sms_log insert failed', { error: error.message }) })

        return NextResponse.json({
          ok: true,
          result: "Text sent for real - tell the caller to check their phone. It starts with '(Demo SMS)' and shows exactly what their customers would receive.",
        })
      } catch (e) {
        logger.warn('demo sms send failed', { error: e instanceof Error ? e.message : 'unknown' })
        return simulated
      }
    }

    case 'cancel_appointment': {
      return NextResponse.json({
        ok: true,
        result: `That appointment is cancelled (demo).`,
      })
    }

    case 'reschedule_appointment': {
      const when = args.new_datetime || args.datetime || 'the new time'
      return NextResponse.json({
        ok: true,
        result: `Moved to ${when} (demo).`,
      })
    }

    case 'send_dispatch_request': {
      return NextResponse.json({
        ok: true,
        result: `Dispatch notified${args.customer_name ? ` about ${args.customer_name}` : ''}${args.pickup ? ` at ${args.pickup}` : ''}. In production the owner/dispatcher gets a text and calls back to confirm. (Demo - no real message sent.)`,
      })
    }

    case 'lookup_drive_time': {
      // REAL: route via Google Routes API
      const origin = args.origin || args.pickup || ''
      const destination = args.destination || args.dropoff || ''
      if (!origin || !destination) {
        return NextResponse.json({ ok: false, result: 'Need both a pickup and a destination to calculate the drive.' })
      }
      const r = await lookupDriveTime({ origin, destination, departure_time: args.departure_time })
      if (!r.ok) {
        return NextResponse.json({ ok: false, result: `Could not calculate that route right now. ${('detail' in r && r.detail) || ''}`.trim() })
      }
      const miles = (r as any).distance_miles
      const minutes = (r as any).minutes
      return NextResponse.json({
        ok: true,
        miles,
        minutes,
        result: `Drive time: ${(r as any).spoken_summary || `about ${miles} miles, roughly ${minutes} minutes`}.`,
      })
    }

    case 'compute_quote': {
      // simple, transparent transport fare estimate from miles (demo)
      const miles = Number(args.miles ?? args.distance ?? 0)
      if (!miles || miles <= 0) {
        return NextResponse.json({ ok: false, result: 'I need the trip distance first - run the drive-time lookup, then I can estimate a fare.' })
      }
      const base = 25, perMile = 2.75
      const low = Math.round(base + miles * perMile)
      const high = Math.round(low * 1.18)
      return NextResponse.json({
        ok: true,
        estimate_low: low,
        estimate_high: high,
        result: `For about ${miles} miles, a standard fare runs roughly $${low} to $${high}. Dispatch confirms the exact rate. (Demo estimate.)`,
      })
    }

    default:
      return NextResponse.json({ ok: false, result: `Unknown demo tool: ${name || '(none)'}` }, { status: 200 })
  }
}
