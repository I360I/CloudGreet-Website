import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const input = sp.get('input')?.trim()
  if (!input || input.length < 2) return NextResponse.json({ predictions: [] })

  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return NextResponse.json({ predictions: [] })

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
  url.searchParams.set('input', input)
  url.searchParams.set('types', 'address')
  url.searchParams.set('key', key)

  // Optional geo-restriction: when the widget passes lat/lng/radius, HARD-limit
  // suggestions to that circle (strictbounds) within the US. SmartRide's quote
  // widget passes Central Ohio so "CMH" surfaces the Columbus airport instead
  // of results in India / Pakistan / New Jersey.
  const lat = sp.get('lat'), lng = sp.get('lng'), radius = sp.get('radius')
  if (lat && lng && radius) {
    url.searchParams.set('location', `${lat},${lng}`)
    url.searchParams.set('radius', radius)
    url.searchParams.set('strictbounds', 'true')
    url.searchParams.set('components', 'country:us')
  }

  const r = await fetch(url.toString())
  const j = await r.json().catch(() => ({ predictions: [] }))

  const predictions = (j.predictions || []).slice(0, 5).map((p: { description: string }) => p.description)
  return NextResponse.json({ predictions })
}
