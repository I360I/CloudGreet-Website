import { NextResponse } from 'next/server'
import { lookupDriveTime } from '@/lib/quote-engine'

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
 * Safe by construction: nothing here writes to a DB, charges a card, sends a
 * text, or dials a phone. It just returns plausible JSON the agent can speak.
 */

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
      return NextResponse.json({
        ok: true,
        result: `Confirmation text "sent" (demo - no real SMS goes out).`,
      })
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
      const miles = (r as any).miles
      const minutes = (r as any).minutes
      return NextResponse.json({
        ok: true,
        miles,
        minutes,
        result: `That's about ${miles} miles, roughly ${minutes} minutes of drive time${(r as any).usedTraffic ? ' with current traffic' : ''}.`,
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
