#!/usr/bin/env node

/**
 * Webhook Configuration Verification Script
 * 
 * Checks:
 * 1. Webhook endpoint accessibility
 * 2. Environment variables (from .env or system)
 * 3. Database table requirements
 * 4. Code structure verification
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://cloudgreet.com/api/stripe/webhook';

console.log('🔍 Stripe Webhook Configuration Verification\n');
console.log('═'.repeat(70));

// Check 1: Endpoint Accessibility
async function checkEndpointAccessibility() {
  console.log('\n📡 1. Checking Endpoint Accessibility');
  console.log('─'.repeat(70));
  console.log(`URL: ${WEBHOOK_URL}`);
  
  return new Promise((resolve) => {
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test' // Will fail, but shows endpoint is up
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${data.substring(0, 100)}`);
        
        if (res.statusCode === 401 || res.statusCode === 400) {
          console.log('   ✅ Endpoint is accessible (401/400 expected for invalid signature)');
          resolve(true);
        } else if (res.statusCode === 500) {
          console.log('   ⚠️  Endpoint returned 500 (check STRIPE_WEBHOOK_SECRET in Vercel)');
          resolve(false);
        } else {
          console.log(`   ⚠️  Unexpected status: ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      console.log('   💡 Check if domain is accessible and Vercel deployment is live');
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('   ❌ Request timeout');
      req.destroy();
      resolve(false);
    });

    req.write(JSON.stringify({ test: 'ping' }));
    req.end();
  });
}

// Check 2: Environment Variables
function checkEnvironmentVariables() {
  console.log('\n🔐 2. Checking Environment Variables');
  console.log('─'.repeat(70));
  
  const envFile = path.join(process.cwd(), '.env.local');
  const envExample = path.join(process.cwd(), 'env.example');
  
  let envVars = {};
  
  // Try to read .env.local
  if (fs.existsSync(envFile)) {
    try {
      const content = fs.readFileSync(envFile, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.+)$/);
        if (match) {
          envVars[match[1].trim()] = match[2].trim();
        }
      });
      console.log('   ✅ Found .env.local file');
    } catch (error) {
      console.log('   ⚠️  Could not read .env.local');
    }
  } else {
    console.log('   ⚠️  .env.local not found (normal if using Vercel env vars)');
  }
  
  // Check required variables
  const required = {
    'STRIPE_WEBHOOK_SECRET': envVars.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET,
    'STRIPE_SECRET_KEY': envVars.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY,
  };
  
  let allSet = true;
  for (const [key, value] of Object.entries(required)) {
    if (value && value.length > 0) {
      const masked = value.substring(0, 10) + '...' + value.substring(value.length - 4);
      console.log(`   ✅ ${key}: ${masked}`);
    } else {
      console.log(`   ❌ ${key}: Not set`);
      console.log(`      💡 Set in Vercel: Settings → Environment Variables`);
      allSet = false;
    }
  }
  
  return allSet;
}

// Check 3: Code Structure
function checkCodeStructure() {
  console.log('\n📝 3. Checking Code Structure');
  console.log('─'.repeat(70));
  
  const webhookFile = path.join(process.cwd(), 'app', 'api', 'stripe', 'webhook', 'route.ts');
  
  if (!fs.existsSync(webhookFile)) {
    console.log('   ❌ Webhook file not found!');
    return false;
  }
  
  console.log('   ✅ Webhook file exists');
  
  try {
    const content = fs.readFileSync(webhookFile, 'utf8');
    
    const checks = [
      { name: 'Signature verification', pattern: /stripe-signature|constructEvent/ },
      { name: 'Idempotency check', pattern: /webhook_events|existingEvent/ },
      { name: 'checkout.session.completed handler', pattern: /checkout\.session\.completed/ },
      { name: 'customer.subscription.created handler', pattern: /customer\.subscription\.created/ },
      { name: 'customer.subscription.updated handler', pattern: /customer\.subscription\.updated/ },
      { name: 'customer.subscription.deleted handler', pattern: /customer\.subscription\.deleted/ },
      { name: 'invoice.payment_succeeded handler', pattern: /invoice\.payment_succeeded/ },
      { name: 'invoice.payment_failed handler', pattern: /invoice\.payment_failed/ },
      { name: 'Error handling', pattern: /catch|error/ },
      { name: 'Logging', pattern: /logger\.(info|warn|error)/ },
    ];
    
    let allFound = true;
    for (const check of checks) {
      if (content.match(check.pattern)) {
        console.log(`   ✅ ${check.name}`);
      } else {
        console.log(`   ❌ ${check.name} - Not found`);
        allFound = false;
      }
    }
    
    return allFound;
  } catch (error) {
    console.log(`   ❌ Error reading file: ${error.message}`);
    return false;
  }
}

// Check 4: Database Tables
function checkDatabaseTables() {
  console.log('\n🗄️  4. Checking Database Tables (Migration Files)');
  console.log('─'.repeat(70));
  
  const migrationsDir = path.join(process.cwd(), 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('   ⚠️  Migrations directory not found');
    return false;
  }
  
  const requiredTables = [
    'webhook_events',
    'businesses',
    'stripe_subscriptions',
    'billing_history'
  ];
  
  let allFound = true;
  for (const table of requiredTables) {
    // Check if table is mentioned in migration files
    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    let found = false;
    
    for (const file of migrationFiles) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      if (content.includes(`CREATE TABLE.*${table}`) || content.includes(`CREATE TABLE IF NOT EXISTS.*${table}`)) {
        found = true;
        break;
      }
    }
    
    if (found) {
      console.log(`   ✅ Table '${table}' found in migrations`);
    } else {
      console.log(`   ⚠️  Table '${table}' not found in migrations (may exist in Supabase)`);
      allFound = false;
    }
  }
  
  return allFound;
}

// Main
async function main() {
  const endpointOk = await checkEndpointAccessibility();
  const envOk = checkEnvironmentVariables();
  const codeOk = checkCodeStructure();
  const dbOk = checkDatabaseTables();
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 Summary');
  console.log('═'.repeat(70));
  console.log(`Endpoint accessible: ${endpointOk ? '✅' : '❌'}`);
  console.log(`Environment variables: ${envOk ? '✅' : '❌'}`);
  console.log(`Code structure: ${codeOk ? '✅' : '❌'}`);
  console.log(`Database tables: ${dbOk ? '✅' : '⚠️'}`);
  
  console.log('\n💡 Next Steps:');
  if (!endpointOk) {
    console.log('   - Check if Vercel deployment is live');
    console.log('   - Verify domain is accessible');
  }
  if (!envOk) {
    console.log('   - Set STRIPE_WEBHOOK_SECRET in Vercel');
    console.log('   - Set STRIPE_SECRET_KEY in Vercel');
    console.log('   - Redeploy after setting env vars');
  }
  if (!codeOk) {
    console.log('   - Review webhook handler code');
  }
  if (!dbOk) {
    console.log('   - Verify tables exist in Supabase');
    console.log('   - Run migrations if needed');
  }
  
  console.log('\n📋 To test properly:');
  console.log('   1. Check Stripe dashboard "Recent deliveries"');
  console.log('   2. Use Stripe CLI: stripe listen --forward-to ' + WEBHOOK_URL);
  console.log('   3. Check Vercel function logs');
  console.log('═'.repeat(70));
}

main().catch(console.error);






