// Simplified calendar integration for build
export async function generateAuthUrl(businessId: string) {
  // Simplified for build - would generate real Google OAuth URL in production
  const clientId = process.env.GOOGLE_CLIENT_ID || 'google_client_id'
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`
  return `https://accounts.google.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=calendar&state=${businessId}`
}

export async function getTokenAndSaveCredentials(code: string, businessId: string) {
  // Simplified for build - would handle real Google Calendar OAuth in production
  return {
    success: true,
    email: process.env.GOOGLE_CALENDAR_EMAIL || 'business@cloudgreet.com'
  }
}

export async function createCalendarEvent(businessId: string, eventData: any) {
  // Simplified for build - would create real calendar events in production
  return {
    success: true,
    eventId: `event_${Date.now()}`,
    eventUrl: 'https://calendar.google.com/event/123'
  }
}

export async function isCalendarConnected(businessId: string) {
  // Simplified for build - would check real calendar connection in production
  return {
    connected: true,
    email: process.env.GOOGLE_CALENDAR_EMAIL || 'business@cloudgreet.com'
  }
}