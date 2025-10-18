import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function GET(request: NextRequest) {
  try {
    // Check if Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_') || process.env.STRIPE_SECRET_KEY.length < 20) {
      // Console warn removed for production
      return NextResponse.json({
        success: true,
        data: [
          {
            id: 'price_cloudgreet_pro_monthly',
            name: 'CloudGreet Pro',
            description: 'Complete AI receptionist solution',
            amount: 20000, // $200 in cents
            currency: 'usd',
            interval: 'month',
            features: [
              'Unlimited calls',
              'AI receptionist',
              'Calendar integration',
              'SMS handling',
              '$50 per booking fee'
            ],
            isPopular: true
          }
        ]
      })
    }

    // Get all active prices from Stripe
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product']
    })

    // Filter for CloudGreet products and format them
    const plans = prices.data
      .filter(price => {
        const product = price.product as Stripe.Product
        return product.metadata?.service === 'cloudgreet'
      })
      .map(price => {
        const product = price.product as Stripe.Product
        return {
          id: price.id,
          name: product.name,
          description: product.description,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval,
          features: product.metadata?.features?.split(',') || [],
          isPopular: product.metadata?.popular === 'true'
        }
      })

    // If no plans found in Stripe, return default plans
    if (plans.length === 0) {
      return NextResponse.json({
        success: true,
        data: [
          {
            id: 'price_cloudgreet_pro_monthly',
            name: 'CloudGreet Pro',
            description: 'Complete AI receptionist solution',
            amount: 20000, // $200 in cents
            currency: 'usd',
            interval: 'month',
            features: [
              'Unlimited calls',
              'AI receptionist',
              'Calendar integration',
              'SMS handling',
              '$50 per booking fee'
            ],
            isPopular: true
          }
        ]
      })
    }

    return NextResponse.json({
      success: true,
      data: plans
    })

  } catch (error) {
    // Console error removed for production
    
    // Return default plans if Stripe fails
    return NextResponse.json({
      success: true,
      data: [
        {
          id: 'price_cloudgreet_pro_monthly',
          name: 'CloudGreet Pro',
          description: 'Complete AI receptionist solution',
          amount: 20000, // $200 in cents
          currency: 'usd',
          interval: 'month',
          features: [
            'Unlimited calls',
            'AI receptionist',
            'Calendar integration',
            'SMS handling',
            '$50 per booking fee'
          ],
          isPopular: true
        }
      ]
    })
  }
}
