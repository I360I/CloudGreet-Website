import { google } from 'googleapis'
import { supabaseAdmin } from './supabase'
import { logger } from './monitoring'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback` : 'http://localhost:3000/api/calendar/callback'

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
)

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

export function generateAuthUrl(businessId: string) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: businessId,
  })
}

export async function getTokenAndSaveCredentials(code: string, businessId: string) {
  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const plus = google.plus({ version: 'v1', auth: oauth2Client })
    const profile = await plus.people.get({ userId: 'me' })
    const email = profile.data.emails?.[0]?.value

    if (!email) {
      throw new Error('Could not retrieve email from Google profile.')
    }

    const { data, error } = await supabaseAdmin
      .from('businesses')
      .update({
        google_calendar_access_token: tokens.access_token,
        google_calendar_refresh_token: tokens.refresh_token,
        google_calendar_scope: tokens.scope,
        google_calendar_expiry_date: new Date(tokens.expiry_date!).toISOString(),
        google_calendar_email: email,
      })
      .eq('id', businessId)

    if (error) {
      logger.error('Error saving Google Calendar tokens to Supabase', error, { businessId, email })
      throw new Error(`Failed to save calendar credentials: ${error.message}`)
    }

    logger.info('Google Calendar credentials saved successfully', { businessId, email })
    return { success: true, email }
  } catch (error) {
    logger.error('Error getting Google Calendar tokens', error as Error, { businessId })
    return { success: false, error: (error as Error).message }
  }
}

async function getAuthenticatedClient(businessId: string) {
  const { data: business, error } = await supabaseAdmin
    .from('businesses')
    .select('google_calendar_access_token, google_calendar_refresh_token, google_calendar_expiry_date')
    .eq('id', businessId)
    .single()

  if (error || !business) {
    throw new Error('Business not found or calendar not connected.')
  }

  oauth2Client.setCredentials({
    access_token: business.google_calendar_access_token,
    refresh_token: business.google_calendar_refresh_token,
    expiry_date: new Date(business.google_calendar_expiry_date).getTime(),
  })

  if (oauth2Client.isTokenExpired()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    await supabaseAdmin
      .from('businesses')
      .update({
        google_calendar_access_token: credentials.access_token,
        google_calendar_expiry_date: new Date(credentials.expiry_date!).toISOString(),
      })
      .eq('id', businessId)
  }

  return oauth2Client
}

export async function createCalendarEvent(businessId: string, event: any) {
  try {
    const auth = await getAuthenticatedClient(businessId)
    const calendar = google.calendar({ version: 'v3', auth })

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    })

    logger.info('Calendar event created', { businessId, eventId: res.data.id })
    return { success: true, eventId: res.data.id, htmlLink: res.data.htmlLink }
  } catch (error) {
    logger.error('Error creating calendar event', error as Error, { businessId, event })
    return { success: false, error: (error as Error).message }
  }
}

export async function deleteCalendarEvent(businessId: string, eventId: string) {
  try {
    const auth = await getAuthenticatedClient(businessId)
    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    })

    logger.info('Calendar event deleted', { businessId, eventId })
    return { success: true }
  } catch (error) {
    logger.error('Error deleting calendar event', error as Error, { businessId, eventId })
    return { success: false, error: (error as Error).message }
  }
}
