/**
 * Meta (Facebook) Pixel helper - every function is a no-op unless
 * NEXT_PUBLIC_META_PIXEL_ID is set, so this is safe to call anywhere.
 *
 * Standard events we use:
 *   Lead     - visitor asked our AI to call them (highest-intent form)
 *   Schedule - demo booked on the Cal.com embed
 * Custom events:
 *   DemoCallStarted - visitor started a live web call with a demo agent
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''

declare global {
  // eslint-disable-next-line no-var
  var fbq: ((...args: any[]) => void) | undefined
}

export function metaTrack(event: string, params?: Record<string, any>, eventId?: string) {
  if (!META_PIXEL_ID || typeof window === 'undefined' || !window.fbq) return
  try {
    window.fbq('track', event, params || {}, eventId ? { eventID: eventId } : undefined)
  } catch { /* never break the page over analytics */ }
}

export function metaTrackCustom(event: string, params?: Record<string, any>) {
  if (!META_PIXEL_ID || typeof window === 'undefined' || !window.fbq) return
  try {
    window.fbq('trackCustom', event, params || {})
  } catch { /* ignore */ }
}

export function newEventId(): string {
  try { return crypto.randomUUID() } catch { return `evt_${Date.now()}_${Math.floor(Math.random() * 1e9)}` }
}
