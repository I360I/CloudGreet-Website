import { NextResponse } from 'next/server'
import { fetchComplianceEvents } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const events = await fetchComplianceEvents(50)
    return NextResponse.json({ success: true, ...events })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to load compliance events' },
      { status: 500 }
    )
  }
}


