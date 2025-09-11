import { NextRequest, NextResponse } from 'next/server'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const errorId = searchParams.get('errorId')

    if (!errorId) {
      return NextResponse.json({
        success: false,
        error: 'Error ID is required'
      }, { status: 400 })
    }

    // Check if this is a Next.js error ID
    if (errorId === '2813744010') {
      return NextResponse.json({
        success: true,
        error: {
          id: errorId,
          type: 'nextjs_error',
          message: 'This appears to be a Next.js internal error ID',
          description: 'Error ID 2813744010 is likely a Next.js internal error identifier. This could be related to:',
          possibleCauses: [
            'Hydration mismatch between server and client',
            'Component rendering error',
            'API route error',
            'Build-time error',
            'Runtime JavaScript error'
          ],
          suggestions: [
            'Check browser console for detailed error messages',
            'Look for hydration warnings in development mode',
            'Check if any components are causing rendering issues',
            'Verify all API routes are working correctly',
            'Check for TypeScript compilation errors'
          ],
          timestamp: new Date().toISOString(),
          url: request.url
        }
      })
    }

    // Try to fetch from error reporting API
    try {
      const errorResponse = await fetch(`${request.nextUrl.origin}/api/error-reporting?errorId=${errorId}`)
      const errorData = await errorResponse.json()
      
      if (errorData.success) {
        return NextResponse.json({
          success: true,
          error: errorData.error,
          source: 'error_reporting_api'
        })
      }
    } catch (fetchError) {
      console.warn('Failed to fetch from error reporting API:', fetchError)
    }

    // Try to fetch from debug error tracker
    try {
      const trackerResponse = await fetch(`${request.nextUrl.origin}/api/debug/error-tracker?errorId=${errorId}`)
      const trackerData = await trackerResponse.json()
      
      if (trackerData.success) {
        return NextResponse.json({
          success: true,
          error: trackerData.error,
          source: 'error_tracker_api'
        })
      }
    } catch (fetchError) {
      console.warn('Failed to fetch from error tracker API:', fetchError)
    }

    // Error not found in any system
    return NextResponse.json({
      success: false,
      error: 'Error not found',
      suggestions: [
        'Check if the error ID is correct',
        'The error might have occurred before error tracking was set up',
        'Try checking browser console for more details',
        'The error might be a Next.js internal error'
      ]
    }, { status: 404 })

  } catch (error) {
    console.error('Error lookup failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to lookup error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
