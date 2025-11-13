#!/usr/bin/env node

/**
 * Synthetic monitor for the voice AI receptionist.
 * Places a short Retell test call and verifies greeting + escalation behaviour.
 *
 * Required env:
 *  - RETELL_API_KEY
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 * Optional env:
 *  - SYNTHETIC_VOICE_AGENT_ID (if not provided, will fetch first available agent from database)
 *  - SYNTHETIC_MONITOR_BASE_URL (for logging)
 */

const { createClient } = require('@supabase/supabase-js')

const retellKey = process.env.RETELL_API_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!retellKey) {
  console.error('✖ Missing RETELL_API_KEY')
  process.exit(2)
}

async function getAgentId() {
  // If explicitly provided, use it
  if (process.env.SYNTHETIC_VOICE_AGENT_ID) {
    return process.env.SYNTHETIC_VOICE_AGENT_ID
  }

  // Otherwise, fetch first available agent from database
  if (!supabaseUrl || !supabaseKey) {
    console.error('✖ Missing Supabase credentials. Either set SYNTHETIC_VOICE_AGENT_ID or provide NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(2)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select('retell_agent_id')
    .not('retell_agent_id', 'is', null)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error || !agent?.retell_agent_id) {
    console.error('✖ Could not find active Retell agent in database', { error: error?.message })
    process.exit(2)
  }

  return agent.retell_agent_id
}

async function main() {
  const agentId = await getAgentId()
  
  const response = await fetch('https://api.retellai.com/v2/tests/call', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${retellKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      agent_id: agentId,
      simulate_user: {
        script: [
          'Hi, I wanted to ask about pricing.',
          'Can you connect me to a teammate?'
        ],
        silence_timeout_seconds: 5
      }
    })
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok || !body?.result?.transcript) {
    console.error('✖ Voice agent monitor failed', {
      status: response.status,
      body
    })
    process.exit(1)
  }

  const transcript = body.result.transcript.toLowerCase()
  if (!transcript.includes('cloudgreet') || !transcript.includes('connect you')) {
    console.error('✖ Voice agent greeting/escalation not detected', { transcript: body.result.transcript })
    process.exit(1)
  }

  console.log('✔ Voice agent synthetic call succeeded', {
    agentId,
    transcriptSnippet: body.result.transcript.slice(0, 120),
    timestamp: new Date().toISOString()
  })
}

main().catch((error) => {
  console.error('✖ Voice monitor encountered an error', {
    message: error instanceof Error ? error.message : String(error)
  })
  process.exit(1)
})


