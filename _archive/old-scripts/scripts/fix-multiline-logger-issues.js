const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing multiline logger issues...\n');

function fixMultilineLoggerIssues(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let hasChanges = false;

    // Fix multiline pattern with .replace across lines
    const multilinePattern = /error\s+instanceof\s+Error\s+\?\s*\n?\s*error\.message\.replace\([^)]+\)\s+instanceof\s+Error\s+\?\s+\{[^}]*error:\s+error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\([^)]+\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown\s+error'/gs;
    
    content = content.replace(multilinePattern, () => {
      hasChanges = true;
      return "error instanceof Error ? error.message : 'Unknown error'";
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  let totalFiles = 0;
  let updatedFiles = 0;

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const result = processDirectory(fullPath);
      totalFiles += result.totalFiles;
      updatedFiles += result.updatedFiles;
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js')) {
      totalFiles++;
      if (fixMultilineLoggerIssues(fullPath)) {
        updatedFiles++;
      }
    }
  }

  return { totalFiles, updatedFiles };
}

// Process app directory
console.log('📁 Processing app/ directory...');
const result = processDirectory('app');

console.log(`\n✅ Processed ${result.totalFiles} files`);
console.log(`✅ Updated ${result.updatedFiles} files`);

if (result.updatedFiles > 0) {
  console.log('\n📋 Multiline Logger Issues Fixed!');
} else {
  console.log('\n📋 No issues found to fix.');
}


