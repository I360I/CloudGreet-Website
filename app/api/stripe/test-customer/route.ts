import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name } = body

    // Create Stripe customer for testing
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        test: 'true',
        source: 'api_test'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Stripe customer created successfully',
      data: {
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name
        }
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to create Stripe customer',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
