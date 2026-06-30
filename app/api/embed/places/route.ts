import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('input')?.trim()
  if (!input || input.length < 2) return NextResponse.json({ predictions: [] })

  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return NextResponse.json({ predictions: [] })

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
  url.searchParams.set('input', input)
  url.searchParams.set('types', 'address')
  url.searchParams.set('key', key)

  const r = await fetch(url.toString())
  const j = await r.json().catch(() => ({ predictions: [] }))

  const predictions = (j.predictions || []).slice(0, 5).map((p: { description: string }) => p.description)
  return NextResponse.json({ predictions })
}
