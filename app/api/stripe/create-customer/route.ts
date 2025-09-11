import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'
import Stripe from "stripe"

// Initialize Stripe with real API key
const stripeKey = process.env.STRIPE_SECRET_KEY
let stripe: Stripe | null = null

if (stripeKey) {
  stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, userId } = await request.json()

    if (!email || !name || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, userId' },
        { status: 400 }
      )
    }

    if (!stripe) {
      return NextResponse.json({
        error: 'Stripe API key not configured. Please set STRIPE_SECRET_KEY in environment variables.'
      }, { status: 503 })
    }

    // Create real Stripe customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    })

    let customer
    if (customers.data.length > 0) {
      customer = customers.data[0]
    } else {
      customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId: userId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      }
    })

  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}
