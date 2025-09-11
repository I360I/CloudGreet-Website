import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'
import Stripe from "stripe"

// Initialize Stripe only if we have a real API key
const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey && !stripeKey.includes('your-') && !stripeKey.includes('demo-') 
  ? new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  : null

export async function POST(request: NextRequest) {
  try {
    const { customerId, bookingCount, userId } = await request.json()

    if (!customerId || bookingCount === undefined || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, bookingCount, userId' },
        { status: 400 }
      )
    }

    if (bookingCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No bookings to charge',
        amount: 0,
      })
    }

    // Calculate total amount ($50 per booking)
    const amount = bookingCount * 5000 // $50.00 in cents

    // Create invoice item for the booking charges
    const invoiceItem = await stripe.invoiceItems.create({
      customer: customerId,
      amount: amount,
      currency: 'usd',
      description: `${bookingCount} booking${bookingCount > 1 ? 's' : ''} @ $50 each`,
      metadata: {
        userId: userId,
        bookingCount: bookingCount.toString(),
        chargeType: 'booking',
      },
    })

    // Create and finalize invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: true, // Automatically finalize and attempt payment
      metadata: {
        userId: userId,
        chargeType: 'monthly_booking_charge',
      },
    })

    // Finalize the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)

    return NextResponse.json({
      success: true,
      invoiceId: finalizedInvoice.id,
      amount: amount,
      bookingCount: bookingCount,
      status: finalizedInvoice.status,
    })

  } catch (error) {
    console.error('Error charging booking fees:', error)
    return NextResponse.json(
      { error: 'Failed to charge booking fees' },
      { status: 500 }
    )
  }
}
