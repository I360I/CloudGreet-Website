const fs = require('fs');
const path = require('path');

// Find all admin API routes
const adminRoutesDir = path.join(__dirname, '../app/api/admin');
const files = [];

function findFiles(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findFiles(fullPath);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
}

findFiles(adminRoutesDir);

console.log(`Found ${files.length} admin files to fix`);

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove duplicate requireAdmin imports
    const lines = content.split('\n');
    const newLines = [];
    let hasRequireAdmin = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('import { requireAdmin }')) {
        if (!hasRequireAdmin) {
          newLines.push(line);
          hasRequireAdmin = true;
        }
        // Skip duplicate imports
      } else {
        newLines.push(line);
      }
    }
    
    if (newLines.length !== lines.length) {
      content = newLines.join('\n');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed duplicates: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log('Duplicate import fixes completed');

