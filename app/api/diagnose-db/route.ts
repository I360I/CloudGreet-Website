import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Diagnosing Supabase database...')
    
    // Test basic connection first
    const { data: connectionTest, error: connectionError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .limit(1)
    
    if (connectionError) {
      return NextResponse.json({
        success: false,
        message: 'Cannot connect to Supabase',
        error: connectionError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    // Get all tables in the database
    const { data: allTables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (tablesError) {
      return NextResponse.json({
        success: false,
        message: 'Cannot list tables',
        error: tablesError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    const existingTables = allTables?.map(t => t.table_name) || []
    
    // Check which tables the app expects
    const expectedTables = [
      'businesses',
      'toll_free_numbers', 
      'ai_agents',
      'password_reset_tokens',
      'users',
      'leads',
      'appointments',
      'calls',
      'realtime_sessions'
    ]
    
    const missingTables = expectedTables.filter(table => !existingTables.includes(table))
    const extraTables = existingTables.filter(table => !expectedTables.includes(table))
    
    // Test a few key tables
    const tableTests: any = {}
    
    for (const table of ['businesses', 'users', 'leads']) {
      if (existingTables.includes(table)) {
        try {
          const { data, error } = await supabaseAdmin
            .from(table)
            .select('*')
            .limit(1)
          
          tableTests[table] = {
            exists: true,
            accessible: !error,
            error: error?.message || null,
            hasData: data && data.length > 0,
            sampleColumns: data && data.length > 0 ? Object.keys(data[0]) : []
          }
        } catch (err) {
          tableTests[table] = {
            exists: true,
            accessible: false,
            error: err instanceof Error ? err.message : 'Unknown error',
            hasData: false,
            sampleColumns: []
          }
        }
      } else {
        tableTests[table] = {
          exists: false,
          accessible: false,
          error: 'Table does not exist',
          hasData: false,
          sampleColumns: []
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database diagnosis completed',
      connection: 'Working',
      existingTables,
      expectedTables,
      missingTables,
      extraTables,
      tableTests,
      recommendations: missingTables.length > 0 ? [
        `Missing ${missingTables.length} required tables: ${missingTables.join(', ')}`,
        'You need to create these tables or restore them from backup',
        'Check your Supabase dashboard for table management'
      ] : [
        'All required tables exist',
        'Check if table structures match what the app expects'
      ],
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Database diagnosis failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Database diagnosis failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
