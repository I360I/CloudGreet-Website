#!/usr/bin/env node

/**
 * Test Stripe Webhook Endpoint
 * 
 * This script tests the Stripe webhook endpoint by:
 * 1. Checking if the endpoint is accessible
 * 2. Verifying environment variables are set
 * 3. Testing with a mock Stripe event (will fail signature, but shows endpoint is up)
 */

const https = require('https');
const http = require('http');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://cloudgreet.com/api/stripe/webhook';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

console.log('🧪 Testing Stripe Webhook Endpoint\n');
console.log('─'.repeat(60));
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log(`Webhook Secret: ${STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log('─'.repeat(60));
console.log('');

// Test 1: Check endpoint accessibility
async function testEndpointAccessibility() {
  console.log('📡 Test 1: Checking endpoint accessibility...');
  
  return new Promise((resolve) => {
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature' // Will fail, but shows endpoint is up
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${data.substring(0, 200)}`);
        
        if (res.statusCode === 401) {
          console.log('   ✅ Endpoint is accessible (401 expected - signature will fail)');
          resolve(true);
        } else if (res.statusCode === 500) {
          console.log('   ⚠️  Endpoint returned 500 (check if STRIPE_WEBHOOK_SECRET is set)');
          resolve(false);
        } else {
          console.log(`   ⚠️  Unexpected status: ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      resolve(false);
    });

    req.write(JSON.stringify({ test: 'ping' }));
    req.end();
  });
}

// Test 2: Check environment variables
function testEnvironmentVariables() {
  console.log('\n📋 Test 2: Checking environment variables...');
  
  const required = {
    'STRIPE_WEBHOOK_SECRET': process.env.STRIPE_WEBHOOK_SECRET,
    'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
  };

  let allSet = true;
  for (const [key, value] of Object.entries(required)) {
    if (value) {
      const masked = value.substring(0, 10) + '...';
      console.log(`   ✅ ${key}: ${masked}`);
    } else {
      console.log(`   ❌ ${key}: Not set`);
      allSet = false;
    }
  }

  return allSet;
}

// Test 3: Instructions for Stripe CLI
function showStripeCLIInstructions() {
  console.log('\n🔧 Test 3: Using Stripe CLI (Recommended)');
  console.log('─'.repeat(60));
  console.log('To properly test with Stripe CLI:');
  console.log('');
  console.log('1. Install Stripe CLI:');
  console.log('   https://stripe.com/docs/stripe-cli');
  console.log('');
  console.log('2. Login to Stripe:');
  console.log('   stripe login');
  console.log('');
  console.log('3. Forward webhooks to your endpoint:');
  console.log(`   stripe listen --forward-to ${WEBHOOK_URL}`);
  console.log('');
  console.log('4. In another terminal, trigger test events:');
  console.log('   stripe trigger checkout.session.completed');
  console.log('   stripe trigger customer.subscription.created');
  console.log('   stripe trigger invoice.payment_succeeded');
  console.log('');
  console.log('─'.repeat(60));
}

// Test 4: Check webhook logs in Stripe
function showStripeDashboardInstructions() {
  console.log('\n📊 Test 4: Check Stripe Dashboard Logs');
  console.log('─'.repeat(60));
  console.log('1. Go to: https://dashboard.stripe.com/webhooks');
  console.log('2. Click on your webhook');
  console.log('3. Look at "Recent deliveries" tab');
  console.log('4. Check for any failed deliveries');
  console.log('5. Click on a delivery to see details');
  console.log('');
  console.log('You should see:');
  console.log('  ✅ 200 OK = Working');
  console.log('  ❌ 401 = Signature mismatch');
  console.log('  ❌ 500 = Code error');
  console.log('─'.repeat(60));
}

// Main
async function main() {
  const endpointAccessible = await testEndpointAccessibility();
  const envVarsSet = testEnvironmentVariables();
  
  showStripeCLIInstructions();
  showStripeDashboardInstructions();
  
  console.log('\n📝 Summary:');
  console.log('─'.repeat(60));
  console.log(`Endpoint accessible: ${endpointAccessible ? '✅' : '❌'}`);
  console.log(`Environment variables: ${envVarsSet ? '✅' : '❌'}`);
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Use Stripe CLI to send test events (best method)');
  console.log('   2. Check Stripe dashboard "Recent deliveries" for logs');
  console.log('   3. Check Vercel function logs for processing details');
  console.log('─'.repeat(60));
}

main().catch(console.error);






