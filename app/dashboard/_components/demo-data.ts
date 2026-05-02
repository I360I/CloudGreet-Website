/**
 * Plausible sample data shown to contractors before they finish onboarding,
 * so the dashboard demonstrates what it'll look like once real calls flow in.
 *
 * All timestamps are computed relative to "now" so charts always look fresh.
 */

import type { Call } from './calls'

const now = () => Date.now()
const minutesAgo = (n: number) => new Date(now() - n * 60 * 1000).toISOString()
const hoursAgo = (n: number) => new Date(now() - n * 60 * 60 * 1000).toISOString()
const daysAgo = (n: number) => new Date(now() - n * 24 * 60 * 60 * 1000).toISOString()
const daysAhead = (n: number) => new Date(now() + n * 24 * 60 * 60 * 1000)

export const DEMO_BUSINESS_NAME = 'Sample Heating & Cooling'

export function demoCalls(): Call[] {
 return [
  {
   id: 'demo-1', call_id: 'demo-1', from_number: '+15125551234',
   caller_name: 'Sarah Mitchell', duration: 142, created_at: minutesAgo(18),
   status: 'completed', sentiment: 'positive',
   summary: 'Wants AC tune-up before summer. Booked Friday 2pm.',
   transcript: 'AGENT: Thanks for calling Sample Heating & Cooling, this is Riley.\nCALLER: Hi, I want to schedule an AC tune-up before it gets hot.\nAGENT: Absolutely, I can get you on the books. What works for you?\nCALLER: Friday afternoon if possible.\nAGENT: I have 2pm on Friday. Address?\nCALLER: 1409 Bouldin Ave, Austin.\nAGENT: Booked. You\'ll get a confirmation text. Anything else?\nCALLER: That\'s it, thanks!',
   recording_url: null, outcome: 'booked',
  },
  {
   id: 'demo-2', call_id: 'demo-2', from_number: '+15125557788',
   caller_name: 'Marcus Reed', duration: 67, created_at: hoursAgo(2),
   status: 'completed', sentiment: 'neutral',
   summary: 'Quote request for furnace replacement. Sending estimate by email.',
   transcript: null, recording_url: null, outcome: 'message',
  },
  {
   id: 'demo-3', call_id: 'demo-3', from_number: '+15125559912',
   caller_name: 'Priya Shah', duration: 198, created_at: hoursAgo(5),
   status: 'completed', sentiment: 'positive',
   summary: 'Emergency — no AC, infant in house. Booked same-day for 4pm.',
   transcript: null, recording_url: null, outcome: 'booked',
  },
  {
   id: 'demo-4', call_id: 'demo-4', from_number: '+15124442020',
   caller_name: null, duration: 4, created_at: hoursAgo(8),
   status: 'failed', sentiment: null,
   summary: null, transcript: null, recording_url: null, outcome: 'dropped',
  },
  {
   id: 'demo-5', call_id: 'demo-5', from_number: '+15123334455',
   caller_name: 'Daniel Ortega', duration: 94, created_at: daysAgo(1),
   status: 'completed', sentiment: 'positive',
   summary: 'Annual maintenance plan question. Will follow up next week.',
   transcript: null, recording_url: null, outcome: 'message',
  },
  {
   id: 'demo-6', call_id: 'demo-6', from_number: '+15124446060',
   caller_name: 'Erika Long', duration: 121, created_at: daysAgo(2),
   status: 'completed', sentiment: 'positive',
   summary: 'Booked thermostat install. Scheduled Tuesday 10am.',
   transcript: null, recording_url: null, outcome: 'booked',
  },
  {
   id: 'demo-7', call_id: 'demo-7', from_number: '+15127778899',
   caller_name: 'Alex Tanaka', duration: 56, created_at: daysAgo(3),
   status: 'completed', sentiment: 'neutral',
   summary: 'Pricing question, will think it over.',
   transcript: null, recording_url: null, outcome: 'message',
  },
 ]
}

export function demoAppointments() {
 const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
 const at = (offset: number, hour: number, minute = 0) => {
  const d = daysAhead(offset); d.setHours(hour, minute, 0, 0); return d
 }
 const a = at(2, 14); const aEnd = new Date(a.getTime() + 60 * 60 * 1000)
 const b = at(3, 10); const bEnd = new Date(b.getTime() + 90 * 60 * 1000)
 const c = at(4, 9); const cEnd = new Date(c.getTime() + 60 * 60 * 1000)
 const d = at(7, 13); const dEnd = new Date(d.getTime() + 60 * 60 * 1000)
 return [
  { id: 'demo-a1', customer_name: 'Sarah Mitchell', customer_phone: '+15125551234',
    service_type: 'AC Tune-up', scheduled_date: fmt(a), start_time: a.toISOString(), end_time: aEnd.toISOString(), status: 'scheduled', notes: '' },
  { id: 'demo-a2', customer_name: 'Priya Shah', customer_phone: '+15125559912',
    service_type: 'Emergency Repair', scheduled_date: fmt(b), start_time: b.toISOString(), end_time: bEnd.toISOString(), status: 'scheduled', notes: '' },
  { id: 'demo-a3', customer_name: 'Erika Long', customer_phone: '+15124446060',
    service_type: 'Thermostat Install', scheduled_date: fmt(c), start_time: c.toISOString(), end_time: cEnd.toISOString(), status: 'scheduled', notes: '' },
  { id: 'demo-a4', customer_name: 'Marcus Reed', customer_phone: '+15125557788',
    service_type: 'Estimate', scheduled_date: fmt(d), start_time: d.toISOString(), end_time: dEnd.toISOString(), status: 'scheduled', notes: '' },
 ]
}

