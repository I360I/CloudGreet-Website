#!/usr/bin/env node

/**
 * Complete End-to-End Call Flow Test
 * 
 * Tests the entire call flow from customer call → Telnyx → Retell AI → appointment booking
 * 
 * Required env:
 *  - TELNYX_API_KEY
 *  - TELNYX_CONNECTION_ID (or TELNYX_PHONE_NUMBER)
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - NEXT_PUBLIC_APP_URL
 * 
 * Optional env:
 *  - TEST_BUSINESS_ID (business ID to test with)
 *  - TEST_CALLER_PHONE (phone number to call from)
 */

const { createClient } = require('@supabase/supabase-js')

const telnyxApiKey = process.env.TELNYX_API_KEY
const telnyxConnectionId = process.env.TELNYX_CONNECTION_ID
const telnyxPhoneNumber = process.env.TELNYX_PHONE_NUMBER
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
const testBusinessId = process.env.TEST_BUSINESS_ID
const testCallerPhone = process.env.TEST_CALLER_PHONE

if (!telnyxApiKey) {
  console.error('✖ Missing TELNYX_API_KEY')
  process.exit(2)
}

if (!telnyxConnectionId && !telnyxPhoneNumber) {
  console.error('✖ Missing TELNYX_CONNECTION_ID or TELNYX_PHONE_NUMBER')
  process.exit(2)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('✖ Missing Supabase credentials')
  process.exit(2)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

/**
 * Normalize phone number
 */
function normalizePhone(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

/**
 * Get test business
 */
async function getTestBusiness() {
  if (testBusinessId) {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, business_name, phone_number, phone, retell_agent_id')
      .eq('id', testBusinessId)
      .single()

    if (!error && data) {
      return data
    }
  }

  // Find any business with Retell agent and phone
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, business_name, phone_number, phone, retell_agent_id')
    .not('retell_agent_id', 'is', null)
    .not('phone_number', 'is', null)
    .limit(1)

  if (!businesses || businesses.length === 0) {
    console.error('✖ No businesses found with Retell agents and phone numbers')
    process.exit(2)
  }

  return businesses[0]
}

/**
 * Step 1: Place test call
 */
async function placeTestCall(business) {
  console.log('📞 Step 1: Placing test call...')
  
  const targetPhone = normalizePhone(business.phone_number || business.phone)
  if (!targetPhone) {
    throw new Error('Business has no valid phone number')
  }

  const fromNumber = telnyxPhoneNumber || targetPhone
  const callPayload = {
    to: targetPhone,
    from: fromNumber,
    webhook_url: `${appUrl}/api/telnyx/voice-webhook`,
    webhook_url_method: 'POST'
  }

  if (telnyxConnectionId) {
    callPayload.connection_id = telnyxConnectionId
  }

  const response = await fetch('https://api.telnyx.com/v2/calls', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${telnyxApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(callPayload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to place call: ${response.status} - ${errorText}`)
  }

  const callData = await response.json()
  const callControlId = callData.data?.call_control_id

  if (!callControlId) {
    throw new Error('No call_control_id in Telnyx response')
  }

  console.log(`   ✅ Call placed: ${callControlId}`)
  console.log(`   Target: ${targetPhone}`)
  console.log(`   Business: ${business.business_name}`)
  console.log(`   Retell Agent: ${business.retell_agent_id}`)
  console.log('')

  return callControlId
}

/**
 * Step 2: Wait for webhook processing
 */
async function waitForWebhook(callControlId, maxWaitSeconds = 10) {
  console.log('⏳ Step 2: Waiting for webhook processing...')
  
  for (let i = 0; i < maxWaitSeconds; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const { data: calls } = await supabase
      .from('calls')
      .select('id, call_id, call_status, business_id, duration')
      .eq('call_id', callControlId)
      .limit(1)

    if (calls && calls.length > 0) {
      const call = calls[0]
      console.log(`   ✅ Call record found in database`)
      console.log(`   Status: ${call.call_status}`)
      console.log(`   Business ID: ${call.business_id || 'Not set'}`)
      console.log('')
      return call
    }
  }

  console.log('   ⚠ Call record not found yet (may still be processing)')
  console.log('')
  return null
}

/**
 * Step 3: Verify call was bridged to Retell
 */
async function verifyRetellBridge(callControlId) {
  console.log('🔍 Step 3: Verifying Retell bridge...')
  console.log('   (Check application logs for "Call successfully bridged to Retell AI")')
  console.log('   (Check Retell dashboard for call activity)')
  console.log('')
  
  // Note: Actual verification requires checking Retell API or logs
  // This is a placeholder that documents what to check
  return true
}

/**
 * Step 4: Check for appointment booking (if applicable)
 */
async function checkAppointments(businessId, callId) {
  console.log('📅 Step 4: Checking for appointments...')
  
  if (!businessId) {
    console.log('   ⚠ No business ID available, skipping appointment check')
    console.log('')
    return null
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, customer_name, customer_phone, service_type, scheduled_date, status')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (appointments && appointments.length > 0) {
    console.log(`   ✅ Found ${appointments.length} recent appointment(s)`)
    appointments.forEach((apt, idx) => {
      console.log(`   ${idx + 1}. ${apt.customer_name} - ${apt.service_type || 'N/A'}`)
      console.log(`      Scheduled: ${apt.scheduled_date || 'N/A'}`)
      console.log(`      Status: ${apt.status || 'N/A'}`)
    })
  } else {
    console.log('   ℹ No appointments found (this is normal if call didn\'t result in booking)')
  }
  console.log('')
  
  return appointments
}

/**
 * Step 5: Verify SMS confirmation (if applicable)
 */
async function checkSMSLogs(businessId, customerPhone) {
  console.log('📱 Step 5: Checking SMS logs...')
  
  if (!businessId || !customerPhone) {
    console.log('   ⚠ Missing business ID or customer phone, skipping SMS check')
    console.log('')
    return null
  }

  const normalizedPhone = normalizePhone(customerPhone)
  const { data: smsLogs } = await supabase
    .from('sms_logs')
    .select('id, to_number, message, status, created_at')
    .eq('business_id', businessId)
    .eq('to_number', normalizedPhone)
    .order('created_at', { ascending: false })
    .limit(5)

  if (smsLogs && smsLogs.length > 0) {
    console.log(`   ✅ Found ${smsLogs.length} SMS message(s)`)
    smsLogs.forEach((sms, idx) => {
      console.log(`   ${idx + 1}. To: ${sms.to_number}`)
      console.log(`      Status: ${sms.status || 'N/A'}`)
      console.log(`      Message: ${sms.message?.substring(0, 50) || 'N/A'}...`)
    })
  } else {
    console.log('   ℹ No SMS logs found (this is normal if SMS wasn\'t sent)')
  }
  console.log('')
  
  return smsLogs
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Complete End-to-End Call Flow Test')
  console.log('='.repeat(50))
  console.log('')

  try {
    // Get test business
    console.log('1️⃣ Finding test business...')
    const business = await getTestBusiness()
    console.log(`   ✅ Business: ${business.business_name}`)
    console.log(`   Phone: ${business.phone_number || business.phone}`)
    console.log(`   Retell Agent: ${business.retell_agent_id}`)
    console.log('')

    // Place test call
    const callControlId = await placeTestCall(business)

    // Wait for webhook
    const callRecord = await waitForWebhook(callControlId)

    // Verify Retell bridge
    await verifyRetellBridge(callControlId)

    // Check appointments
    if (callRecord?.business_id) {
      await checkAppointments(callRecord.business_id, callControlId)
    }

    // Check SMS logs
    if (callRecord?.business_id && testCallerPhone) {
      await checkSMSLogs(callRecord.business_id, testCallerPhone)
    }

    console.log('='.repeat(50))
    console.log('✅ Test completed!')
    console.log('')
    console.log('📋 Summary:')
    console.log(`   Call Control ID: ${callControlId}`)
    console.log(`   Call Status: ${callRecord?.call_status || 'Unknown'}`)
    console.log(`   Business ID: ${callRecord?.business_id || 'Not set'}`)
    console.log('')
    console.log('📝 Next Steps:')
    console.log('   1. Check application logs for SIP format success')
    console.log('   2. Verify call connected to Retell AI (check Retell dashboard)')
    console.log('   3. Verify AI conversation happened (check Retell call logs)')
    console.log('   4. Check for any errors in webhook processing')
    console.log('')

  } catch (error) {
    console.error('✖ Test failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

main()

