#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 DEBUGGING 504 ERROR AND JSON PARSING ISSUE...\n');

// Check for potential issues in the click-to-call route
const clickToCallFile = 'app/api/click-to-call/initiate/route.ts';

if (fs.existsSync(clickToCallFile)) {
  const content = fs.readFileSync(clickToCallFile, 'utf8');
  
  console.log('📋 CHECKING CLICK-TO-CALL ROUTE FOR ISSUES:\n');
  
  // Check for potential JSON parsing issues
  const jsonIssues = [
    { pattern: /JSON\.parse\(/g, issue: 'Manual JSON.parse calls that might fail' },
    { pattern: /await.*\.json\(\)/g, issue: 'Response.json() calls that might fail' },
    { pattern: /\.text\(\)/g, issue: 'Response.text() calls that might cause JSON issues' }
  ];
  
  jsonIssues.forEach(({ pattern, issue }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`⚠️  ${issue}: ${matches.length} occurrences`);
    }
  });
  
  // Check for potential timeout issues
  const timeoutIssues = [
    { pattern: /fetch\(/g, issue: 'External API calls that might timeout' },
    { pattern: /await.*supabase/g, issue: 'Database calls that might timeout' },
    { pattern: /setTimeout/g, issue: 'Timeout handlers' }
  ];
  
  timeoutIssues.forEach(({ pattern, issue }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`⏱️  ${issue}: ${matches.length} occurrences`);
    }
  });
  
  // Check for error handling
  const errorHandling = [
    { pattern: /try\s*{/g, issue: 'Try blocks' },
    { pattern: /catch\s*\(/g, issue: 'Catch blocks' },
    { pattern: /throw\s+new\s+Error/g, issue: 'Error throwing' }
  ];
  
  errorHandling.forEach(({ pattern, issue }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`🛡️  ${issue}: ${matches.length} occurrences`);
    }
  });
  
  // Look for specific problematic patterns
  console.log('\n🔍 SPECIFIC ISSUES TO CHECK:\n');
  
  // Check for the specific error pattern
  if (content.includes('An error o')) {
    console.log('❌ FOUND: "An error o" pattern - this is likely causing the JSON parsing error');
  }
  
  // Check for incomplete error messages
  const incompleteErrors = content.match(/"[^"]*An error[^"]*"/g);
  if (incompleteErrors) {
    console.log('❌ INCOMPLETE ERROR MESSAGES:');
    incompleteErrors.forEach(error => console.log(`   ${error}`));
  }
  
  // Check for potential infinite loops or heavy operations
  const heavyOperations = [
    { pattern: /for\s*\(/g, issue: 'For loops that might be infinite' },
    { pattern: /while\s*\(/g, issue: 'While loops that might be infinite' },
    { pattern: /recursive/g, issue: 'Recursive functions' }
  ];
  
  heavyOperations.forEach(({ pattern, issue }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`🔄 ${issue}: ${matches.length} occurrences`);
    }
  });
  
  console.log('\n📋 RECOMMENDED FIXES:\n');
  console.log('1. Add proper error handling for all fetch calls');
  console.log('2. Add timeout handling for external API calls');
  console.log('3. Validate JSON responses before parsing');
  console.log('4. Add try-catch around all database operations');
  console.log('5. Check for incomplete error messages');
  
} else {
  console.log('❌ Click-to-call route file not found');
}

console.log('\n🔧 NEXT STEPS:');
console.log('1. Check Vercel logs for the actual error');
console.log('2. Add proper error handling to prevent 504s');
console.log('3. Test with a simpler version of the route');
console.log('4. Check for memory leaks or infinite loops');
