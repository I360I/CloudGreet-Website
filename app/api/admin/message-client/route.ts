import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { success: false, message: 'Not implemented' },
    { status: 501 }
  )
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, message: 'Not implemented' },
    { status: 501 }
  )
}




