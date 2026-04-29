#!/usr/bin/env node

// Script to replace SELECT * queries with specific columns for better performance
const fs = require('fs')
const path = require('path')

// Define specific column mappings for each table
const TABLE_COLUMNS = {
  'businesses': 'id, business_name, phone_number, email, address, website, industry, timezone, business_hours, ai_agent_id, retell_agent_id, stripe_customer_id, subscription_status, created_at, updated_at',
  'enriched_leads': 'id, owner_email, owner_name, owner_phone, business_name, business_phone, business_address, business_website, industry, lead_score, notes, created_at, updated_at',
  'calls': 'id, business_id, from_number, to_number, status, duration, recording_url, transcript, created_at, updated_at',
  'appointments': 'id, business_id, customer_name, customer_phone, customer_email, service_type, scheduled_date, status, notes, created_at, updated_at',
  'leads': 'id, business_id, name, email, phone, company, industry, status, source, created_at, updated_at',
  'sms_messages': 'id, business_id, to_number, from_number, message, status, sent_at, created_at',
  'email_logs': 'id, business_id, to_email, from_email, subject, status, sent_at, created_at',
  'ai_agents': 'id, business_id, name, greeting_message, personality, voice_settings, created_at, updated_at',
  'automation_executions': 'id, business_id, type, status, executed_at, created_at',
  'users': 'id, email, role, created_at, updated_at',
  'stripe_customers': 'id, business_id, stripe_customer_id, subscription_status, created_at, updated_at',
  'notifications': 'id, business_id, type, message, status, sent_at, created_at',
  'campaigns': 'id, business_id, name, type, status, created_at, updated_at',
  'email_templates': 'id, business_id, name, subject, body, created_at, updated_at',
  'phone_numbers': 'id, business_id, number, type, status, created_at',
  'toll_free_numbers': 'id, business_id, number, status, created_at',
  'conversations': 'id, business_id, type, status, created_at, updated_at',
  'conversation_messages': 'id, conversation_id, role, content, created_at',
  'market_intelligence': 'id, business_id, type, data, created_at',
  'lead_enrichment': 'id, business_id, lead_id, status, data, created_at',
  'bulk_enrichment': 'id, business_id, status, total_leads, processed_leads, created_at',
  'ab_testing': 'id, business_id, name, status, variants, created_at',
  'performance_cache': 'id, business_id, key, value, expires_at, created_at',
  'security_audits': 'id, business_id, type, status, findings, created_at',
  'system_health': 'id, metric, value, timestamp, created_at'
}

function fixSelectStarQueries(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    let newContent = content
    
    // Find all SELECT * queries
    const selectStarRegex = /\.select\('\*'\)/g
    const matches = [...content.matchAll(selectStarRegex)]
    
    if (matches.length === 0) {
      return // No SELECT * queries in this file
    }
    
    console.log(`🔧 ${filePath} - Found ${matches.length} SELECT * queries`)
    
    // Replace each SELECT * with specific columns
    newContent = newContent.replace(selectStarRegex, (match, offset) => {
      // Get the context around this match to determine the table
      const beforeMatch = content.substring(Math.max(0, offset - 200), offset)
      const afterMatch = content.substring(offset, Math.min(content.length, offset + 50))
      
      // Find the table name by looking for .from('table_name')
      const fromMatch = beforeMatch.match(/\.from\(['"`]([^'"`]+)['"`]\)/)
      if (!fromMatch) {
        console.log(`   ⚠️  Could not determine table for SELECT * at offset ${offset}`)
        return match // Keep original if we can't determine table
      }
      
      const tableName = fromMatch[1]
      const columns = TABLE_COLUMNS[tableName]
      
      if (!columns) {
        console.log(`   ⚠️  No column mapping defined for table: ${tableName}`)
        return match // Keep original if no mapping defined
      }
      
      console.log(`   ✅ Replacing SELECT * for table: ${tableName}`)
      return `.select('${columns}')`
    })
    
    // Write back to file if changes were made
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent)
      console.log(`✅ ${filePath} - Fixed SELECT * queries`)
    }
    
  } catch (error) {
    console.error(`❌ ${filePath} - Error: ${error.message}`)
  }
}

function scanApiRoutes() {
  const apiDir = 'app/api'
  const routes = []
  
  function scanDir(dir) {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        scanDir(fullPath)
      } else if (item === 'route.ts') {
        routes.push(fullPath)
      }
    }
  }
  
  scanDir(apiDir)
  return routes
}

console.log('🔧 Fixing SELECT * queries for better performance...\n')

const routes = scanApiRoutes()
let totalFixed = 0

for (const route of routes) {
  const beforeContent = fs.readFileSync(route, 'utf8')
  fixSelectStarQueries(route)
  const afterContent = fs.readFileSync(route, 'utf8')
  
  if (beforeContent !== afterContent) {
    totalFixed++
  }
}

console.log(`\n✅ Fixed SELECT * queries in ${totalFixed} files`)
console.log('\n📋 Performance improvements:')
console.log('- Reduced data transfer from database')
console.log('- Faster query execution')
console.log('- Lower memory usage')
console.log('- Better network performance')
console.log('\n⚠️  Note: Some queries may need manual review for specific use cases')
