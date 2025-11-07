#!/usr/bin/env node

// Pricing Verification Script
const verifyPricing = async () => {
  console.log('💰 Verifying Pricing Configuration...\n')

  const pricingChecks = [
    {
      name: 'Monthly Subscription Fee',
      expected: 20000, // $200 in cents
      description: 'Should be $200/month'
    },
    {
      name: 'Per-Booking Fee',
      expected: 5000, // $50 in cents
      description: 'Should be $50 per completed appointment'
    }
  ]

  console.log('📋 Pricing Configuration Check:')
  console.log('─'.repeat(50))

  // Check environment variables
  const perBookingFee = process.env.PER_BOOKING_FEE
  if (perBookingFee) {
    const fee = parseInt(perBookingFee)
    if (fee === 5000) {
      console.log(`PER_BOOKING_FEE: ✅ $${fee/100} (correct)`)
    } else {
      console.log(`PER_BOOKING_FEE: ❌ $${fee/100} (should be $50)`)
    }
  } else {
    console.log('PER_BOOKING_FEE: ⚠️  Not set (will use default $50)')
  }

  console.log('\n📋 Files to Check:')
  console.log('─'.repeat(50))

  // Check specific files mentioned in the plan
  const filesToCheck = [
    'app/api/billing/per-booking/route.ts',
    'app/api/appointments/ai-book/route.ts',
    'app/api/appointments/complete/route.ts',
    'app/api/pricing/plans/route.ts'
  ]

  for (const file of filesToCheck) {
    console.log(`${file}: Check manually for pricing constants`)
  }

  console.log('\n📋 Pricing Display Pages:')
  console.log('─'.repeat(50))

  const pricingPages = [
    'Landing page',
    'Pricing page', 
    'Dashboard',
    'Billing page',
    'Invoices'
  ]

  for (const page of pricingPages) {
    console.log(`${page}: Verify shows $200/month + $50/booking`)
  }

  console.log('\n✅ Pricing Verification Complete!')
  console.log('\n📋 Manual Verification Needed:')
  console.log('1. Check all pricing displays show correct amounts')
  console.log('2. Verify billing logic charges $50 only on completion')
  console.log('3. Test subscription creation with $200/month')
  console.log('4. Test appointment completion with $50 charge')
  console.log('5. Verify Stripe dashboard shows correct amounts')

  console.log('\n🎯 Expected Pricing:')
  console.log('- Monthly subscription: $200/month')
  console.log('- Per-booking fee: $50 per completed appointment')
  console.log('- Setup fee: $0 (for now)')
  console.log('- Charged on completion, not booking')
}

verifyPricing().catch(console.error)

