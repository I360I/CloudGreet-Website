const fs = require('fs');

// Test JSX parsing by checking the problematic files
const files = [
  'app/account/page.tsx',
  'app/admin/apollo-killer/page.tsx', 
  'app/admin/automation/page.tsx',
  'app/contexts/ToastContext.tsx'
];



files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for common JSX issues
    const issues = [];
    
    // Check for unclosed JSX tags
    const openTags = content.match(/<[^/][^>]*>/g) || [];
    const closeTags = content.match(/<\/[^>]*>/g) || [];
    const selfClosing = content.match(/<[^>]*\/>/g) || [];
    
    // Check for React import
    if (!content.includes('import React') && !content.includes('import { React }')) {
      issues.push('Missing React import');
    }
    
    // Check for 'use client' directive
    if (!content.includes("'use client'") && !content.includes('"use client"')) {
      issues.push('Missing use client directive');
    }
    
    
    if (issues.length === 0) {
      
    } else {
      issues.forEach(issue => );
    }
    
  } catch (error) {
    
    
  }
});
