import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { moderateRateLimit } from '@/lib/rate-limiting-redis'
import { listBookings } from '@/lib/calcom'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type CalendarView = 'month' | 'week' | 'day' | 'agenda'

/**
 * Get Calendar Data
 * Returns appointments formatted for different calendar views
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

 // Get query params
 const { searchParams } = request.nextUrl
 const startDateParam = searchParams.get('startDate')
 const endDateParam = searchParams.get('endDate')
 const view = (searchParams.get('view') || 'month') as CalendarView

 if (!startDateParam || !endDateParam) {
 return NextResponse.json(
 { success: false, error: 'startDate and endDate are required' },
 { status: 400 }
 )
 }

 const startDate = new Date(startDateParam)
 const endDate = new Date(endDateParam)

 // Fetch business services + Cal.com api key (used for live merge).
 const { data: business } = await supabaseAdmin
 .from('businesses')
 .select('services, cal_com_api_key, calcom_connected')
 .eq('id', businessId)
 .single()

 const businessServices = business?.services || []

 // Local appointments first. Cancelled bookings stay in the table
 // for audit + cancel-readback, but they should NOT appear on the
 // calendar - they're already off the contractor's Cal.com event
 // list, so leaving them on the dashboard creates a confusing
 // mismatch.
 const { data: localRows, error: appointmentsError } = await supabaseAdmin
 .from('appointments')
 .select('*')
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

 const appointments: any[] = [...(localRows || [])]

 // Live Cal.com merge - same self-heal pattern as the week view.
 // Cal.com bookings the webhook never landed get injected as synthetic
 // rows so the dashboard reflects the contractor's actual calendar.
 // Gate on api_key alone: the calcom_connected flag was masking real
 // bookings on freshly-onboarded accounts where the flag hadn't
 // propagated yet. If we have the key on file, the contractor handed
 // it to us; an admin clearing the key entirely is the kill-switch.
 if (business?.cal_com_api_key) {
  try {
   const localUids = new Set(
    (localRows || [])
     .map((r: any) => r.cal_com_booking_uid)
     .filter((u: any): u is string => !!u),
   )
   const live = await listBookings(business.cal_com_api_key, {
    afterStart: startDate.toISOString(),
    beforeEnd: endDate.toISOString(),
   })
   for (const b of live) {
    if (!b?.uid || localUids.has(b.uid)) continue
    if (b.status && /(cancel|reject)/i.test(b.status)) continue
    const start = new Date(b.start)
    if (isNaN(start.getTime())) continue
    const attendee = b.attendees?.[0]
    appointments.push({
     id: `cal:${b.uid}`,
     scheduled_date: start.toISOString().split('T')[0],
     start_time: start.toISOString(),
     end_time: b.end || null,
     duration: null,
     customer_name: attendee?.name || b.title || 'Cal.com booking',
     service_type: b.eventType?.title || b.title || 'General',
     status: b.status || 'confirmed',
     estimated_value: null,
     address: null,
     notes: null,
    })
   }
   appointments.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
  } catch (e) {
   logger.warn('Cal.com live merge failed - showing local rows only', {
    businessId,
    error: e instanceof Error ? e.message : 'Unknown',
   })
  }
 }

 // Format response based on view
 let responseData: any

 // The `scheduled_date` column is timestamptz, not date — Supabase
 // returns it as a full ISO string ("2026-05-27T13:00:00+00:00"). The
 // live-merge code above produces just the date part ("2026-05-27").
 // Without this normalization, those two bucket into different keys
 // and the calendar grid silently hides every locally-stored
 // appointment (only the synthetic Cal.com rows render). Truncate to
 // the YYYY-MM-DD prefix everywhere we bucket by date string.
 const toDateKey = (v: any): string => {
  if (!v) return ''
  const s = String(v)
  return s.length >= 10 ? s.slice(0, 10) : s
 }

 switch (view) {
 case 'month': {
 // Group by date
 const daysMap = new Map<string, any[]>()
 appointments?.forEach(apt => {
 const dateStr = toDateKey(apt.scheduled_date)
 if (!daysMap.has(dateStr)) {
 daysMap.set(dateStr, [])
 }
 daysMap.get(dateStr)!.push({
 id: apt.id,
 customer_name: apt.customer_name,
 service_type: apt.service_type,
 start_time: apt.start_time,
 end_time: apt.end_time,
 status: apt.status
 })
 })

 const days = Array.from(daysMap.entries()).map(([date, appointments]) => ({
 date,
 appointments
 }))

 responseData = { days }
 break
 }

 case 'week': {
 // Group by day and time slots
 const daysMap = new Map<string, Map<string, any[]>>()
 
 appointments?.forEach(apt => {
 const dateStr = toDateKey(apt.scheduled_date)
 const startTime = new Date(apt.start_time)
 const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`

 if (!daysMap.has(dateStr)) {
 daysMap.set(dateStr, new Map())
 }
 const slotsMap = daysMap.get(dateStr)!
 if (!slotsMap.has(timeStr)) {
 slotsMap.set(timeStr, [])
 }
 slotsMap.get(timeStr)!.push({
 id: apt.id,
 customer_name: apt.customer_name,
 service_type: apt.service_type,
 start_time: apt.start_time,
 end_time: apt.end_time,
 duration: apt.duration,
 status: apt.status
 })
 })

 const days = Array.from(daysMap.entries()).map(([date, slotsMap]) => ({
 date,
 slots: Array.from(slotsMap.entries()).map(([time, appointments]) => ({
 time,
 appointments
 }))
 }))

 responseData = { days }
 break
 }

 case 'day': {
 // Single day with time slots
 const slotsMap = new Map<string, any[]>()
 
 appointments?.forEach(apt => {
 const startTime = new Date(apt.start_time)
 const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`

 if (!slotsMap.has(timeStr)) {
 slotsMap.set(timeStr, [])
 }
 slotsMap.get(timeStr)!.push({
 id: apt.id,
 customer_name: apt.customer_name,
 service_type: apt.service_type,
 start_time: apt.start_time,
 end_time: apt.end_time,
 duration: apt.duration,
 status: apt.status
 })
 })

 const slots = Array.from(slotsMap.entries()).map(([time, appointments]) => ({
 time,
 appointments
 }))

 responseData = {
 date: startDateParam,
 slots
 }
 break
 }

 case 'agenda': {
 // List format
 responseData = {
 appointments: appointments?.map(apt => ({
 id: apt.id,
 scheduled_date: apt.scheduled_date,
 start_time: apt.start_time,
 end_time: apt.end_time,
 customer_name: apt.customer_name,
 service_type: apt.service_type,
 status: apt.status,
 estimated_value: apt.estimated_value,
 address: apt.address,
 notes: apt.notes
 })) || []
 }
 break
 }

 default:
 return NextResponse.json(
 { success: false, error: 'Invalid view. Must be month, week, day, or agenda' },
 { status: 400 }
 )
 }

 // Log response size for debugging
 const finalResponse = {
 success: true,
 view,
 ...responseData,
 businessServices
 }
 
 logger.info('Calendar API response', {
 businessId,
 view,
 startDate: startDateParam,
 endDate: endDateParam,
 appointmentCount: appointments?.length || 0,
 responseSize: JSON.stringify(finalResponse).length
 })

 return NextResponse.json(finalResponse, {
 headers: {
 'Cache-Control': 'private, max-age=60',
 ...rateLimitResult.headers
 }
 })
 } catch (error) {
 logger.error('Error fetching calendar data', {
 error: error instanceof Error ? error.message : 'Unknown error'
 })
 return NextResponse.json(
 { success: false, error: 'Failed to fetch calendar data' },
 { status: 500 }
 )
 }
}

