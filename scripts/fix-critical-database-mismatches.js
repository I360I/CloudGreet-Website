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

// Critical mismatches that need fixing
const criticalFixes = [
  {
    file: 'app/api/ai/conversation-voice/route.ts',
    line: 252,
    issue: 'transcription_text column does not exist in calls table',
    fix: 'transcript'
  }
];

function fixFile(filePath, fixes) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    fixes.forEach(fix => {
      if (fix.issue.includes('transcription_text')) {
        // Fix transcription_text to transcript
        const oldPattern = /transcription_text:/g;
        if (content.match(oldPattern)) {
          content = content.replace(oldPattern, 'transcript:');
          modified = true;
          
        }
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
  return false;
}

// Apply critical fixes


let fixedCount = 0;

// Fix transcription_text in conversation-voice route
if (fixFile('app/api/ai/conversation-voice/route.ts', [{ issue: 'transcription_text' }])) {
  fixedCount++;
}

// Check for other critical issues
const criticalFiles = [
  'app/api/telnyx/voice-handler/route.ts',
  'app/api/telnyx/voice-webhook/route.ts',
  'app/api/click-to-call/initiate/route.ts'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for problematic column references
    const problematicPatterns = [
      { pattern: /from_number:/g, replacement: 'customer_phone:' },
      { pattern: /to_number:/g, replacement: 'customer_phone:' },
      { pattern: /status:/g, replacement: 'call_status:' },
      { pattern: /ai_session_id:/g, replacement: 'agent_id:' },
      { pattern: /ai_response:/g, replacement: 'transcript:' }
    ];
    
    let fileModified = false;
    let newContent = content;
    
    problematicPatterns.forEach(({ pattern, replacement }) => {
      if (newContent.match(pattern)) {
        newContent = newContent.replace(pattern, replacement);
        fileModified = true;
      }
    });
    
    if (fileModified) {
      fs.writeFileSync(file, newContent);
      
      fixedCount++;
    }
  }
});










