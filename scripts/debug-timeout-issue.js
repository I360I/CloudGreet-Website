#!/usr/bin/env node

const fs = require('fs');

console.log('🚨 DEBUGGING CONNECTION TIMEOUT ISSUE...\n');

console.log('❌ STILL GETTING TIMEOUT ERROR:');
console.log('"Connection terminated due to connection timeout"');
console.log('');

console.log('🔍 ANALYZING CURRENT VOICE WEBHOOK:');

const voiceWebhookFile = 'app/api/telnyx/voice-webhook/route.ts';
if (fs.existsSync(voiceWebhookFile)) {
  const content = fs.readFileSync(voiceWebhookFile, 'utf8');
  
  // Check for potential timeout causes
  const timeoutCauses = [
    { pattern: /await.*supabaseAdmin/g, issue: 'Database queries' },
    { pattern: /\.from\(.*businesses.*\)/g, issue: 'Business lookup' },
    { pattern: /\.from\(.*ai_agents.*\)/g, issue: 'AI agent lookup' },
    { pattern: /\.from\(.*calls.*\)/g, issue: 'Call storage' },
    { pattern: /\.single\(\)/g, issue: 'Single record queries' },
    { pattern: /\.insert\(/g, issue: 'Database inserts' }
  ];
  
  timeoutCauses.forEach(({ pattern, issue }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`⚠️  ${issue}: ${matches.length} occurrences`);
    }
  });
  
  // Check for complex operations
  if (content.includes('businesses') && content.includes('ai_agents')) {
    console.log('❌ Multiple database queries in voice webhook');
  }
  
  if (content.includes('await') && content.includes('supabaseAdmin')) {
    console.log('❌ Multiple await operations');
  }
  
} else {
  console.log('❌ Voice webhook file missing!');
}

console.log('\n🚨 ROOT CAUSE ANALYSIS:');
console.log('');
console.log('1. VOICE WEBHOOK TOO COMPLEX:');
console.log('   - Multiple database queries');
console.log('   - Business lookup + AI agent lookup');
console.log('   - Call storage operation');
console.log('   - All happening synchronously');
console.log('');
console.log('2. DATABASE CONNECTION ISSUES:');
console.log('   - Supabase connection might be slow');
console.log('   - No connection pooling');
console.log('   - Complex joins taking too long');
console.log('');
console.log('3. VERCEL FUNCTION LIMITS:');
console.log('   - Function timeout limits');
console.log('   - Cold start issues');
console.log('   - Memory constraints');
console.log('');

console.log('💡 SOLUTION: ULTRA-SIMPLE VOICE WEBHOOK');
console.log('');
console.log('The voice webhook should be MINIMAL:');
console.log('1. Just return basic instructions');
console.log('2. NO database queries');
console.log('3. NO complex operations');
console.log('4. Fast response time');
console.log('');
console.log('Move all complex logic to voice handler:');
console.log('1. Voice handler can be slower');
console.log('2. Voice handler has more time');
console.log('3. Voice handler can do database operations');
console.log('');

console.log('🔧 IMMEDIATE FIX NEEDED:');
console.log('');
console.log('1. CREATE ULTRA-SIMPLE VOICE WEBHOOK:');
console.log('   - Just return hardcoded instructions');
console.log('   - No database queries at all');
console.log('   - Fast response');
console.log('');
console.log('2. MOVE ALL LOGIC TO VOICE HANDLER:');
console.log('   - Database lookups in voice handler');
console.log('   - AI conversation in voice handler');
console.log('   - Call storage in voice handler');
console.log('');
console.log('3. USE HARDCODED DEMO DATA:');
console.log('   - No database lookups in webhook');
console.log('   - Just return demo instructions');
console.log('   - Let voice handler do the work');
console.log('');

console.log('📞 NEXT STEPS:');
console.log('1. Create ultra-simple voice webhook');
console.log('2. Move all complex logic to voice handler');
console.log('3. Test with minimal webhook first');
console.log('4. Gradually add features back');
