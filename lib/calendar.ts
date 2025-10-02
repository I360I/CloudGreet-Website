import { supabaseAdmin, isSupabaseConfigured } from './supabase'
import { logger } from './monitoring'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
  attendees?: string[]
}

export interface CalendarConfig {
  google_access_token?: string
  google_refresh_token?: string
  google_token_expires_at?: string
  calendar_connected: boolean
  timezone: string
  business_hours: {
    monday: { start: string; end: string; enabled: boolean }
    tuesday: { start: string; end: string; enabled: boolean }
    wednesday: { start: string; end: string; enabled: boolean }
    thursday: { start: string; end: string; enabled: boolean }
    friday: { start: string; end: string; enabled: boolean }
    saturday: { start: string; end: string; enabled: boolean }
    sunday: { start: string; end: string; enabled: boolean }
  }
}

export async function getCalendarConfig(businessId: string): Promise<CalendarConfig | null> {
  try {
    if (!isSupabaseConfigured()) {
      logger.info('Calendar config requested (demo mode)', { businessId })
      return {
        calendar_connected: false,
        timezone: 'America/New_York',
        business_hours: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '10:00', end: '14:00', enabled: false },
          sunday: { start: '10:00', end: '14:00', enabled: false }
        }
      }
    }

    const { data: business, error } = await supabaseAdmin
      .from('businesses')
      .select('google_access_token, google_refresh_token, google_token_expires_at, calendar_connected, timezone, business_hours')
      .eq('id', businessId)
      .single()

    if (error) {
      logger.error('Failed to fetch calendar config', { 
        error: error instanceof Error ? error.message : error, 
        businessId 
      })
      return null
    }

    return {
      google_access_token: business.google_access_token,
      google_refresh_token: business.google_refresh_token,
      google_token_expires_at: business.google_token_expires_at,
      calendar_connected: business.calendar_connected || false,
      timezone: business.timezone || 'America/New_York',
      business_hours: business.business_hours || {
        monday: { start: '09:00', end: '17:00', enabled: true },
        tuesday: { start: '09:00', end: '17:00', enabled: true },
        wednesday: { start: '09:00', end: '17:00', enabled: true },
        thursday: { start: '09:00', end: '17:00', enabled: true },
        friday: { start: '09:00', end: '17:00', enabled: true },
        saturday: { start: '10:00', end: '14:00', enabled: false },
        sunday: { start: '10:00', end: '14:00', enabled: false }
      }
    }
  } catch (error) {
    logger.error('Calendar config fetch error', { 
      error: error instanceof Error ? error.message : error, 
      businessId 
    })
    return null
  }
}

export async function createCalendarEvent(businessId: string, event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> {
  try {
    if (!isSupabaseConfigured()) {
      logger.info('Calendar event creation requested (demo mode)', { businessId, event })
      return {
        id: `demo-${Date.now()}`,
        ...event
      }
    }

    // In a real implementation, this would create an event in Google Calendar
    // For now, we'll store it in our database
    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        business_id: businessId,
        customer_name: event.title,
        appointment_date: event.start,
        duration_minutes: Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000),
        status: 'scheduled',
        notes: event.description,
        location: event.location
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create calendar event', { 
        error: error instanceof Error ? error.message : error, 
        businessId, 
        event 
      })
      return null
    }

    return {
      id: appointment.id,
      title: event.title,
      start: event.start,
      end: event.end,
      description: event.description,
      location: event.location,
      attendees: event.attendees
    }
  } catch (error) {
    logger.error('Calendar event creation error', { 
      error: error instanceof Error ? error.message : error, 
      businessId, 
      event 
    })
    return null
  }
}

export async function getAvailableSlots(businessId: string, date: string, duration: number = 60): Promise<string[]> {
  try {
    if (!isSupabaseConfigured()) {
      logger.info('Available slots requested (demo mode)', { businessId, date, duration })
      return [
        '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'
      ]
    }

    const config = await getCalendarConfig(businessId)
    if (!config) {
      return []
    }

    // Get existing appointments for the date
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select('appointment_date, duration_minutes')
      .eq('business_id', businessId)
      .gte('appointment_date', `${date}T00:00:00`)
      .lt('appointment_date', `${date}T23:59:59`)
      .in('status', ['scheduled', 'confirmed'])

    if (error) {
      logger.error('Failed to fetch appointments for slot calculation', { 
        error: error instanceof Error ? error.message : error, 
        businessId, 
        date 
      })
      return []
    }

    // Calculate available slots based on business hours and existing appointments
    const availableSlots: string[] = []
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const dayConfig = config.business_hours[dayOfWeek as keyof typeof config.business_hours]

    if (dayConfig?.enabled) {
      const startHour = parseInt(dayConfig.start.split(':')[0])
      const endHour = parseInt(dayConfig.end.split(':')[0])
      
      for (let hour = startHour; hour < endHour; hour++) {
        const slotTime = `${hour.toString().padStart(2, '0')}:00`
        const slotDateTime = `${date}T${slotTime}:00`
        
        // Check if this slot conflicts with existing appointments
        const hasConflict = appointments?.some(apt => {
          const aptStart = new Date(apt.appointment_date)
          const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000)
          const slotStart = new Date(slotDateTime)
          const slotEnd = new Date(slotStart.getTime() + duration * 60000)
          
          return (slotStart < aptEnd && slotEnd > aptStart)
        })

        if (!hasConflict) {
          availableSlots.push(slotTime)
        }
      }
    }

    return availableSlots
  } catch (error) {
    logger.error('Available slots calculation error', { 
      error: error instanceof Error ? error.message : error, 
      businessId, 
      date, 
      duration 
    })
    return []
  }
}

export function generateGoogleAuthUrl(businessId: string): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/calendar/callback`
  const scope = 'https://www.googleapis.com/auth/calendar'
  
  const params = new URLSearchParams({
    client_id: clientId || 'demo-client-id',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    state: businessId,
    access_type: 'offline',
    prompt: 'consent'
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export { generateGoogleAuthUrl as generateAuthUrl }
