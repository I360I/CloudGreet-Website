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

/**
 * getCalendarConfig - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await getCalendarConfig(param1, param2)
 * ```
 */
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
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId 
    })
    return null
  }
}

/**
 * createCalendarEvent - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await createCalendarEvent(param1, param2)
 * ```
 */
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
      // Get valid access token (refresh if expired)
      let accessToken = await getValidAccessToken(businessId)
      
      if (!accessToken) {
        logger.warn('No valid Google access token available, skipping calendar sync', { businessId })
      } else {
        // Retry logic for calendar API calls
        let retries = 2
        let calendarSuccess = false
        
        while (retries >= 0 && !calendarSuccess) {
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
              
              calendarSuccess = true
            } else if (calendarResponse.status === 401 && retries > 0) {
              // Token expired, try to refresh and retry
              logger.warn('Google Calendar API returned 401, refreshing token and retrying', {
                businessId,
                retries
              })
              
              accessToken = await refreshGoogleToken(businessId)
              if (!accessToken) {
                logger.error('Failed to refresh token, cannot retry calendar sync', { businessId })
                break
              }
              
              retries--
            } else {
              const errorText = await calendarResponse.text().catch(() => 'Unknown error')
              logger.error('Failed to create Google Calendar event', {
                status: calendarResponse.status,
                statusText: calendarResponse.statusText,
                error: errorText,
                businessId,
                retries
              })
              
              // Don't retry on non-auth errors
              if (calendarResponse.status !== 401) {
                break
              }
              
              retries--
            }
          } catch (googleError) {
            logger.error('Google Calendar API error', {
              error: googleError instanceof Error ? googleError.message : 'Unknown error',
              businessId,
              retries
            })
            
            // Only retry on network errors, not on other errors
            if (retries > 0 && googleError instanceof Error && (
              googleError.message.includes('network') ||
              googleError.message.includes('timeout') ||
              googleError.message.includes('ECONNREFUSED')
            )) {
              retries--
              // Wait 1 second before retry
              await new Promise(resolve => setTimeout(resolve, 1000))
            } else {
              break
            }
          }
        }
        
        if (!calendarSuccess) {
          logger.warn('Failed to sync appointment to Google Calendar after retries, appointment saved in database', {
            appointmentId: appointment.id,
            businessId
          })
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
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId,
      event: JSON.stringify(event)
    })
    return null
  }
}

/**
 * getAvailableSlots - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await getAvailableSlots(param1, param2)
 * ```
 */
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
    // Handle schema variations: try scheduled_date first, fallback to start_time
    let appointments: any[] = []
    let error: any = null

    // Try scheduled_date first (matches voice-webhook insert)
    const { data: appointmentsWithScheduledDate, error: error1 } = await supabaseAdmin
      .from('appointments')
      .select('scheduled_date, start_time, duration_minutes, duration')
      .eq('business_id', businessId)
      .gte('scheduled_date', `${date}T00:00:00`)
      .lt('scheduled_date', `${date}T23:59:59`)
      .in('status', ['scheduled', 'confirmed'])

    if (!error1 && appointmentsWithScheduledDate) {
      appointments = appointmentsWithScheduledDate
    } else {
      // Fallback: try start_time if scheduled_date doesn't exist
      const { data: appointmentsWithStartTime, error: error2 } = await supabaseAdmin
        .from('appointments')
        .select('start_time, duration_minutes, duration')
        .eq('business_id', businessId)
        .gte('start_time', `${date}T00:00:00`)
        .lt('start_time', `${date}T23:59:59`)
        .in('status', ['scheduled', 'confirmed'])

      if (error2) {
        logger.error('Failed to fetch appointments for slot calculation', { 
          error: error2 instanceof Error ? error2.message : error2, 
          businessId, 
          date 
        })
        return []
      }
      appointments = appointmentsWithStartTime || []
    }

    // Calculate available slots based on business hours and existing appointments
    const availableSlots: string[] = []
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const dayConfig = config.business_hours[dayOfWeek as keyof typeof config.business_hours]

    if (dayConfig?.enabled) {
      const startHour = parseInt(dayConfig.start.split(':')[0])
      const endHour = parseInt(dayConfig.end.split(':')[0])
      
      /**
      
       * for - Add description here
      
       * 
      
       * @param {...any} args - Method parameters
      
       * @returns {Promise<any>} Method return value
      
       * @throws {Error} When operation fails
      
       * 
      
       * @example
      
       * ```typescript
      
       * await this.for(param1, param2)
      
       * ```
      
       */
      
      for (let hour = startHour; hour < endHour; hour++) {
        const slotTime = `${hour.toString().padStart(2, '0')}:00`
        const slotDateTime = `${date}T${slotTime}:00`
        
        // Check if this slot conflicts with existing appointments
        // Handle both scheduled_date and start_time columns
        const hasConflict = appointments?.some(apt => {
          const aptDateTime = apt.scheduled_date || apt.start_time
          if (!aptDateTime) return false
          
          const aptStart = new Date(aptDateTime)
          const aptDuration = apt.duration_minutes || apt.duration || 60
          const aptEnd = new Date(aptStart.getTime() + aptDuration * 60000)
          const slotStart = new Date(slotDateTime)
          const slotEnd = new Date(slotStart.getTime() + duration * 60000)
          
          return (slotStart < aptEnd && slotEnd > aptStart)
        })

        /**

         * if - Add description here

         * 

         * @param {...any} args - Method parameters

         * @returns {Promise<any>} Method return value

         * @throws {Error} When operation fails

         * 

         * @example

         * ```typescript

         * await this.if(param1, param2)

         * ```

         */

        if (!hasConflict) {
          availableSlots.push(slotTime)
        }
      }
    }

    return availableSlots
  } catch (error) {
    logger.error('Available slots calculation error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId, 
      date, 
      duration 
    })
    return []
  }
}

