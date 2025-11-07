#!/usr/bin/env node

/**
 * Generate JWT Secret for CloudGreet
 * 
 * This script generates a secure random JWT secret that meets
 * the minimum 32-character requirement.
 */

const crypto = require('crypto');

function generateJWTSecret() {
  // Generate 32 random bytes and convert to base64
  // This gives us ~43 characters, well above the 32-char minimum
  const secret = crypto.randomBytes(32).toString('base64');
  
  return secret;
}

if (require.main === module) {
  console.log('🔐 Generating JWT Secret for CloudGreet\n');
  console.log('Copy this value to your Vercel environment variables as JWT_SECRET:\n');
  console.log('─'.repeat(70));
  console.log(generateJWTSecret());
  console.log('─'.repeat(70));
  console.log('\n✅ Generated! This is a secure random secret.');
  console.log('💡 Add this to Vercel Dashboard → Settings → Environment Variables');
  console.log('   Variable name: JWT_SECRET');
  console.log('   Value: [paste the secret above]');
}

module.exports = { generateJWTSecret };








