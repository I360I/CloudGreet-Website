import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import Stripe from 'stripe'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
  }
    
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Decode JWT token
    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId
    
    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    const body = await request.json()
    const { appointmentId, customerName, serviceType, estimatedValue } = body

    // Get business Stripe customer ID
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('stripe_customer_id, business_name, email, subscription_status')
      .eq('id', businessId)
      .eq('owner_id', userId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({
        success: false,
        message: 'Business not found'
      }, { status: 404 })
    }

    if (!business.stripe_customer_id) {
      return NextResponse.json({
        success: false,
        message: 'Stripe customer not created'
      }, { status: 400 })
    }

    if (business.subscription_status !== 'active') {
      return NextResponse.json({
        success: false,
        message: 'Subscription not active'
      }, { status: 400 })
    }

    // Calculate per-booking fee ($50)
    const bookingFee = 5000 // $50.00 in cents

    // Create Stripe invoice item for per-booking fee
    const invoiceItem = await stripe.invoiceItems.create({
      customer: business.stripe_customer_id,
      amount: bookingFee,
      currency: 'usd',
      description: `Booking Fee - ${serviceType} for ${customerName}`,
      metadata: {
        business_id: businessId,
        user_id: userId,
        appointment_id: appointmentId,
        customer_name: customerName,
        service_type: serviceType,
        estimated_value: estimatedValue?.toString() || '0',
        fee_type: 'per_booking'
      }
    })

    // Create and finalize invoice
    const invoice = await stripe.invoices.create({
      customer: business.stripe_customer_id,
      auto_advance: true, // Automatically finalize and attempt payment
      metadata: {
        business_id: businessId,
        user_id: userId,
        appointment_id: appointmentId,
        invoice_type: 'per_booking_fee'
      }
    })

    // Finalize the invoice (this will attempt to charge the customer)
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)

    // Update appointment with billing info
    await supabaseAdmin
      .from('appointments')
      .update({
        stripe_invoice_id: invoice.id,
        booking_fee_charged: bookingFee / 100, // Convert cents to dollars
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    // Log billing event
    await supabaseAdmin
      .from('billing_history')
      .insert({
        business_id: businessId,
        user_id: userId,
        appointment_id: appointmentId,
        stripe_invoice_id: invoice.id,
        amount: bookingFee / 100,
        currency: 'usd',
        billing_type: 'per_booking',
        status: finalizedInvoice.status === 'paid' ? 'paid' : 'pending',
        created_at: new Date().toISOString()
      })

    // Log audit event
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'per_booking_fee_charged',
        details: {
          business_id: businessId,
          user_id: userId,
          appointment_id: appointmentId,
          stripe_invoice_id: invoice.id,
          amount: bookingFee / 100,
          customer_name: customerName,
          service_type: serviceType
        },
        user_id: userId,
        business_id: businessId,
        created_at: new Date().toISOString()
      })

    await logger.info('Per-booking fee charged successfully', {
      requestId,
      businessId,
      userId,
      appointmentId,
      invoiceId: invoice.id,
      amount: bookingFee / 100,
      status: finalizedInvoice.status,
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'Per-booking fee charged successfully',
      data: {
        invoice: {
          id: invoice.id,
          status: finalizedInvoice.status,
          amount: bookingFee / 100,
          currency: 'usd'
        },
        appointment: {
          id: appointmentId,
          booking_fee_charged: bookingFee / 100
        }
      },
      meta: {
        requestId,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('Per-booking billing error', { 
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error', 
      requestId,
      endpoint: 'per_booking_billing',
      responseTime: Date.now() - startTime
    })
    return NextResponse.json({
      success: false,
      message: 'Failed to charge per-booking fee'
    }, { status: 500 })
  }
}

// Get billing summary for business
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
    }

    // Decode JWT token
    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId
    
    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Get current month's billing summary
    const currentMonth = new Date()
    currentMonth.setDate(1) // First day of month
    const nextMonth = new Date(currentMonth)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    // Get base subscription
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('subscription_status, billing_plan')
      .eq('id', businessId)
      .single()

    // Get per-booking fees for current month
    const { data: bookingFees } = await supabaseAdmin
      .from('billing_history')
      .select('amount, status, created_at')
      .eq('business_id', businessId)
      .gte('created_at', currentMonth.toISOString())
      .lt('created_at', nextMonth.toISOString())

    // Get appointments for current month
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('id, estimated_value, booking_fee_charged, created_at')
      .eq('business_id', businessId)
      .gte('created_at', currentMonth.toISOString())
      .lt('created_at', nextMonth.toISOString())

    const totalBookingFees = bookingFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0
    const totalAppointments = appointments?.length || 0
    const totalEstimatedValue = appointments?.reduce((sum, apt) => sum + (apt.estimated_value || 0), 0) || 0
    const baseSubscriptionFee = 200 // $200 base fee

    return NextResponse.json({
      success: true,
      data: {
        billing_summary: {
          base_subscription: baseSubscriptionFee,
          per_booking_fees: totalBookingFees,
          total_billing: baseSubscriptionFee + totalBookingFees,
          total_appointments: totalAppointments,
          total_estimated_value: totalEstimatedValue,
          period: {
            start: currentMonth.toISOString(),
            end: nextMonth.toISOString()
          }
        },
        subscription: {
          status: business?.subscription_status,
          plan: business?.billing_plan
        }
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to get billing summary'
    }, { status: 500 })
  }
}
