import { NextRequest, NextResponse } from 'next/server'

// In-memory error storage (in production, use a proper database)
const errorLog: Array<{
  id: string
  timestamp: string
  error: any
  userAgent: string
  url: string
  userId?: string
}> = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { errorId, error, userAgent, url, userId } = body

    // Log the error
    const errorEntry = {
      id: errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      error,
      userAgent: userAgent || 'Unknown',
      url: url || 'Unknown',
      userId
    }

    errorLog.push(errorEntry)
    console.error('🚨 Client Error Reported:', errorEntry)

    return NextResponse.json({
      success: true,
      errorId: errorEntry.id,
      message: 'Error logged successfully'
    })

  } catch (error) {
    console.error('Error tracking failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to log error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const errorId = searchParams.get('errorId')

    if (errorId) {
      // Get specific error
      const error = errorLog.find(e => e.id === errorId)
      if (!error) {
        return NextResponse.json({
          success: false,
          error: 'Error not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        error
      })
    }

    // Get all errors (last 100)
    const recentErrors = errorLog.slice(-100).reverse()

    return NextResponse.json({
      success: true,
      errors: recentErrors,
      total: errorLog.length
    })

  } catch (error) {
    console.error('Error retrieval failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve errors'
    }, { status: 500 })
  }
}