export function demoOverview(rangeDays: number) {
 const calls = demoCalls()
 const buckets: { date: string; count: number }[] = []
 for (let i = rangeDays - 1; i >= 0; i--) {
  const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
  const iso = d.toISOString().slice(0, 10)
  // pseudo-stable per-day count
  const seed = (d.getDate() * 7 + d.getMonth() * 13) % 9
  buckets.push({ date: iso, count: seed > 1 ? seed : 1 })
 }
 const totalCalls = buckets.reduce((s, b) => s + b.count, 0)
 const callsToday = buckets[buckets.length - 1].count
 const booked = Math.round(totalCalls * 0.42)
 const message = Math.round(totalCalls * 0.36)
 const dropped = totalCalls - booked - message
 return {
  business: { id: 'demo', business_name: DEMO_BUSINESS_NAME },
  range: rangeDays,
  kpis: {
   totalCalls,
   callsToday,
   avgDurationSec: 118,
   bookedRate: 42,
   deltas: {
    totalCalls: Math.round(totalCalls * 0.18),
    callsYesterday: Math.max(1, callsToday - 2),
    avgDurationSec: 14,
    bookedRate: 5,
   },
   spark: buckets.slice(-Math.min(rangeDays, 14)).map((b) => b.count),
  },
  outcomes: { booked, message, dropped },
  dailyVolume: buckets,
  recentCalls: calls,
  upcomingAppointments: demoAppointments(),
 }
}

export function demoMonthDays(monthStart: Date) {
 const out: Array<{ date: string; appointments: any[] }> = []
 const today = new Date()
 const month = monthStart.getMonth(); const year = monthStart.getFullYear()
 const lastDay = new Date(year, month + 1, 0).getDate()
 const apptsByDate = new Map<string, any[]>()
 // Sprinkle a few sample appointments through this month
 const seedDays = [2, 5, 9, 12, 16, 19, 23, 27]
 const samples = ['AC Tune-up', 'Estimate', 'Thermostat Install', 'Emergency Repair', 'Furnace Service']
 const names = ['Sarah Mitchell', 'Marcus Reed', 'Priya Shah', 'Daniel Ortega', 'Erika Long', 'Alex Tanaka']
 seedDays.forEach((dayNum, i) => {
  if (dayNum > lastDay) return
  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
  const start = new Date(year, month, dayNum, 9 + (i % 6), 0)
  apptsByDate.set(iso, [{
   id: `demo-m-${i}`,
   customer_name: names[i % names.length],
   service_type: samples[i % samples.length],
   start_time: start.toISOString(),
   end_time: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
   status: 'scheduled',
  }])
 })
 for (let day = 1; day <= lastDay; day++) {
  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (apptsByDate.has(iso)) out.push({ date: iso, appointments: apptsByDate.get(iso)! })
 }
 return out
}

export function demoWeekDays(weekStart: Date) {
 const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
 const todayIso = new Date().toISOString().slice(0, 10)
 const days: any[] = []
 for (let i = 0; i < 7; i++) {
  const d = new Date(weekStart); d.setDate(d.getDate() + i)
  const iso = d.toISOString().slice(0, 10)
  const appts: any[] = []
  if (i === 2) appts.push({ id: 'demo-w-1', time: '14:00', customer: 'Sarah Mitchell', serviceType: 'AC Tune-up' })
  if (i === 3) {
   appts.push({ id: 'demo-w-2', time: '10:00', customer: 'Priya Shah', serviceType: 'Emergency Repair' })
   appts.push({ id: 'demo-w-3', time: '15:30', customer: 'Daniel Ortega', serviceType: 'Estimate' })
  }
  if (i === 5) appts.push({ id: 'demo-w-4', time: '09:00', customer: 'Erika Long', serviceType: 'Thermostat Install' })
  days.push({
   date: iso,
   dayName: dayNames[d.getDay()],
   dayNumber: d.getDate(),
   isToday: iso === todayIso,
   appointments: appts,
   count: appts.length,
  })
 }
 return days
}
