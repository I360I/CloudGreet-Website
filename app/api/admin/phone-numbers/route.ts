import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminToken } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic' // Fixed for deployment

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const adminPayload = verifyAdminToken(token)
    
    if (!adminPayload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Fetch toll-free numbers from database
    const { data: numbers, error } = await supabase
      .from('toll_free_numbers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching phone numbers:', error)
      return NextResponse.json({ error: 'Failed to fetch phone numbers' }, { status: 500 })
    }

    return NextResponse.json({ numbers: numbers || [] })
  } catch (error) {
    console.error('Phone numbers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
