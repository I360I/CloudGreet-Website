import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ 
    message: 'POST test endpoint working',
    received: body,
    timestamp: new Date().toISOString()
  })
}