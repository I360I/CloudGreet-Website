import { NextRequest, NextResponse } from "next/server"
import { updateUser } from '../../../../lib/auth'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    return NextResponse.json({
      success: true,
      data: {
        status: 'ready',
        message: 'Service is ready'
      }
    });
  } catch (error) {
    console.error('Error in GET method:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get service status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      )
    }

    // Get user data to find their Stripe customer ID
    const userResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/get-user-data?userId=${userId}`)
    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userData = await userResponse.json()
    const user = userData.user

    if (!user.stripe_customer_id) {
      return NextResponse.json(
        { error: 'User has no Stripe customer ID' },
        { status: 400 }
      )
    }

    // Get booking count for the current month
    const bookingsResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/bookings?userId=${userId}&monthly=true`)
    if (!bookingsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    const bookingsData = await bookingsResponse.json()
    const bookingCount = bookingsData.bookings?.length || 0

    // Charge for bookings if there are any
    if (bookingCount > 0) {
      const chargeResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/stripe/charge-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: user.stripe_customer_id,
          bookingCount: bookingCount,
          userId: userId,
        }),
      })

      if (!chargeResponse.ok) {
        const errorData = await chargeResponse.json()
        return NextResponse.json(
          { error: 'Failed to charge booking fees', details: errorData },
          { status: 500 }
        )
      }

      const chargeData = await chargeResponse.json()

      // Update user with last billing info
      await updateUser(userId, {
        last_billing_date: new Date().toISOString(),
        last_booking_charge: bookingCount,
        last_billing_amount: chargeData.amount,
      })

      return NextResponse.json({
        success: true,
        message: `Successfully charged for ${bookingCount} bookings`,
        bookingCount: bookingCount,
        amount: chargeData.amount,
        invoiceId: chargeData.invoiceId,
      })
    } else {
      return NextResponse.json({
        success: true,
        message: 'No bookings to charge this month',
        bookingCount: 0,
        amount: 0,
      })
    }

  } catch (error) {
    console.error('Error processing monthly billing:', error)
    return NextResponse.json(
      { error: 'Failed to process monthly billing' },
      { status: 500 }
    )
  }
}
