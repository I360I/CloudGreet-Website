import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.info('Testing database connection...')

    // Test basic connection with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 5000)
    )

    const connectionPromise = supabaseAdmin
      .from('businesses')
      .select('id')
      .limit(1)

    const result = await Promise.race([connectionPromise, timeoutPromise])
    const duration = Date.now() - startTime

    logger.info('Database connection successful', {
      duration: `${duration}ms`,
      result: result
    })

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logger.error('Database connection failed', {
      error: errorMessage,
      duration: `${duration}ms`
    })

    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: errorMessage,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
