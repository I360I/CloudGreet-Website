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
      logger.error('Supabase not configured for calendar', { businessId })
      return null
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

/**
 * Get valid Google Calendar access token, refreshing if needed
 */
async function getValidAccessToken(businessId: string): Promise<string | null> {
  const config = await getCalendarConfig(businessId)
  if (!config?.google_refresh_token) return null

  // Check if token is expired or expiring within 5 minutes
  const expiresAt = config.google_token_expires_at 
    ? new Date(config.google_token_expires_at)
    : null
  
  if (!expiresAt || expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    // Token expired or expiring soon, refresh it
    return await refreshGoogleToken(businessId, config.google_refresh_token)
  }

  return config.google_access_token || null
}

/**
 * Refresh Google Calendar OAuth token
 */
async function refreshGoogleToken(businessId: string, refreshToken: string): Promise<string | null> {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      logger.error('Google OAuth credentials not configured')
      return null
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      logger.error('Failed to refresh Google token', {
        status: response.status,
        error: errorData,
        businessId
      })
      
      // Mark calendar as disconnected if refresh fails
      await supabaseAdmin
        .from('businesses')
        .update({ calendar_connected: false })
        .eq('id', businessId)
      
      return null
    }

    const tokenData = await response.json()
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    // Update token in database
    await supabaseAdmin
      .from('businesses')
      .update({
        google_access_token: tokenData.access_token,
        google_token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    logger.info('Google token refreshed successfully', { businessId })
    
    return tokenData.access_token

  } catch (error) {
    logger.error('Token refresh error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId
    })
    return null
  }
}

export async function createCalendarEvent(businessId: string, event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> {
  try {
    // Get calendar configuration
    const config = await getCalendarConfig(businessId)
    
    // Create appointment in database first
    const { data: appointment, error: dbError } = await supabaseAdmin
      .from('appointments')
      .insert({
        business_id: businessId,
        customer_name: event.title,
        appointment_date: event.start,
        scheduled_date: event.start,
        duration_minutes: Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000),
        status: 'scheduled',
        notes: event.description,
        address: event.location,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Failed to create appointment in database', {
        error: dbError.message,
        businessId,
        event: JSON.stringify(event)
      })
      return null
    }

    // If Google Calendar is connected, create event there too
    if (config?.calendar_connected) {
      // Get valid access token (refreshes if needed)
      const accessToken = await getValidAccessToken(businessId)
      
      if (accessToken) {
        try {
          const googleEvent = {
            summary: event.title,
            description: event.description || '',
            location: event.location || '',
            start: {
              dateTime: event.start,
              timeZone: config.timezone || 'America/New_York'
            },
            end: {
              dateTime: event.end,
              timeZone: config.timezone || 'America/New_York'
            },
            attendees: event.attendees?.map(email => ({ email })) || [],
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 60 } // 1 hour before
              ]
            }
          }

          const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(googleEvent)
          })

          if (calendarResponse.ok) {
            const googleEventData = await calendarResponse.json()
            
            // Update appointment with Google Calendar event ID
            await supabaseAdmin
              .from('appointments')
              .update({
                google_event_id: googleEventData.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', appointment.id)

            logger.info('Appointment created in Google Calendar', {
              appointmentId: appointment.id,
              googleEventId: googleEventData.id,
              businessId
            })
          } else {
            logger.error('Failed to create Google Calendar event', {
              status: calendarResponse.status,
              statusText: calendarResponse.statusText
            })
          }
        } catch (googleError) {
          logger.error('Google Calendar API error', { error: googleError })
          // Continue anyway - appointment is in our database
        }
      }
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
      event: JSON.stringify(event)
    })
    return null
  }
}

export async function getAvailableSlots(businessId: string, date: string, duration: number = 60): Promise<string[]> {
  try {
    if (!isSupabaseConfigured()) {
      logger.error('Supabase not configured for calendar slots', { businessId, date, duration })
      return []
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
    client_id: clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    state: businessId, // Pass business_id (not business_name) for proper lookup
    access_type: 'offline',
    prompt: 'consent'
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export { generateGoogleAuthUrl as generateAuthUrl }
