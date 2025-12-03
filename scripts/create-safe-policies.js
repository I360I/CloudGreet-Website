#!/usr/bin/env node

/**
 * Convert CREATE POLICY statements to safe format
 * PostgreSQL doesn't support CREATE POLICY IF NOT EXISTS
 * So we need to wrap them in DO blocks that check existence first
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'ULTIMATE_COMPLETE_SUPABASE_SCHEMA_SAFE.sql');
const outputFile = path.join(__dirname, '..', 'ULTIMATE_COMPLETE_SUPABASE_SCHEMA_SAFE_FINAL.sql');

console.log('🔄 Converting policies to safe format...\n');

try {
  let content = fs.readFileSync(inputFile, 'utf8');
  
  // Pattern to match CREATE POLICY statements
  // CREATE POLICY "policy name" ON table_name FOR ... USING ...
  const policyRegex = /CREATE POLICY "([^"]+)" ON (\w+)\s+((?:FOR \w+)?)\s+(USING[^;]+|WITH CHECK[^;]+);/g;
  
  // Replace each CREATE POLICY with a safe DO block
  content = content.replace(policyRegex, (match, policyName, tableName, forClause, policyBody) => {
    // Escape quotes in policy name and body for SQL
    const escapedPolicyName = policyName.replace(/'/g, "''");
    const escapedTableName = tableName;
    
    return `-- Safe policy creation for: ${policyName}
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = '${escapedTableName}' 
        AND policyname = '${escapedPolicyName}'
    ) THEN
        CREATE POLICY "${policyName}" ON ${escapedTableName} ${forClause} ${policyBody};
    END IF;
END $$;`;
  });
  
  // Write output
  fs.writeFileSync(outputFile, content, 'utf8');
  
  console.log('✅ Successfully created safe policy schema file!');
  console.log(`📄 Output: ${outputFile}\n`);
  console.log('📋 This version safely handles existing policies.\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}













