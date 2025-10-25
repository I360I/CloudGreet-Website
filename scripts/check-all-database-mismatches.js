#!/usr/bin/env node

const fs = require('fs');
const path = require('path');



// Known actual database columns from your schema
const actualColumns = {
  calls: [
    'id', 'business_id', 'customer_phone', 'agent_id', 'call_duration', 
    'call_status', 'service_requested', 'urgency', 'estimated_value', 
    'conversion_outcome', 'revenue_generated', 'satisfaction_rating', 
    'transcript', 'recording_url', 'created_at', 'updated_at', 'call_id'
  ],
  businesses: [
    'id', 'owner_id', 'business_name', 'business_type', 'email', 'phone', 
    'phone_number', 'address', 'city', 'state', 'zip_code', 'country', 
    'website', 'description', 'services', 'service_areas', 'business_hours', 
    'greeting_message', 'tone', 'ai_agent_enabled', 'onboarding_completed', 
    'account_status', 'stripe_customer_id', 'subscription_status', 
    'billing_plan', 'created_at', 'updated_at', 'industry', 'company_size', 
    'annual_revenue', 'employee_count', 'timezone', 'settings', 
    'google_calendar_id', 'google_calendar_access_token', 
    'google_calendar_refresh_token', 'google_calendar_expires_at', 
    'webhook_configured', 'webhook_url', 'notification_phone', 
    'notification_email', 'sms_forwarding_enabled', 'default_ai_voice', 
    'default_ai_tone', 'default_ai_model', 'logo_url', 'business_size', 
    'after_hours_policy', 'call_recording_enabled', 'custom_instructions', 
    'pricing_plan', 'is_trial_active', 'trial_end_date', 'last_activity_at', 
    'api_key', 'lead_scoring_config', 'crm_integrated', 'crm_type', 
    'custom_domain', 'ssl_enabled', 'analytics_id'
  ],
  ai_agents: [
    'id', 'business_id', 'agent_name', 'is_active', 'telynyx_agent_id', 
    'configuration', 'performance_metrics', 'prompt_template', 
    'voice_settings', 'created_at', 'updated_at', 'business_name', 
    'voice', 'tone', 'ai_model', 'greeting_message', 'custom_instructions', 
    'knowledge_base', 'availability_schedule', 'call_forwarding_number', 
    'voicemail_enabled', 'sms_enabled', 'email_enabled', 
    'calendar_integrated', 'crm_integrated', 'lead_qualification_criteria', 
    'appointment_booking_preferences', 'pricing_estimation_enabled', 
    'supported_languages', 'persona_description', 'fallback_behavior', 
    'sentiment_analysis_enabled', 'transcription_enabled', 
    'call_summary_enabled', 'custom_metrics', 'custom_events', 
    'custom_actions', 'custom_triggers', 'custom_automations'
  ],
  toll_free_numbers: [
    'id', 'phone_number', 'business_id', 'status', 'created_at', 'updated_at'
  ]
};

// Common mismatched column patterns
const mismatches = [];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Check for database operations
      if (line.includes('.from(') || line.includes('.insert(') || line.includes('.update(') || line.includes('.select(')) {
        // Look for column references that might be wrong
        const tableMatch = line.match(/\.from\(['"`]([^'"`]+)['"`]\)/);
        if (tableMatch) {
          const tableName = tableMatch[1];
          if (actualColumns[tableName]) {
            // Check for column references in the next few lines
            for (let i = 0; i < 10 && index + i < lines.length; i++) {
              const checkLine = lines[index + i];
              if (checkLine.includes('}') && checkLine.includes('{')) {
                // Extract column names from object literals
                const columnMatches = checkLine.match(/(\w+):/g);
                if (columnMatches) {
                  columnMatches.forEach(match => {
                    const columnName = match.replace(':', '');
                    if (!actualColumns[tableName].includes(columnName)) {
                      mismatches.push({
                        file: filePath,
                        line: index + i + 1,
                        table: tableName,
                        column: columnName,
                        actualColumns: actualColumns[tableName],
                        code: checkLine.trim()
                      });
                    }
                  });
                }
              }
            }
          }
        }
      }
      
      // Check for specific problematic patterns
      const problematicPatterns = [
        'from_number', 'to_number', 'ai_session_id', 'ai_response',
        'direction', 'call_type', 'source', 'status'
      ];
      
      problematicPatterns.forEach(pattern => {
        if (line.includes(pattern)) {
          // Check if this is in a database context
          if (line.includes('.from(') || line.includes('.insert(') || line.includes('.update(')) {
            mismatches.push({
              file: filePath,
              line: lineNum,
              table: 'unknown',
              column: pattern,
              issue: 'Potentially wrong column name',
              code: line.trim()
            });
          }
        }
      });
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
}

function scanDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      scanDirectory(fullPath);
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js'))) {
      scanFile(fullPath);
    }
  });
}

// Scan the entire codebase

scanDirectory('.');

// Report results


if (mismatches.length === 0) {
  
} else {
  mismatches.forEach((mismatch, index) => {
    
    
    
    if (mismatch.actualColumns) {
      .join(', ')}${mismatch.actualColumns.length > 5 ? '...' : ''}`);
    }
    
    
  });
}







// Save results to file
const reportPath = 'database-mismatch-report.txt';
const reportContent = mismatches.map((mismatch, index) => 
  `${index + 1}. ${mismatch.file}:${mismatch.line}\n   Table: ${mismatch.table}\n   Column: ${mismatch.column}\n   Code: ${mismatch.code}\n`
).join('\n');

fs.writeFileSync(reportPath, `DATABASE COLUMN MISMATCH REPORT\nGenerated: ${new Date().toISOString()}\n\n${reportContent}`);

