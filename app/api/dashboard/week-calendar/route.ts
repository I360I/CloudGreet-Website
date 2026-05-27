import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { moderateRateLimit } from '@/lib/rate-limiting-redis'
import { listBookings } from '@/lib/calcom'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Get Week Calendar Data
 * Returns appointments for a week with day-by-day breakdown
 */
export async function GET(request: NextRequest) {
 try {
 // Rate limiting
 const rateLimitResult = await moderateRateLimit(request)
 if (!rateLimitResult.allowed) {
 return NextResponse.json(
 { success: false, error: 'Rate limit exceeded' },
 { status: 429, headers: rateLimitResult.headers }
 )
 }

 // Authenticate user
 const authResult = await requireAuth(request)
 if (!authResult.success || !authResult.userId || !authResult.businessId) {
 return NextResponse.json(
 { success: false, error: 'Unauthorized' },
 { status: 401 }
 )
 }

 const businessId = authResult.businessId

 // Get date range from query params (default to current week)
 const { searchParams } = request.nextUrl
 const startDateParam = searchParams.get('startDate')
 const endDateParam = searchParams.get('endDate')

 const now = new Date()
 const startDate = startDateParam 
 ? new Date(startDateParam)
 : (() => {
 const start = new Date(now)
 start.setDate(start.getDate() - start.getDay()) // Start of week (Sunday)
 start.setHours(0, 0, 0, 0)
 return start
 })()
 
 const endDate = endDateParam
 ? new Date(endDateParam)
 : (() => {
 const end = new Date(startDate)
 end.setDate(end.getDate() + 6) // End of week (Saturday)
 end.setHours(23, 59, 59, 999)
 return end
 })()

 // Fetch business services for color mapping (and the Cal.com api key
 // so we can pull live bookings if the webhook missed any).
 const { data: business } = await supabaseAdmin
 .from('businesses')
 .select('services, cal_com_api_key, timezone, calcom_connected, cal_com_event_type_id_emergency')
 .eq('id', businessId)
 .single()

 const businessServices = business?.services || []

 // Fetch local appointments for the week. Cancelled bookings stay
 // in the table (we need them for audit + cancel readback flows) but
 // they should not show up on the calendar - they're already off the
 // contractor's Cal.com event list, so leaving them on the dashboard
 // creates a confusing mismatch.
 const { data: localRows, error: appointmentsError } = await supabaseAdmin
 .from('appointments')
 .select('id, scheduled_date, start_time, end_time, customer_name, service_type, status, cal_com_booking_uid, is_emergency')
 .eq('business_id', businessId)
 .gte('scheduled_date', startDate.toISOString().split('T')[0])
 .lte('scheduled_date', endDate.toISOString().split('T')[0])
 .not('status', 'in', '(cancelled,no_show)')
 .order('start_time', { ascending: true })

 if (appointmentsError) {
 logger.error('Failed to fetch appointments', {
 error: appointmentsError instanceof Error ? appointmentsError.message : String(appointmentsError),
 businessId
 })
 return NextResponse.json(
 { success: false, error: 'Failed to fetch appointments' },
 { status: 500 }
 )
 }

 const appointments: Array<{
  id: string
  scheduled_date: string
  start_time: string
  end_time: string | null
  customer_name: string | null
  service_type: string | null
  status: string | null
  is_emergency: boolean
 }> = (localRows || []).map((r) => ({
  id: r.id,
  scheduled_date: r.scheduled_date,
  start_time: r.start_time,
  end_time: r.end_time,
  customer_name: r.customer_name,
  service_type: r.service_type,
  status: r.status,
  is_emergency: !!(r as any).is_emergency,
 }))

 // Merge in any live Cal.com bookings the webhook didn't sync. This
 // self-heals the calendar even when webhook registration silently
 // failed at onboarding or got revoked. Failure here is non-fatal -
 // we still return the local rows.
 // Gate on api_key alone: the calcom_connected flag was masking real
 // bookings on freshly-onboarded accounts where the flag hadn't
 // propagated yet. The key itself is the kill-switch - if an admin
 // wants to stop syncing, they clear the key.
 if (business?.cal_com_api_key) {
  try {
   const localUids = new Set(
    (localRows || [])
     .map((r) => r.cal_com_booking_uid)
     .filter((u): u is string => !!u),
   )
   const live = await listBookings(business.cal_com_api_key, {
    afterStart: startDate.toISOString(),
    beforeEnd: endDate.toISOString(),
   })
   // Same emergency inference as overview - any live booking landing
   // on the emergency event type gets the badge even if it didn't
   // originate from our agent.
   const emergencyEtId = (business as any)?.cal_com_event_type_id_emergency || null
   for (const b of live) {
    if (!b?.uid || localUids.has(b.uid)) continue
    if (b.status && /(cancel|reject)/i.test(b.status)) continue
    const start = new Date(b.start)
    if (isNaN(start.getTime())) continue
    const attendee = b.attendees?.[0]
    const liveEventTypeId = (b as any)?.eventType?.id || (b as any)?.eventTypeId || null
    appointments.push({
     id: `cal:${b.uid}`,
     scheduled_date: start.toISOString().split('T')[0],
     start_time: start.toISOString(),
     end_time: b.end || null,
     customer_name: attendee?.name || b.title || 'Cal.com booking',
     service_type: b.eventType?.title || b.title || 'General',
     status: b.status || 'confirmed',
     is_emergency: !!(emergencyEtId && liveEventTypeId && Number(liveEventTypeId) === Number(emergencyEtId)),
    })
   }
   appointments.sort((a, b) => a.start_time.localeCompare(b.start_time))
  } catch (e) {
   logger.warn('Cal.com live merge failed - showing local rows only', {
    businessId,
    error: e instanceof Error ? e.message : 'Unknown',
   })
  }
 }

 // Group appointments by day
 const daysMap = new Map<string, {
 date: string
 dayName: string
 dayNumber: number
 isToday: boolean
 appointments: Array<{
 id: string
 time: string
 customer: string
 serviceType: string
 isEmergency: boolean
 }>
 count: number
 }>()

 const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
 const today = new Date().toDateString()

 // Initialize all days in the week
 for (let i = 0; i < 7; i++) {
 const date = new Date(startDate)
 date.setDate(date.getDate() + i)
 const dateStr = date.toISOString().split('T')[0]
 const dayOfWeek = date.getDay()

 daysMap.set(dateStr, {
 date: dateStr,
 dayName: dayNames[dayOfWeek],
 dayNumber: date.getDate(),
 isToday: date.toDateString() === today,
 appointments: [],
 count: 0
 })
 }

 // Populate appointments
 appointments?.forEach(apt => {
 // scheduled_date is timestamptz, so Supabase returns a full ISO
 // string for local rows ("2026-05-27T13:00:00+00:00") while the
 // live-merge synthetic rows use just the date prefix ("2026-05-27").
 // Truncate to YYYY-MM-DD so both bucket into the same day cell.
 const rawDate = apt.scheduled_date ? String(apt.scheduled_date) : ''
 const dateStr = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate
 const dayData = daysMap.get(dateStr)
 
 if (dayData) {
 // Format time (HH:mm)
 const startTime = new Date(apt.start_time)
 const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`
 
 dayData.appointments.push({
 id: apt.id,
 time: timeStr,
 customer: apt.customer_name,
 serviceType: apt.service_type || 'General',
 isEmergency: !!apt.is_emergency,
 })
 dayData.count = dayData.appointments.length
 }
 })

 // Convert map to array and sort by date
 const days = Array.from(daysMap.values()).sort((a, b) => 
 a.date.localeCompare(b.date)
 )

 return NextResponse.json({
 success: true,
 days,
 businessServices
 }, {
 headers: {
 'Cache-Control': 'private, max-age=60',
 ...rateLimitResult.headers
 }
 })
 } catch (error) {
 logger.error('Error fetching week calendar', {
 error: error instanceof Error ? error.message : 'Unknown error'
 })
 return NextResponse.json(
 { success: false, error: 'Failed to fetch week calendar' },
 { status: 500 }
 )
 }
}

