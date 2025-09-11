import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you might want to add authentication)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all users who have completed onboarding
    const usersResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/get-all-users`)
    if (!usersResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    const usersData = await usersResponse.json()
    const users = usersData.users || []

    const results = []

    // Process billing for each user
    for (const user of users) {
      if (user.onboarding_status === 'completed' && user.stripe_customer_id) {
        try {
          const billingResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/stripe/monthly-billing`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
            }),
          })

          const billingData = await billingResponse.json()
          results.push({
            userId: user.id,
            email: user.email,
            success: billingResponse.ok,
            data: billingData,
          })
        } catch (error) {
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            error: error.message,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed billing for ${results.length} users`,
      results: results,
    })

  } catch (error) {
    console.error('Monthly billing cron error:', error)
    return NextResponse.json(
      { error: 'Monthly billing cron failed' },
      { status: 500 }
    )
  }
}
