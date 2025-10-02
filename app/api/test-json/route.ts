import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return NextResponse.json({ 
      success: true, 
      received: body,
      contentType: request.headers.get('content-type'),
      bodyLength: request.headers.get('content-length')
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      contentType: request.headers.get('content-type'),
      bodyLength: request.headers.get('content-length')
    }, { status: 400 })
  }
}
