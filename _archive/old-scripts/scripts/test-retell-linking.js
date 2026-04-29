#!/usr/bin/env node

/**
 * Retell API Linking Test Script
 * 
 * Tests if Retell API supports programmatic phone number linking.
 * If API doesn't work, documents manual linking process.
 * 
 * Required env:
 *  - RETELL_API_KEY
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 * 
 * Optional env:
 *  - TEST_AGENT_ID (Retell agent ID to test with)
 *  - TEST_PHONE_NUMBER (Phone number to link)
 */

const { createClient } = require('@supabase/supabase-js')

const retellApiKey = process.env.RETELL_API_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const testAgentId = process.env.TEST_AGENT_ID
const testPhoneNumber = process.env.TEST_PHONE_NUMBER

if (!retellApiKey) {
  console.error('✖ Missing RETELL_API_KEY')
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
 * Get test agent and phone number
 */
async function getTestData() {
  let agentId = testAgentId
  let phoneNumber = testPhoneNumber ? normalizePhone(testPhoneNumber) : null

  if (!agentId || !phoneNumber) {
    // Get from database
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('retell_agent_id, phone_number, business_id')
      .not('retell_agent_id', 'is', null)
      .not('phone_number', 'is', null)
      .limit(1)
      .single()

    if (!agent) {
      console.error('✖ No agents found with Retell ID and phone number')
      process.exit(2)
    }

    agentId = agentId || agent.retell_agent_id
    phoneNumber = phoneNumber || normalizePhone(agent.phone_number)
  }

  return { agentId, phoneNumber }
}

/**
 * Test Retell API linking endpoint
 */
async function testRetellLinkingAPI(agentId, phoneNumber) {
  console.log('🧪 Testing Retell API phone linking endpoint...')
  console.log(`   Agent ID: ${agentId}`)
  console.log(`   Phone: ${phoneNumber}`)
  console.log('')

  // Try the API endpoint
  const endpoints = [
    'https://api.retellai.com/v2/link-phone-number',
    'https://api.retellai.com/v2/agents/link-phone',
    'https://api.retellai.com/v2/phone-numbers/link'
  ]

  for (const endpoint of endpoints) {
    console.log(`📡 Trying endpoint: ${endpoint}`)
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${retellApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: agentId,
          phone_number: phoneNumber
        })
      })

      const status = response.status
      const body = await response.json().catch(() => ({}))

      if (status === 200 || status === 201) {
        console.log('✅ API endpoint exists and accepts requests!')
        console.log(`   Response:`, JSON.stringify(body, null, 2))
        return { success: true, endpoint, response: body }
      } else if (status === 404) {
        console.log(`   ⚠ Endpoint not found (404)`)
      } else if (status === 401 || status === 403) {
        console.log(`   ⚠ Authentication issue (${status}) - endpoint may exist`)
        console.log(`   Response:`, JSON.stringify(body, null, 2))
      } else {
        console.log(`   ⚠ Unexpected status: ${status}`)
        console.log(`   Response:`, JSON.stringify(body, null, 2))
      }
    } catch (error) {
      console.log(`   ✖ Error: ${error.message}`)
    }
    
    console.log('')
  }

  return { success: false }
}

/**
 * Test alternative: Check if agent can be updated with phone
 */
async function testAgentUpdate(agentId, phoneNumber) {
  console.log('🧪 Testing agent update with phone number...')
  
  try {
    const response = await fetch(`https://api.retellai.com/v2/get-agent/${agentId}`, {
      headers: {
        'Authorization': `Bearer ${retellApiKey}`
      }
    })

    if (!response.ok) {
      console.log('   ⚠ Could not fetch agent details')
      return false
    }

    const agent = await response.json()
    console.log('   Agent details retrieved')
    console.log(`   Current phone: ${agent.phone_number || 'Not set'}`)
    
    // Try updating agent with phone number
    const updateResponse = await fetch(`https://api.retellai.com/v2/update-agent/${agentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone_number: phoneNumber
      })
    })

    if (updateResponse.ok) {
      console.log('✅ Agent update endpoint accepts phone number!')
      return true
    } else {
      const errorBody = await updateResponse.json().catch(() => ({}))
      console.log(`   ⚠ Update failed: ${updateResponse.status}`)
      console.log(`   Response:`, JSON.stringify(errorBody, null, 2))
      return false
    }
  } catch (error) {
    console.log(`   ✖ Error: ${error.message}`)
    return false
  }
}

/**
 * Document manual linking process
 */
function documentManualLinking(agentId, phoneNumber) {
  console.log('')
  console.log('='.repeat(50))
  console.log('📝 MANUAL LINKING PROCESS')
  console.log('='.repeat(50))
  console.log('')
  console.log('Since API linking is not available, use this manual process:')
  console.log('')
  console.log('1. Log into Retell Dashboard: https://dashboard.retellai.com')
  console.log('2. Navigate to Agents section')
  console.log(`3. Find agent ID: ${agentId}`)
  console.log('4. Click on the agent to edit')
  console.log('5. Go to Phone Numbers section')
  console.log(`6. Add phone number: ${phoneNumber}`)
  console.log('7. Save changes')
  console.log('')
  console.log('Alternative:')
  console.log('1. Log into Retell Dashboard')
  console.log('2. Navigate to Phone Numbers section')
  console.log(`3. Find or add phone number: ${phoneNumber}`)
  console.log(`4. Link it to agent: ${agentId}`)
  console.log('')
  console.log('After manual linking:')
  console.log('1. Update ai_agents table with phone_number')
  console.log('2. Verify phone number is stored correctly')
  console.log('3. Test call routing to confirm it works')
  console.log('')
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Retell API Linking Test')
  console.log('='.repeat(50))
  console.log('')

  // Get test data
  console.log('1️⃣ Getting test agent and phone number...')
  const { agentId, phoneNumber } = await getTestData()
  console.log(`   ✅ Agent ID: ${agentId}`)
  console.log(`   ✅ Phone: ${phoneNumber}`)
  console.log('')

  // Test API linking
  console.log('2️⃣ Testing Retell API linking endpoints...')
  const apiResult = await testRetellLinkingAPI(agentId, phoneNumber)

  if (!apiResult.success) {
    // Try agent update
    console.log('3️⃣ Testing agent update method...')
    const updateResult = await testAgentUpdate(agentId, phoneNumber)

    if (!updateResult) {
      // Document manual process
      documentManualLinking(agentId, phoneNumber)
      
      console.log('')
      console.log('='.repeat(50))
      console.log('📋 CONCLUSION')
      console.log('='.repeat(50))
      console.log('')
      console.log('❌ Retell API does not support programmatic phone linking')
      console.log('✅ Manual linking process documented above')
      console.log('✅ Admin UI helper should be created for manual linking')
      console.log('')
    } else {
      console.log('')
      console.log('✅ Agent update method works!')
      console.log('   Use update-agent endpoint with phone_number field')
      console.log('')
    }
  } else {
    console.log('')
    console.log('✅ Retell API supports programmatic linking!')
    console.log(`   Use endpoint: ${apiResult.endpoint}`)
    console.log('')
  }
}

main().catch((error) => {
  console.error('✖ Test failed', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  })
  process.exit(1)
})

