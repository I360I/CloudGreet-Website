import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Temporary deploy-health marker. If this returns JSON in prod, deploys are
// flowing again (the demo-calendar-mirror route/lib was the build-breaker).
export async function GET() {
  return NextResponse.json({ marker: 'deploy-check-1', ok: true })
}
