import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Starting registration debug')
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log('❌ DEBUG: Supabase not configured')
      return NextResponse.json({
        success: false,
        message: 'Database not configured'
      }, { status: 503 })
    }

    // Test database connection
    console.log('🔍 DEBUG: Testing database connection')
    const { data: testData, error: testError } = await supabase
      .from('businesses')
      .select('count')
      .limit(1)

    if (testError) {
      console.log('❌ DEBUG: Database connection failed:', testError)
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        error: testError.message,
        details: testError
      }, { status: 500 })
    }

    console.log('✅ DEBUG: Database connection successful')

    // Parse request body
    const body = await request.json()
    console.log('🔍 DEBUG: Request body:', body)

    // Test table existence
    const tables = ['businesses', 'users', 'ai_agents', 'audit_logs']
    const tableStatus = {}

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        tableStatus[table] = error ? { exists: false, error: error.message } : { exists: true }
      } catch (err) {
        tableStatus[table] = { exists: false, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    }

    console.log('🔍 DEBUG: Table status:', tableStatus)

    return NextResponse.json({
      success: true,
      message: 'Debug completed',
      data: {
        supabaseConfigured: isSupabaseConfigured(),
        databaseConnected: !testError,
        tables: tableStatus,
        requestBody: body
      }
    })

  } catch (error) {
    console.log('❌ DEBUG: Unexpected error:', error)
    return NextResponse.json({
      success: false,
      message: 'Debug failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}