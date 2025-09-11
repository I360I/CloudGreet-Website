import { NextRequest, NextResponse } from 'next/server'


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
    const { userId, bookingId, customerId, amount = 50 } = await request.json()
    
    console.log('📊 Tracking booking for billing:', { userId, bookingId, amount })

    if (!userId || !bookingId) {
      return NextResponse.json(
        { error: 'User ID and booking ID are required' },
        { status: 400 }
      )
    }

    // Step 1: Create invoice item for the booking
    try {
      const invoiceItemResponse = await fetch('https://api.stripe.com/v1/invoiceitems', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          customer: customerId,
          price: 'price_1S4UEdEWqBe9pRB4GijnFF1M', // $50 per booking
          quantity: '1', // 1 booking = $50 charge
          description: `Booking #${bookingId} - AI Receptionist Service`,
          metadata: JSON.stringify({
            booking_id: bookingId,
            user_id: userId,
            type: 'per_booking_fee',
            amount: amount
          })
        })
      })

      if (invoiceItemResponse.ok) {
        const invoiceItem = await invoiceItemResponse.json()
        console.log('✅ Invoice item created:', invoiceItem.id)

        // Step 2: Create and finalize invoice
        const invoiceResponse = await fetch('https://api.stripe.com/v1/invoices', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            customer: customerId,
            auto_advance: 'true',
            collection_method: 'charge_automatically'
          })
        })

        if (invoiceResponse.ok) {
          const invoice = await invoiceResponse.json()
          console.log('✅ Invoice created:', invoice.id)

          // Step 3: Pay the invoice immediately
          const payResponse = await fetch(`https://api.stripe.com/v1/invoices/${invoice.id}/pay`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          })

          if (payResponse.ok) {
            const paidInvoice = await payResponse.json()
            console.log('✅ Invoice paid:', paidInvoice.id)

            return NextResponse.json({
              success: true,
              message: 'Booking billed successfully',
              data: {
                invoiceId: paidInvoice.id,
                amount: amount,
                status: paidInvoice.status,
                bookingId: bookingId
              }
            })
          } else {
            const errorText = await payResponse.text()
            console.error('❌ Failed to pay invoice:', errorText)
            return NextResponse.json({
              success: false,
              error: 'Failed to charge for booking',
              details: errorText
            }, { status: 500 })
          }
        } else {
          const errorText = await invoiceResponse.text()
          console.error('❌ Failed to create invoice:', errorText)
          return NextResponse.json({
            success: false,
            error: 'Failed to create invoice',
            details: errorText
          }, { status: 500 })
        }
      } else {
        const errorText = await invoiceItemResponse.text()
        console.error('❌ Failed to create invoice item:', errorText)
        return NextResponse.json({
          success: false,
          error: 'Failed to create invoice item',
          details: errorText
        }, { status: 500 })
      }
    } catch (error) {
      console.error('❌ Error processing booking billing:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to process booking billing',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error in track-booking API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
