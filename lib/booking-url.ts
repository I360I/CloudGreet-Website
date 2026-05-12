/**
 * Rewrite a bare cal.com URL to the equivalent cloudgreet.com/book/...
 * URL so webmail spam filters (mail.com is the worst offender) don't
 * flag the email. The /book/* route on our domain 302-redirects to
 * the real cal.com URL, with query strings preserved.
 *
 * Pass-through:
 *   - Non-cal.com URLs (e.g. RingCentral, custom domains) returned as-is.
 *   - Already-proxied URLs (cloudgreet.com/book/...) returned as-is.
 *   - Empty/invalid input returned as empty string.
 */
export function proxyBookingUrl(
  rawUrl: string | null | undefined,
  appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com',
): string {
  const url = (rawUrl || '').trim()
  if (!url) return ''

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url // not parseable, hand back unchanged
  }

  const host = parsed.hostname.toLowerCase()
  if (host !== 'cal.com' && host !== 'www.cal.com' && !host.endsWith('.cal.com')) {
    // Already on our domain, or a different scheduler - leave alone.
    return url
  }

  // Strip leading slash from pathname, then append query + hash so
  // duration prefills and similar parameters survive the redirect.
  const path = parsed.pathname.replace(/^\/+/, '')
  if (!path) return url // bare cal.com root, nothing to proxy

  const base = appBase.replace(/\/+$/, '')
  return `${base}/book/${path}${parsed.search}${parsed.hash}`
}
