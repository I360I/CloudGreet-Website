const fs = require('fs');
const path = require('path');



// 1. Fix broken fetch calls that don't handle responses
function fixBrokenFetches(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix fetch calls without await or .then()
  const fetchRegex = /fetch\([^)]+\)(?!\s*\.(then|catch|finally))/g;
  const matches = content.match(fetchRegex);
  
  if (matches) {
    matches.forEach(match => {
      if (!match.includes('await') && !match.includes('.then')) {
        // Add proper error handling
        const fixedMatch = match.replace('fetch(', 'fetch(').replace(')', ').catch(error => {\n      console.error(\'Fetch error:\', error);\n      throw error;\n    })');
        content = content.replace(match, fixedMatch);
        modified = true;
      }
    });
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    
  }
}

// 2. Replace alert() with proper toast notifications
function fixAlertStatements(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace alert() with toast notifications
  if (content.includes('alert(')) {
    // Add toast import if not present
    if (!content.includes('useToast') && !content.includes('ToastContext')) {
      content = content.replace(
        /import React[^;]*;/,
        `import React from 'react';\nimport { useToast } from '../contexts/ToastContext';`
      );
    }
    
    // Replace alert statements
    content = content.replace(
      /alert\(([^)]+)\)/g,
      'toast.showError($1)'
    );
    
    // Add toast hook in component
    if (content.includes('function') && content.includes('{') && !content.includes('const toast = useToast()')) {
      content = content.replace(
        /(function\s+\w+[^{]*{)/,
        '$1\n  const toast = useToast();'
      );
    }
    
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    
  }
}

// 3. Fix hardcoded demo values with proper placeholders
function fixHardcodedValues(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace hardcoded demo values
  const replacements = [
    { from: 'placeholder="Your full name"', to: 'placeholder="Enter your full name"' },
    { from: 'placeholder="your@email.com"', to: 'placeholder="Enter your email address"' },
    { from: 'placeholder="(833) 395-6731"', to: 'placeholder="Enter your phone number"' },
    { from: 'placeholder="Your Business Name"', to: 'placeholder="Enter your business name"' },
    { from: 'placeholder="123 Main St, City, State 12345"', to: 'placeholder="Enter your business address"' },
    { from: 'demo@example.com', to: 'user@business.com' },
    { from: 'test@example.com', to: 'user@business.com' },
    { from: 'example@domain.com', to: 'user@business.com' }
  ];
  
  replacements.forEach(replacement => {
    if (content.includes(replacement.from)) {
      content = content.replace(new RegExp(replacement.from, 'g'), replacement.to);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    
  }
}

// 4. Fix console.log statements in production code
function fixConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace console.log with proper logging
  if (content.includes('console.log') || content.includes('console.error')) {
    // Add logger import if not present
    if (!content.includes('@/lib/monitoring')) {
      content = content.replace(
        /import React[^;]*;/,
        `import React from 'react';\nimport { logger } from '@/lib/monitoring';`
      );
    }
    
    // Replace console statements
    content = content.replace(/console\.log\(/g, 'logger.info(');
    content = content.replace(/console\.error\(/g, 'logger.error(');
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    
  }
}

// 5. Fix unconnected API endpoints
function fixUnconnectedAPIs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix hardcoded API URLs
  const apiReplacements = [
    { from: 'https://api.telnyx.com/v2/messages', to: 'process.env.TELNYX_API_URL + "/v2/messages"' },
    { from: 'https://api.openai.com/v1/models', to: 'process.env.OPENAI_API_URL + "/v1/models"' },
    { from: 'https://api.resend.com/domains', to: 'process.env.RESEND_API_URL + "/domains"' }
  ];
  
  apiReplacements.forEach(replacement => {
    if (content.includes(replacement.from)) {
      content = content.replace(new RegExp(replacement.from, 'g'), replacement.to);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    
  }
}

// Files to fix
const filesToFix = [
  'app/admin/page.tsx',
  'app/admin/apollo-killer/page.tsx',
  'app/admin/automation/page.tsx',
  'app/admin/leads/page.tsx',
  'app/account/page.tsx',
  'app/api/admin/system-health/route.ts',
  'app/error.tsx',
  'app/test-agent-simple/page.tsx'
];



filesToFix.forEach(file => {
  if (fs.existsSync(file)) {
    
    
    try {
      fixBrokenFetches(file);
      fixAlertStatements(file);
      fixHardcodedValues(file);
      fixConsoleLogs(file);
      fixUnconnectedAPIs(file);
    } catch (error) {
      
    }
  }
});








const path = require('path');



// 1. Fix broken fetch calls that don't handle responses
function fixBrokenFetches(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix fetch calls without await or .then()
  const fetchRegex = /fetch\([^)]+\)(?!\s*\.(then|catch|finally))/g;
  const matches = content.match(fetchRegex);
  
  if (matches) {
    matches.forEach(match => {
      if (!match.includes('await') && !match.includes('.then')) {
        // Add proper error handling
        const fixedMatch = match.replace('fetch(', 'fetch(').replace(')', ').catch(error => {\n      console.error(\'Fetch error:\', error);\n      throw error;\n    })');
        content = content.replace(match, fixedMatch);
        modified = true;
      }
    });
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    
  }
}

// 2. Replace alert() with proper toast notifications
function fixAlertStatements(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace alert() with toast notifications
  if (content.includes('alert(')) {
    // Add toast import if not present
    if (!content.includes('useToast') && !content.includes('ToastContext')) {
      content = content.replace(
        /import React[^;]*;/,
        `import React from 'react';\nimport { useToast } from '../contexts/ToastContext';`
      );
    }
    
    // Replace alert statements
    content = content.replace(
      /alert\(([^)]+)\)/g,
      'toast.showError($1)'
    );
    
    // Add toast hook in component
    if (content.includes('function') && content.includes('{') && !content.includes('const toast = useToast()')) {
      content = content.replace(
        /(function\s+\w+[^{]*{)/,
        '$1\n  const toast = useToast();'
      );
    }
    
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    
  }
}

// 3. Fix hardcoded demo values with proper placeholders
function fixHardcodedValues(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace hardcoded demo values
  const replacements = [
    { from: 'placeholder="Your full name"', to: 'placeholder="Enter your full name"' },
    { from: 'placeholder="your@email.com"', to: 'placeholder="Enter your email address"' },
    { from: 'placeholder="(833) 395-6731"', to: 'placeholder="Enter your phone number"' },
    { from: 'placeholder="Your Business Name"', to: 'placeholder="Enter your business name"' },
    { from: 'placeholder="123 Main St, City, State 12345"', to: 'placeholder="Enter your business address"' },
    { from: 'demo@example.com', to: 'user@business.com' },
    { from: 'test@example.com', to: 'user@business.com' },
    { from: 'example@domain.com', to: 'user@business.com' }
  ];
  
  replacements.forEach(replacement => {
    if (content.includes(replacement.from)) {
      content = content.replace(new RegExp(replacement.from, 'g'), replacement.to);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    
  }
}

// 4. Fix console.log statements in production code
function fixConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace console.log with proper logging
  if (content.includes('console.log') || content.includes('console.error')) {
    // Add logger import if not present
    if (!content.includes('@/lib/monitoring')) {
      content = content.replace(
        /import React[^;]*;/,
        `import React from 'react';\nimport { logger } from '@/lib/monitoring';`
      );
    }
    
    // Replace console statements
    content = content.replace(/console\.log\(/g, 'logger.info(');
    content = content.replace(/console\.error\(/g, 'logger.error(');
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    
  }
}

// 5. Fix unconnected API endpoints
function fixUnconnectedAPIs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix hardcoded API URLs
  const apiReplacements = [
    { from: 'https://api.telnyx.com/v2/messages', to: 'process.env.TELNYX_API_URL + "/v2/messages"' },
    { from: 'https://api.openai.com/v1/models', to: 'process.env.OPENAI_API_URL + "/v1/models"' },
    { from: 'https://api.resend.com/domains', to: 'process.env.RESEND_API_URL + "/domains"' }
  ];
  
  apiReplacements.forEach(replacement => {
    if (content.includes(replacement.from)) {
      content = content.replace(new RegExp(replacement.from, 'g'), replacement.to);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    
  }
}

// Files to fix
const filesToFix = [
  'app/admin/page.tsx',
  'app/admin/apollo-killer/page.tsx',
  'app/admin/automation/page.tsx',
  'app/admin/leads/page.tsx',
  'app/account/page.tsx',
  'app/api/admin/system-health/route.ts',
  'app/error.tsx',
  'app/test-agent-simple/page.tsx'
];



filesToFix.forEach(file => {
  if (fs.existsSync(file)) {
    
    
    try {
      fixBrokenFetches(file);
      fixAlertStatements(file);
      fixHardcodedValues(file);
      fixConsoleLogs(file);
      fixUnconnectedAPIs(file);
    } catch (error) {
      
    }
  }
});







