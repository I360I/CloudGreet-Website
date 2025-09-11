import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo purposes - in production this would be a database
let billingAccounts = new Map()

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const businessName = url.searchParams.get('businessName')
    
    if (!businessName) {
      return NextResponse.json(
        { success: false, error: 'Business name is required' },
        { status: 400 }
      )
    }

    const onboardingComplete = businessName && businessName !== 'Demo User'
    
    if (!onboardingComplete) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'not_setup',
          message: 'Complete onboarding to set up billing',
          subscription: null,
          currentBill: 0,
          nextBillingDate: null
        }
      })
    }

    // Get or create billing account
    let billingAccount = billingAccounts.get(businessName)
    
    if (!billingAccount) {
      // Create new billing account
      billingAccount = {
        businessName,
        subscription: {
          plan: 'CloudGreet Base Plan',
          basePrice: 200,
          perBookingPrice: 50,
          billingCycle: 'monthly',
          status: 'active',
          startDate: new Date().toISOString()
        },
        currentBill: {
          baseFee: 200,
          bookingFees: 0,
          total: 200,
          nextBillingDate: getNextBillingDate()
        },
        paymentMethod: {
          type: 'credit_card',
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025
        },
        billingHistory: [],
        createdAt: new Date().toISOString()
      }
      
      billingAccounts.set(businessName, billingAccount)
    }

    return NextResponse.json({
      success: true,
      data: billingAccount
    })

  } catch (error) {
    console.error('Billing status error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get billing status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { businessName, action, data } = await request.json()
    
    if (!businessName) {
      return NextResponse.json(
        { success: false, error: 'Business name is required' },
        { status: 400 }
      )
    }

    let billingAccount = billingAccounts.get(businessName)
    
    if (!billingAccount) {
      return NextResponse.json(
        { success: false, error: 'Billing account not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'add_booking_fee':
        // Add a booking fee to current bill
        const bookingFee = data.amount || 50
        billingAccount.currentBill.bookingFees += bookingFee
        billingAccount.currentBill.total = billingAccount.currentBill.baseFee + billingAccount.currentBill.bookingFees
        
        // Add to billing history
        billingAccount.billingHistory.unshift({
          id: `booking_${Date.now()}`,
          type: 'booking_fee',
          amount: bookingFee,
          description: `Booking fee for ${data.description || 'appointment'}`,
          date: new Date().toISOString()
        })
        break

      case 'update_payment_method':
        // Update payment method
        billingAccount.paymentMethod = {
          ...billingAccount.paymentMethod,
          ...data
        }
        break

      case 'process_payment':
        // Process monthly payment
        const paymentAmount = billingAccount.currentBill.total
        const payment = {
          id: `payment_${Date.now()}`,
          amount: paymentAmount,
          date: new Date().toISOString(),
          status: 'completed',
          description: 'Monthly subscription payment'
        }
        
        billingAccount.billingHistory.unshift(payment)
        
        // Reset current bill for next month
        billingAccount.currentBill = {
          baseFee: 200,
          bookingFees: 0,
          total: 200,
          nextBillingDate: getNextBillingDate()
        }
        break

      case 'cancel_subscription':
        billingAccount.subscription.status = 'cancelled'
        billingAccount.subscription.cancelledAt = new Date().toISOString()
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        )
    }

    billingAccount.updatedAt = new Date().toISOString()
    billingAccounts.set(businessName, billingAccount)

    return NextResponse.json({
      success: true,
      data: billingAccount,
      message: 'Billing account updated successfully'
    })

  } catch (error) {
    console.error('Billing update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update billing account' },
      { status: 500 }
    )
  }
}

function getNextBillingDate(): string {
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  nextMonth.setDate(1) // First day of next month
  return nextMonth.toISOString()
}

