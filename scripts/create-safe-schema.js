#!/usr/bin/env node

/**
 * Convert ULTIMATE_COMPLETE_SUPABASE_SCHEMA.sql to safe format
 * Adds IF NOT EXISTS to all CREATE TABLE and CREATE INDEX statements
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'ULTIMATE_COMPLETE_SUPABASE_SCHEMA.sql');
const outputFile = path.join(__dirname, '..', 'ULTIMATE_COMPLETE_SUPABASE_SCHEMA_SAFE.sql');

console.log('🔄 Converting schema to safe format...\n');

try {
  let content = fs.readFileSync(inputFile, 'utf8');
  
  // Convert CREATE TABLE to CREATE TABLE IF NOT EXISTS
  // Pattern: CREATE TABLE table_name (not CREATE TABLE IF NOT EXISTS)
  content = content.replace(/^CREATE TABLE (\w+)/gm, 'CREATE TABLE IF NOT EXISTS $1');
  
  // Convert CREATE INDEX to CREATE INDEX IF NOT EXISTS
  content = content.replace(/^CREATE INDEX (\w+)/gm, 'CREATE INDEX IF NOT EXISTS $1');
  
  // Convert CREATE UNIQUE INDEX to CREATE UNIQUE INDEX IF NOT EXISTS
  content = content.replace(/^CREATE UNIQUE INDEX (\w+)/gm, 'CREATE UNIQUE INDEX IF NOT EXISTS $1');
  
  // Fix ALTER TABLE ENABLE ROW LEVEL SECURITY to be safe
  // Wrap in DO blocks to prevent errors if already enabled
  content = content.replace(/^ALTER TABLE (\w+) ENABLE ROW LEVEL SECURITY;/gm, (match, tableName) => {
    return `DO $$\nBEGIN\n    ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;\nEXCEPTION\n    WHEN OTHERS THEN NULL; -- Ignore if already enabled\nEND $$;`;
  });
  
  // Write output
  fs.writeFileSync(outputFile, content, 'utf8');
  
  console.log('✅ Successfully created safe schema file!');
  console.log(`📄 Output: ${outputFile}\n`);
  console.log('📋 Next steps:');
  console.log('1. Review the file to ensure it looks correct');
  console.log('2. Run it in Supabase SQL Editor');
  console.log('3. It will create all missing tables without breaking existing ones\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}













