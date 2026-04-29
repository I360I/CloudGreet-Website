#!/usr/bin/env node

// Production Database Migration Script
const runProductionMigration = async () => {
  console.log('🚀 Running Production Database Migration...\n')

  const migrationSQL = `
-- Add webhook idempotency table to prevent duplicate processing
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);
`

  console.log('📋 Migration SQL:')
  console.log('─'.repeat(50))
  console.log(migrationSQL)
  console.log('─'.repeat(50))

  console.log('\n🔧 Instructions to run this migration:')
  console.log('1. Copy the SQL above')
  console.log('2. Go to your Supabase dashboard')
  console.log('3. Navigate to SQL Editor')
  console.log('4. Paste and execute the SQL')
  console.log('5. Verify the webhook_events table was created')

  console.log('\n✅ Migration script ready!')
  console.log('\n📋 Next steps:')
  console.log('- Run this migration in Supabase dashboard')
  console.log('- Verify table creation')
  console.log('- Test webhook idempotency')
}

runProductionMigration().catch(console.error)

