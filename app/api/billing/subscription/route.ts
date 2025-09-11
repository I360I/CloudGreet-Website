import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check if onboarding is complete by looking for business record
    // In a real app, this would check the database
    const hasCompletedOnboarding = true // This would be a real check
    
    if (!hasCompletedOnboarding) {
      return NextResponse.json({
        success: false,
        message: 'Onboarding not complete'
      }, { status: 404 })
    }
    
    // Simulate getting subscription data
    const subscription = {
      id: 'sub_1234567890',
      status: 'active',
      plan: {
        name: 'CloudGreet Pro',
        price: 20000, // $200.00 in cents
        interval: 'month',
        currency: 'usd'
      },
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      cancelAtPeriodEnd: false,
      billing: {
        baseFee: 200, // $200/month
        perBookingFee: 50, // $50 per booking
        totalBookings: 0,
        totalBookingFees: 0,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
    
    return NextResponse.json({
      success: true,
      subscription
    })
    
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, bookingId, amount } = body
    
    if (action === 'charge_booking') {
      // Simulate charging $50 for a booking
      console.log(`💳 Charging $50 for booking: ${bookingId}`)
      
      return NextResponse.json({
        success: true,
        message: 'Booking fee charged successfully',
        charge: {
          id: `ch_${Math.random().toString(36).substr(2, 9)}`,
          amount: 5000, // $50.00 in cents
          currency: 'usd',
          bookingId,
          status: 'succeeded'
        }
      })
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error processing billing:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process billing' },
      { status: 500 }
    )
  }
}
