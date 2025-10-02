import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    return NextResponse.json({
      success: true,
      message: 'Test API working',
      received: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Test API failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test API GET working',
    timestamp: new Date().toISOString()
  })
}
