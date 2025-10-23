import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('Checking Supabase tables...')
    
    const tables = [
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
    
    const results: any = {}
    
    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1)
        
        results[table] = {
          exists: !error,
          error: error?.message || null,
          hasData: data && data.length > 0
        }
      } catch (err) {
        results[table] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          hasData: false
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Table check completed',
      tables: results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Table check failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Table check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