/**
 * generateGoogleAuthUrl - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await generateGoogleAuthUrl(param1, param2)
 * ```
 */
export function generateGoogleAuthUrl(businessId: string): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/calendar/callback`
  const scope = 'https://www.googleapis.com/auth/calendar'
  
  const params = new URLSearchParams({
    client_id: clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
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

export async function saveGoogleTokens(businessId: string, tokens: {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  token_type?: string
}): Promise<void> {
  try {
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    const { error } = await supabaseAdmin
      .from('businesses')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token ?? null,
        google_token_expires_at: expiresAt,
        calendar_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (error) {
      logger.error('Failed to save Google tokens', {
        businessId,
        error: error.message
      })
    }
  } catch (error) {
    logger.error('Error saving Google tokens', {
      businessId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * refreshGoogleToken - Refresh expired Google access token using refresh token
 * 
 * @param businessId - Business ID to refresh token for
 * @returns Promise<string | null> - New access token or null if refresh failed
 */
export async function refreshGoogleToken(businessId: string): Promise<string | null> {
  try {
    const config = await getCalendarConfig(businessId)
    
    if (!config?.google_refresh_token) {
      logger.warn('No refresh token available for business', { businessId })
      return null
    }

    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      logger.error('Google OAuth credentials not configured')
      return null
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/calendar/callback`
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: config.google_refresh_token,
        grant_type: 'refresh_token'
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      logger.error('Failed to refresh Google token', {
        status: tokenResponse.status,
        error: errorText,
        businessId
      })
      
      // If refresh fails, clear tokens and mark calendar as disconnected
      await clearGoogleTokens(businessId)
      return null
    }

    const tokens = await tokenResponse.json()
    
    // Save new access token
    await saveGoogleTokens(businessId, {
      access_token: tokens.access_token,
      refresh_token: config.google_refresh_token, // Keep existing refresh token
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      token_type: tokens.token_type
    })

    logger.info('Google token refreshed successfully', { businessId })
    return tokens.access_token
  } catch (error) {
    logger.error('Error refreshing Google token', {
      businessId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}

/**
 * getValidAccessToken - Get valid Google access token, refreshing if expired
 * 
 * @param businessId - Business ID
 * @returns Promise<string | null> - Valid access token or null
 */
export async function getValidAccessToken(businessId: string): Promise<string | null> {
  const config = await getCalendarConfig(businessId)
  
  if (!config?.google_access_token) {
    return null
  }

  // Check if token is expired (with 5 minute buffer)
  if (config.google_token_expires_at) {
    const expiresAt = new Date(config.google_token_expires_at)
    const now = new Date()
    const buffer = 5 * 60 * 1000 // 5 minutes
    
    if (now.getTime() >= expiresAt.getTime() - buffer) {
      // Token expired or expiring soon, refresh it
      logger.info('Google access token expired, refreshing', { businessId })
      return await refreshGoogleToken(businessId)
    }
  }

  return config.google_access_token
}

export async function clearGoogleTokens(businessId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('businesses')
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expires_at: null,
        calendar_connected: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (error) {
      logger.error('Failed to clear Google tokens', {
        businessId,
        error: error.message
      })
    }
  } catch (error) {
    logger.error('Error clearing Google tokens', {
      businessId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * syncGoogleCalendarEvent - Update or create Google Calendar event for appointment
 */
export async function syncGoogleCalendarEvent(
  calendarId: string,
  appointment: any,
  existingEventId?: string | null
): Promise<string | null> {
  try {
    const businessId = appointment.business_id
    const accessToken = await getValidAccessToken(businessId)
    
    if (!accessToken) {
      logger.warn('No valid Google access token, skipping calendar sync', { businessId })
      return null
    }

    const startTime = new Date(appointment.start_time)
    const endTime = new Date(appointment.end_time)
    
    const eventData = {
      summary: `${appointment.service_type} - ${appointment.customer_name}`,
      description: appointment.notes || `Appointment with ${appointment.customer_name}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC'
      },
      location: appointment.address || undefined,
      attendees: appointment.customer_email ? [{ email: appointment.customer_email }] : undefined
    }

    const url = existingEventId
      ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${existingEventId}`
      : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`

    const method = existingEventId ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Failed to sync Google Calendar event', {
        status: response.status,
        error: errorText,
        appointmentId: appointment.id
      })
      return null
    }

    const event = await response.json()
    return event.id || null
  } catch (error) {
    logger.error('Error syncing Google Calendar event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      appointmentId: appointment.id
    })
    return null
  }
}

/**
 * deleteGoogleCalendarEvent - Delete Google Calendar event
 */
export async function deleteGoogleCalendarEvent(
  calendarId: string,
  eventId: string
): Promise<boolean> {
  try {
    // Get businessId from calendarId (google_calendar_id)
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('google_calendar_id', calendarId)
      .single()

    if (!business) {
      logger.error('Business not found for calendar ID', { calendarId })
      return false
    }

    const accessToken = await getValidAccessToken(business.id)
    
    if (!accessToken) {
      logger.warn('No valid Google access token, skipping calendar deletion', { businessId: business.id })
      return false
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text()
      logger.error('Failed to delete Google Calendar event', {
        status: response.status,
        error: errorText,
        eventId
      })
      return false
    }

    return true
  } catch (error) {
    logger.error('Error deleting Google Calendar event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      eventId
    })
    return false
  }
}
