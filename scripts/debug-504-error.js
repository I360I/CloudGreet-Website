#!/usr/bin/env node

const fs = require('fs');



// Check for potential issues in the click-to-call route
const clickToCallFile = 'app/api/click-to-call/initiate/route.ts';

if (fs.existsSync(clickToCallFile)) {
  const content = fs.readFileSync(clickToCallFile, 'utf8');
  
  
  
  // Check for potential JSON parsing issues
  const jsonIssues = [
    { pattern: /JSON\.parse\(/g, issue: 'Manual JSON.parse calls that might fail' },
    { pattern: /await.*\.json\(\)/g, issue: 'Response.json() calls that might fail' },
    { pattern: /\.text\(\)/g, issue: 'Response.text() calls that might cause JSON issues' }
  ];
  
  jsonIssues.forEach(({ pattern, issue }) => {
    const matches = content.match(pattern);
    if (matches) {
      
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
      
    }
  });
  
  // Look for specific problematic patterns
  
  
  // Check for the specific error pattern
  if (content.includes('An error o')) {
    
  }
  
  // Check for incomplete error messages
  const incompleteErrors = content.match(/"[^"]*An error[^"]*"/g);
  if (incompleteErrors) {
    
    incompleteErrors.forEach(error => );
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
      
    }
  });
  
  
  
  
  
  
  
  
} else {
  
}






