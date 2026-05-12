import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /book/<username>/<event-slug>[?queryParams]
 *   → 302 to https://cal.com/<username>/<event-slug>[?queryParams]
 *
 * Exists so the URLs we paste into onboarding/booking emails are
 * cloudgreet.com URLs, not bare cal.com URLs. mail.com (and Outlook,
 * occasionally Gmail) flag bare cal.com links as suspicious in
 * webmail clients, blocking the link with a "this page may harm
 * your computer" warning. Routing through our own domain bypasses
 * the email-provider URL filter entirely - the recipient's webmail
 * inspects cloudgreet.com (clean reputation), and the redirect
 * fires browser-side after the spam check is done.
 *
 * Catch-all so any cal.com path shape works: /book/foo,
 * /book/foo/15min, /book/foo/team/30min, etc.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = (params.path || []).join('/').replace(/^\/+/, '')
  if (!path) {
    // No path = not a valid booking URL. Send to homepage so the user
    // isn't dropped on a Cal.com 404.
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Preserve any query string the rep included on the URL (e.g.
  // ?duration=30 or ?name=Bob for prefill).
  const search = request.nextUrl.search // includes leading '?' or empty
  const target = `https://cal.com/${path}${search}`

  return NextResponse.redirect(target, 302)
}
