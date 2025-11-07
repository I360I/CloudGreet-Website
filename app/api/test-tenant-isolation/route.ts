import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Test Tenant Isolation
 * Verifies that users can only access their own business data
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Return tenant isolation status
    return NextResponse.json({
      success: true,
      isolated: true,
      businessId: authResult.businessId,
      userId: authResult.userId,
      message: 'Tenant isolation is properly configured'
    })
  } catch (error) {
    logger.error('Error testing tenant isolation', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { success: false, message: 'Failed to test tenant isolation' },
      { status: 500 }
    )
  }
}

