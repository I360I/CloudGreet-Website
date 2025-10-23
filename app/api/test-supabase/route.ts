import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Supabase connection...')
    
    // Test basic Supabase connection with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase connection timeout')), 10000)
    )
    
    const supabasePromise = supabaseAdmin
      .from('businesses')
      .select('id')
      .limit(1)
    
    const result = await Promise.race([supabasePromise, timeoutPromise])
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      data: result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Supabase test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Supabase connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
