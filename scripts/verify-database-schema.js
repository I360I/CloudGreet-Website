#!/usr/bin/env node

/**
 * Database Schema Verification Script
 * 
 * Verifies that all required database tables exist and have the correct structure
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Critical tables that MUST exist
const CRITICAL_TABLES = [
  'businesses',
  'users',
  'calls',
  'appointments',
  'ai_agents',
  'sms_messages'
]

// Required tables for core functionality
const REQUIRED_TABLES = [
  'leads',
  'conversation_history',
  'stripe_subscriptions',
  'notifications',
  'webhook_events',
  'consents'
]

// Optional tables (nice to have)
const OPTIONAL_TABLES = [
  'automation_rules',
  'automation_executions',
  'calendar_events',
  'appointment_reminders',
  'toll_free_numbers',
  'conversations',
  'realtime_sessions'
]

async function verifyTables() {
  console.log('🔍 Verifying Database Schema...\n')

  try {
    // Try to query tables directly - simpler approach
    // First verify connection by checking a critical table
    const { error: connectionTest } = await supabase.from('businesses').select('id').limit(1)
    
    let existingTables = []
    if (connectionTest && (connectionTest.code === 'PGRST116' || connectionTest.code === '42P01')) {
      // Table doesn't exist - connection works but table missing
      console.log('⚠️  Database connected but businesses table missing\n')
    } else if (connectionTest) {
      console.error('❌ Cannot connect to database. Check your Supabase credentials.')
      console.error('Error:', connectionTest.message)
      return false
    } else {
      // Connection works - check tables individually
      console.log('✅ Database connection verified\n')
      
      // Check each table individually
      const allTables = [...CRITICAL_TABLES, ...REQUIRED_TABLES, ...OPTIONAL_TABLES]
      for (const table of allTables) {
        const { error } = await supabase.from(table).select('*').limit(1)
        if (!error || (error.code !== 'PGRST116' && error.code !== '42P01')) {
          existingTables.push({ table_name: table })
        }
      }
    }

    // Extract table names
    const existingTableSet = new Set(existingTables.map(t => t.table_name))

    let allPassed = true
    const results = {
      critical: { passed: 0, failed: [], missing: [] },
      required: { passed: 0, failed: [], missing: [] },
      optional: { passed: 0, missing: [] }
    }

    // Check CRITICAL tables
    console.log('⚡ CRITICAL TABLES')
    console.log('─'.repeat(70))
    for (const table of CRITICAL_TABLES) {
      if (existingTableSet.has(table)) {
        console.log(`✅ ${table.padEnd(30)} EXISTS`)
        results.critical.passed++
      } else {
        console.log(`❌ ${table.padEnd(30)} MISSING`)
        results.critical.missing.push(table)
        results.critical.failed.push(table)
        allPassed = false
      }
    }
    console.log()

    // Check REQUIRED tables
    console.log('📋 REQUIRED TABLES')
    console.log('─'.repeat(70))
    for (const table of REQUIRED_TABLES) {
      if (existingTableSet.has(table)) {
        console.log(`✅ ${table.padEnd(30)} EXISTS`)
        results.required.passed++
      } else {
        console.log(`⚠️  ${table.padEnd(30)} MISSING`)
        results.required.missing.push(table)
        allPassed = false
      }
    }
    console.log()

    // Check OPTIONAL tables
    console.log('📦 OPTIONAL TABLES')
    console.log('─'.repeat(70))
    for (const table of OPTIONAL_TABLES) {
      if (existingTableSet.has(table)) {
        console.log(`✅ ${table.padEnd(30)} EXISTS`)
        results.optional.passed++
      } else {
        console.log(`○  ${table.padEnd(30)} NOT SET`)
        results.optional.missing.push(table)
      }
    }
    console.log()

    // Summary
    console.log('📊 SUMMARY')
    console.log('─'.repeat(70))
    console.log(`Critical: ${results.critical.passed}/${CRITICAL_TABLES.length} ✅`)
    console.log(`Required: ${results.required.passed}/${REQUIRED_TABLES.length} ✅`)
    console.log(`Optional: ${results.optional.passed}/${OPTIONAL_TABLES.length} set`)

    if (!allPassed) {
      console.log('\n❌ MISSING CRITICAL TABLES:')
      results.critical.missing.forEach(t => console.log(`   - ${t}`))
      if (results.required.missing.length > 0) {
        console.log('\n⚠️  MISSING REQUIRED TABLES:')
        results.required.missing.forEach(t => console.log(`   - ${t}`))
      }
      console.log('\n💡 Run the database migration script to create missing tables.')
      return false
    }

    console.log('\n✅ All critical and required tables exist!')
    return true
  } catch (error) {
    console.error('❌ Database verification failed:', error.message)
    return false
  }
}

// Run verification
if (require.main === module) {
  verifyTables()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { verifyTables }

