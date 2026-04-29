const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing specific malformed logger calls...\n');

function fixSpecificLoggerCalls(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;

    // Fix the specific pattern: error.message.replace(/[<>]/g, '' instanceof Error ? { error: error instanceof Error ? error.message.replace(/[<>]/g, ''.message : 'Unknown error' }) : 'Unknown error'
    const specificPattern = /error\.message\.replace\(\/\[<>\]\/g,\s*''\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'/g;
    
    newContent = newContent.replace(specificPattern, () => {
      hasChanges = true;
      return "error instanceof Error ? error.message : 'Unknown error'";
    });

    // Fix another variation with different spacing
    const specificPattern2 = /error\.message\.replace\(\/\[<>\]\/g,\s*''\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'/g;
    
    newContent = newContent.replace(specificPattern2, () => {
      hasChanges = true;
      return "error instanceof Error ? error.message : 'Unknown error'";
    });

    // Fix single line version
    const singleLinePattern = /logger\.error\('([^']+)',\s*\{\s*error:\s*\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\s+instanceof\s+Error\s+\?\s+\{\s*error:\s*error\s+instanceof\s+Error\s+\?\s+error\.message\.replace\(\/\[<>\]\/g,\s*''\)\.message\s+:\s+'Unknown error'\s+\}\s+:\s+'Unknown error'([^}]*)\}\s*\}\)/g;
    
    newContent = newContent.replace(singleLinePattern, (match, message, extra) => {
      hasChanges = true;
      return `logger.error('${message}', { error: error instanceof Error ? error.message : 'Unknown error'${extra} })`;
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed specific logger calls in ${filePath}`);
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
      if (fixSpecificLoggerCalls(fullPath)) {
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
  console.log('\n📋 Specific Logger Calls Fixed!');
} else {
  console.log('\n📋 No specific logger calls found to fix.');
}

