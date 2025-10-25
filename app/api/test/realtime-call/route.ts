import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, businessId } = body
    
    // For now, just return success - in production this would initiate a real call
    return NextResponse.json({
      success: true,
      message: 'Test call initiated successfully',
      phoneNumber,
      businessId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to initiate test call'
    }, { status: 500 })
  }
}