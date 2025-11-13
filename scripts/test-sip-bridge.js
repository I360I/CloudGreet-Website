#!/usr/bin/env node

/**
 * SIP Bridge Test Script
 * 
 * Tests the Telnyx → Retell AI SIP bridge by placing a real call and monitoring
 * which SIP format succeeds. This is critical for verifying call routing works.
 * 
 * Required env:
 *  - TELNYX_API_KEY
 *  - TELNYX_CONNECTION_ID (or TELNYX_PHONE_NUMBER)
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - NEXT_PUBLIC_APP_URL (for webhook URL)
 * 
 * Optional env:
 *  - TEST_BUSINESS_PHONE (phone number to call - must be assigned to a business with Retell agent)
 *  - TEST_CALLER_PHONE (your phone number to receive the call)
 */

const { createClient } = require('@supabase/supabase-js')

const telnyxApiKey = process.env.TELNYX_API_KEY
const telnyxConnectionId = process.env.TELNYX_CONNECTION_ID
const telnyxPhoneNumber = process.env.TELNYX_PHONE_NUMBER
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
const testBusinessPhone = process.env.TEST_BUSINESS_PHONE
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
  console.error('✖ Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(2)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

/**
 * Normalize phone number for consistent lookup
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
 * Get test business with Retell agent
 */
async function getTestBusiness() {
  if (testBusinessPhone) {
    const normalized = normalizePhone(testBusinessPhone)
    const { data: business } = await supabase
      .from('businesses')
      .select('id, business_name, phone_number, phone, retell_agent_id')
      .or(`phone_number.eq.${normalized},phone.eq.${normalized}`)
      .single()
    
    if (business && business.retell_agent_id) {
      return business
    }
    console.warn(`⚠ Business with phone ${testBusinessPhone} not found or missing Retell agent`)
  }

  // Find any business with Retell agent
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
 * Place test call via Telnyx
 */
async function placeTestCall(business, callerPhone) {
  const fromNumber = telnyxPhoneNumber || business.phone_number || business.phone
  const toNumber = normalizePhone(business.phone_number || business.phone)
  
  if (!toNumber) {
    console.error('✖ Cannot determine business phone number')
    process.exit(2)
  }

  console.log('📞 Placing test call...')
  console.log(`   From: ${fromNumber}`)
  console.log(`   To: ${toNumber} (Business: ${business.business_name})`)
  console.log(`   Expected Retell Agent: ${business.retell_agent_id}`)

  const callPayload = {
    to: toNumber,
    from: fromNumber,
    webhook_url: `${appUrl}/api/telnyx/voice-webhook`,
    webhook_url_method: 'POST'
  }

  if (telnyxConnectionId) {
    callPayload.connection_id = telnyxConnectionId
  }

  try {
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
      console.error('✖ Failed to place call via Telnyx', {
        status: response.status,
        error: errorText
      })
      process.exit(1)
    }

    const callData = await response.json()
    const callControlId = callData.data?.call_control_id

    if (!callControlId) {
      console.error('✖ No call_control_id in Telnyx response', callData)
      process.exit(1)
    }

    console.log('✅ Call initiated successfully')
    console.log(`   Call Control ID: ${callControlId}`)
    console.log('')
    console.log('⏳ Waiting for webhook events...')
    console.log('   (This will monitor logs to see which SIP format succeeds)')
    console.log('   (Call should connect to Retell AI within 5-10 seconds)')
    console.log('')

    return callControlId
  } catch (error) {
    console.error('✖ Error placing call', {
      error: error instanceof Error ? error.message : String(error)
    })
    process.exit(1)
  }
}

/**
 * Monitor webhook logs for SIP format success
 */
async function monitorSIPFormat(callControlId, business) {
  console.log('🔍 Monitoring SIP transfer attempts...')
  console.log('')
  
  // Wait a bit for webhook to process
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Check recent logs in compliance_events or check call status
  const { data: recentCalls } = await supabase
    .from('calls')
    .select('id, call_id, call_status, duration, created_at')
    .eq('call_id', callControlId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (recentCalls && recentCalls.length > 0) {
    const call = recentCalls[0]
    console.log('📊 Call Status:', call.call_status)
    console.log('   Duration:', call.duration || 'N/A', 'seconds')
    console.log('')
  } else {
    console.log('⚠ Call record not found in database yet')
    console.log('   (This may be normal if webhook is still processing)')
    console.log('')
  }

  // Note: Actual SIP format logging happens in voice-webhook route
  // This script verifies the call was placed and can be checked manually
  console.log('📝 To see which SIP format succeeded:')
  console.log('   1. Check application logs for "Call successfully bridged to Retell AI"')
  console.log('   2. Look for "sipFormat" in the log entry')
  console.log('   3. The successful format will be logged there')
  console.log('')
  console.log('💡 Tip: Check Vercel logs or your logging service for detailed SIP transfer logs')
}

/**
 * Verify Retell agent is active
 */
async function verifyRetellAgent(business) {
  if (!business.retell_agent_id) {
    console.error('✖ Business has no Retell agent ID')
    return false
  }

  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    console.warn('⚠ RETELL_API_KEY not set - cannot verify agent directly')
    return true // Continue anyway
  }

  try {
    const response = await fetch(`https://api.retellai.com/v2/get-agent/${business.retell_agent_id}`, {
      headers: {
        'Authorization': `Bearer ${retellApiKey}`
      }
    })

    if (response.ok) {
      const agent = await response.json()
      console.log('✅ Retell agent verified:', agent.agent_id)
      return true
    } else {
      console.warn('⚠ Could not verify Retell agent (may still work)')
      return true // Continue anyway
    }
  } catch (error) {
    console.warn('⚠ Error verifying Retell agent:', error.message)
    return true // Continue anyway
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 SIP Bridge Test Script')
  console.log('='.repeat(50))
  console.log('')

  // Get test business
  console.log('1️⃣ Finding test business with Retell agent...')
  const business = await getTestBusiness()
  console.log(`   ✅ Found: ${business.business_name}`)
  console.log(`   Phone: ${business.phone_number || business.phone}`)
  console.log(`   Retell Agent: ${business.retell_agent_id}`)
  console.log('')

  // Verify Retell agent
  console.log('2️⃣ Verifying Retell agent...')
  await verifyRetellAgent(business)
  console.log('')

  // Place test call
  console.log('3️⃣ Placing test call...')
  const callControlId = await placeTestCall(business, testCallerPhone)

  // Monitor SIP format
  console.log('4️⃣ Monitoring SIP transfer...')
  await monitorSIPFormat(callControlId, business)

  console.log('')
  console.log('='.repeat(50))
  console.log('✅ Test call completed!')
  console.log('')
  console.log('📋 Next Steps:')
  console.log('   1. Check application logs for SIP format success')
  console.log('   2. Verify call connected to Retell AI (check Retell dashboard)')
  console.log('   3. If call failed, check logs for SIP transfer errors')
  console.log('   4. Update SIP format in voice-webhook route if needed')
  console.log('')
}

main().catch((error) => {
  console.error('✖ Test failed', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  })
  process.exit(1)
})

