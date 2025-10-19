import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { count } = body

    if (!count || count < 1 || count > 10) {
      return NextResponse.json({ error: 'Count must be between 1 and 10' }, { status: 400 })
    }

    // Simulate phone number purchase
    // In production, this would integrate with Telnyx API to purchase numbers
    const purchasedNumbers = []
    
    for (let i = 0; i < count; i++) {
      const phoneNumber = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`
      purchasedNumbers.push({
        id: `phone_${Date.now()}_${i}`,
        number: phoneNumber,
        status: 'available',
        verification_status: 'pending',
        created_at: new Date().toISOString()
      })
    }

    return NextResponse.json({ 
      success: true, 
      purchased: count,
      numbers: purchasedNumbers,
      message: `Successfully purchased ${count} phone numbers. Please verify them in Telnyx portal.`
    })
  } catch (error) {
    console.error('Buy phone numbers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}