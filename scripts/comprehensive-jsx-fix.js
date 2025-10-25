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



files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove any BOM or invisible characters
    content = content.replace(/^\uFEFF/, '');
    
    // Ensure proper line endings
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Fix any remaining motion references
    content = content.replace(/<motion\./g, '<');
    content = content.replace(/<\/motion\./g, '</');
    
    // Ensure React import is present
    if (!content.includes('import React') && !content.includes('import { React }')) {
      if (content.includes("'use client'")) {
        content = content.replace(
          "'use client'\n\n",
          "'use client'\n\nimport React from 'react'\n"
        );
      } else {
        content = "import React from 'react'\n" + content;
      }
    }
    
    // Check for proper function declarations
    // If the file doesn't have a proper export default function, add it
    if (!content.includes('export default function') && !content.includes('export default')) {
      // This is likely a component file, let's ensure it has proper structure
      if (content.includes('return (') && !content.includes('export default')) {
        // Find the function that contains the return statement
        const lines = content.split('\n');
        let functionStart = -1;
        let returnIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('return (')) {
            returnIndex = i;
            // Look backwards for function declaration
            for (let j = i; j >= 0; j--) {
              if (lines[j].includes('function ') || lines[j].includes('= () =>')) {
                functionStart = j;
                break;
              }
            }
            break;
          }
        }
        
        if (functionStart !== -1 && returnIndex !== -1) {
          // Add export default before the function
          const functionLine = lines[functionStart];
          if (functionLine.includes('function ')) {
            lines[functionStart] = functionLine.replace('function ', 'export default function ');
          }
          content = lines.join('\n');
        }
      }
    }
    
    // Write back the cleaned content
    fs.writeFileSync(file, content, 'utf8');
    
    
  } catch (error) {
    
  }
});


