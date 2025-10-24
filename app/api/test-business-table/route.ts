import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test if businesses table exists and get its structure
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Businesses table query failed',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Businesses table exists',
      data: data,
      count: data?.length || 0
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Businesses table test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
