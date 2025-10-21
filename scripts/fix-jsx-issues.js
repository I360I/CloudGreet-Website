const fs = require('fs');
const path = require('path');

// List of problematic files
const files = [
  'app/contexts/ToastContext.tsx',
  'app/account/page.tsx',
  'app/admin/apollo-killer/page.tsx',
  'app/admin/automation/page.tsx',
  'app/admin/leads/page.tsx'
];

console.log('🔧 Fixing JSX parsing issues...');

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove any BOM or invisible characters
    content = content.replace(/^\uFEFF/, '');
    
    // Ensure proper line endings
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Check if the file has proper React import
    if (!content.includes('import React') && !content.includes('import { React }')) {
      // Add React import if missing
      if (content.includes("'use client'")) {
        content = content.replace(
          "'use client'\n\n",
          "'use client'\n\nimport React from 'react'\n"
        );
      } else {
        content = "import React from 'react'\n" + content;
      }
    }
    
    // Write back the cleaned content
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Fixed ${file}`);
    
  } catch (error) {
    console.log(`❌ Error fixing ${file}: ${error.message}`);
  }
});

console.log('🎉 JSX fixes completed!');
