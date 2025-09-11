import { NextRequest, NextResponse } from 'next/server'

// In-memory error storage (in production, use a proper database like Supabase)
const errorLog: Array<{
  id: string
  timestamp: string
  message: string
  stack?: string
  componentStack?: string
  userAgent: string
  url: string
  userId?: string
  type: string
}> = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      errorId, 
      message, 
      stack, 
      componentStack, 
      userAgent, 
      url, 
      userId,
      type = 'react_error'
    } = body

    // Validate required fields
    if (!errorId || !message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: errorId and message'
      }, { status: 400 })
    }

    // Log the error
    const errorEntry = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message,
      stack,
      componentStack,
      userAgent: userAgent || 'Unknown',
      url: url || 'Unknown',
      userId: userId || 'anonymous',
      type
    }

    errorLog.push(errorEntry)
    
    // Keep only last 1000 errors to prevent memory issues
    if (errorLog.length > 1000) {
      errorLog.splice(0, errorLog.length - 1000)
    }

    console.error('🚨 Error Reported:', {
      id: errorEntry.id,
      message: errorEntry.message,
      url: errorEntry.url,
      userId: errorEntry.userId,
      timestamp: errorEntry.timestamp
    })

    // In production, you would also:
    // 1. Save to database (Supabase)
    // 2. Send to monitoring service (Sentry, LogRocket, etc.)
    // 3. Send alerts for critical errors
    // 4. Aggregate error statistics

    return NextResponse.json({
      success: true,
      errorId: errorEntry.id,
      message: 'Error logged successfully'
    })

  } catch (error) {
    console.error('Error reporting failed:', error)
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type')

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

    // Get filtered errors
    let filteredErrors = errorLog

    if (type) {
      filteredErrors = errorLog.filter(e => e.type === type)
    }

    // Get recent errors (last N)
    const recentErrors = filteredErrors
      .slice(-limit)
      .reverse()

    // Calculate error statistics
    const stats = {
      total: errorLog.length,
      byType: errorLog.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recent: recentErrors.length,
      last24Hours: errorLog.filter(e => {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return new Date(e.timestamp) > dayAgo
      }).length
    }

    return NextResponse.json({
      success: true,
      errors: recentErrors,
      stats
    })

  } catch (error) {
    console.error('Error retrieval failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve errors'
    }, { status: 500 })
  }
}