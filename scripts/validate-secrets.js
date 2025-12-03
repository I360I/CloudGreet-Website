#!/usr/bin/env node

/**
 * Secrets Validation Script
 * Validates that all required secrets are present and properly formatted
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Required secrets configuration
const REQUIRED_SECRETS = {
  // Core application secrets
  'JWT_SECRET': {
    type: 'jwt_secret',
    minLength: 32,
    description: 'JWT signing secret for authentication tokens',
    critical: true
  },
  'NEXT_PUBLIC_APP_URL': {
    type: 'url',
    pattern: /^https?:\/\/.+/,
    description: 'Public application URL',
    critical: true
  },
  
  // Database secrets
  'NEXT_PUBLIC_SUPABASE_URL': {
    type: 'url',
    pattern: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/,
    description: 'Supabase project URL',
    critical: true
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    type: 'api_key',
    minLength: 20,
    description: 'Supabase service role key',
    critical: true
  },
  
  // AI/ML services
  'OPENAI_API_KEY': {
    type: 'api_key',
    pattern: /^sk-[a-zA-Z0-9]{48}$/,
    description: 'OpenAI API key',
    critical: true
  },
  'OPENAI_API_BASE_URL': {
    type: 'url',
    pattern: /^https:\/\/api\.openai\.com\/v1$/,
    description: 'OpenAI API base URL',
    critical: false,
    defaultValue: 'https://api.openai.com/v1'
  },
  
  // Retell AI
  'RETELL_API_KEY': {
    type: 'api_key',
    minLength: 20,
    description: 'Retell AI API key',
    critical: true
  },
  'RETELL_WEBHOOK_SECRET': {
    type: 'webhook_secret',
    minLength: 16,
    description: 'Retell AI webhook secret',
    critical: true
  },
  
  // Telnyx
  'TELNYX_API_KEY': {
    type: 'api_key',
    minLength: 20,
    description: 'Telnyx API key',
    critical: true
  },
  'TELNYX_PHONE_NUMBER': {
    type: 'phone',
    pattern: /^\+1[0-9]{10}$/,
    description: 'Telnyx phone number',
    critical: true
  },
  'TELNYX_CONNECTION_ID': {
    type: 'uuid',
    pattern: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
    description: 'Telnyx connection ID',
    critical: true
  },
  'TELNYX_WEBHOOK_SECRET': {
    type: 'webhook_secret',
    minLength: 16,
    description: 'Telnyx webhook secret',
    critical: true
  },
  
  // Stripe
  'STRIPE_SECRET_KEY': {
    type: 'api_key',
    pattern: /^sk_(test_|live_)[a-zA-Z0-9]{24}$/,
    description: 'Stripe secret key',
    critical: true
  },
  'STRIPE_WEBHOOK_SECRET': {
    type: 'webhook_secret',
    pattern: /^whsec_[a-zA-Z0-9_]+$/,
    description: 'Stripe webhook secret',
    critical: true
  },
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': {
    type: 'api_key',
    pattern: /^pk_(test_|live_)[a-zA-Z0-9]{24}$/,
    description: 'Stripe publishable key',
    critical: true
  },
  
  // Email service
  'RESEND_API_KEY': {
    type: 'api_key',
    pattern: /^re_[a-zA-Z0-9_]+$/,
    description: 'Resend API key',
    critical: true
  },
  
  // Google Calendar
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID': {
    type: 'client_id',
    pattern: /^[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/,
    description: 'Google OAuth client ID',
    critical: false
  },
  'GOOGLE_CLIENT_SECRET': {
    type: 'api_key',
    minLength: 20,
    description: 'Google OAuth client secret',
    critical: false
  },
  'GOOGLE_REDIRECT_URI': {
    type: 'url',
    pattern: /^https:\/\/.+\/api\/calendar\/callback$/,
    description: 'Google OAuth redirect URI',
    critical: false
  },
  
  // Monitoring
  'SLACK_WEBHOOK_URL': {
    type: 'url',
    pattern: /^https:\/\/hooks\.slack\.com\/services\/[a-zA-Z0-9\/]+$/,
    description: 'Slack webhook URL for alerts',
    critical: false
  }
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

function validateSecret(key, value, config) {
  const errors = [];
  const warnings = [];
  
  // Check if value exists
  if (!value || value.trim() === '') {
    if (config.critical) {
      errors.push(`Missing required secret: ${key}`);
    } else {
      warnings.push(`Optional secret missing: ${key}`);
    }
    return { errors, warnings };
  }
  
  // Check minimum length
  if (config.minLength && value.length < config.minLength) {
    errors.push(`${key} must be at least ${config.minLength} characters long`);
  }
  
  // Check pattern
  if (config.pattern && !config.pattern.test(value)) {
    errors.push(`${key} format is invalid`);
  }
  
  // Type-specific validations
  switch (config.type) {
    case 'jwt_secret':
      if (value.length < 32) {
        errors.push(`${key} should be at least 32 characters for security`);
      }
      break;
      
    case 'api_key':
      if (value.includes(' ')) {
        errors.push(`${key} should not contain spaces`);
      }
      break;
      
    case 'url':
      try {
        new URL(value);
      } catch {
        errors.push(`${key} is not a valid URL`);
      }
      break;
      
    case 'phone':
      if (!/^\+[1-9]\d{1,14}$/.test(value)) {
        errors.push(`${key} is not a valid phone number`);
      }
      break;
      
    case 'uuid':
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        errors.push(`${key} is not a valid UUID`);
      }
      break;
  }
  
  return { errors, warnings };
}

function validateAllSecrets() {
  console.log('🔍 Validating application secrets...\n');
  
  // Load environment variables
  const env = loadEnvFile(path.join(__dirname, '..', '.env.local'));
  
  let totalErrors = 0;
  let totalWarnings = 0;
  let criticalErrors = 0;
  
  console.log('📋 Secret Validation Results:\n');
  
  Object.entries(REQUIRED_SECRETS).forEach(([key, config]) => {
    const value = env[key];
    const { errors, warnings } = validateSecret(key, value, config);
    
    if (errors.length > 0 || warnings.length > 0) {
      console.log(`🔍 ${key}:`);
      console.log(`   Description: ${config.description}`);
      
      if (errors.length > 0) {
        console.log(`   ❌ Errors:`);
        errors.forEach(error => {
          console.log(`      - ${error}`);
        });
        totalErrors += errors.length;
        if (config.critical) {
          criticalErrors += errors.length;
        }
      }
      
      if (warnings.length > 0) {
        console.log(`   ⚠️  Warnings:`);
        warnings.forEach(warning => {
          console.log(`      - ${warning}`);
        });
        totalWarnings += warnings.length;
      }
      
      console.log('');
    } else {
      console.log(`✅ ${key}: Valid`);
    }
  });
  
  // Summary
  console.log('📊 Validation Summary:');
  console.log(`   ✅ Valid secrets: ${Object.keys(REQUIRED_SECRETS).length - totalErrors - totalWarnings}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log(`   ⚠️  Warnings: ${totalWarnings}`);
  console.log(`   🚨 Critical errors: ${criticalErrors}`);
  
  if (criticalErrors > 0) {
    console.log('\n🚨 Critical errors found! Application may not function properly.');
    console.log('Please fix these errors before deploying to production.');
    return false;
  } else if (totalErrors > 0) {
    console.log('\n⚠️  Some errors found. Please review and fix them.');
    return false;
  } else if (totalWarnings > 0) {
    console.log('\n⚠️  Some warnings found. Consider addressing them for better security.');
    return true;
  } else {
    console.log('\n🎉 All secrets are valid!');
    return true;
  }
}

function generateSecretsReport() {
  console.log('📊 Generating secrets report...\n');
  
  const env = loadEnvFile(path.join(__dirname, '..', '.env.local'));
  const report = {
    timestamp: new Date().toISOString(),
    totalSecrets: Object.keys(REQUIRED_SECRETS).length,
    presentSecrets: 0,
    missingSecrets: 0,
    criticalSecrets: 0,
    optionalSecrets: 0,
    secrets: {}
  };
  
  Object.entries(REQUIRED_SECRETS).forEach(([key, config]) => {
    const value = env[key];
    const isPresent = value && value.trim() !== '';
    
    report.secrets[key] = {
      present: isPresent,
      critical: config.critical,
      type: config.type,
      description: config.description
    };
    
    if (isPresent) {
      report.presentSecrets++;
    } else {
      report.missingSecrets++;
    }
    
    if (config.critical) {
      report.criticalSecrets++;
    } else {
      report.optionalSecrets++;
    }
  });
  
  const reportFile = path.join(__dirname, '..', 'secrets-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`📁 Report saved to: ${reportFile}`);
  console.log(`   Total secrets: ${report.totalSecrets}`);
  console.log(`   Present: ${report.presentSecrets}`);
  console.log(`   Missing: ${report.missingSecrets}`);
  console.log(`   Critical: ${report.criticalSecrets}`);
  console.log(`   Optional: ${report.optionalSecrets}`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'validate':
      const isValid = validateAllSecrets();
      process.exit(isValid ? 0 : 1);
      break;
      
    case 'report':
      generateSecretsReport();
      break;
      
    case 'check':
      console.log('🔍 Quick secrets check...\n');
      const env = loadEnvFile(path.join(__dirname, '..', '.env.local'));
      const missingCritical = Object.entries(REQUIRED_SECRETS)
        .filter(([key, config]) => config.critical && (!env[key] || env[key].trim() === ''))
        .map(([key]) => key);
      
      if (missingCritical.length > 0) {
        console.log('❌ Missing critical secrets:');
        missingCritical.forEach(key => console.log(`   - ${key}`));
        process.exit(1);
      } else {
        console.log('✅ All critical secrets are present');
        process.exit(0);
      }
      break;
      
    default:
      console.log('🔐 Secrets Validation Script');
      console.log('');
      console.log('Usage:');
      console.log('  node validate-secrets.js validate    # Full validation');
      console.log('  node validate-secrets.js check      # Quick check for critical secrets');
      console.log('  node validate-secrets.js report     # Generate detailed report');
      console.log('');
      console.log('Examples:');
      console.log('  node validate-secrets.js validate');
      console.log('  node validate-secrets.js check');
      console.log('  node validate-secrets.js report');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateAllSecrets, generateSecretsReport };















