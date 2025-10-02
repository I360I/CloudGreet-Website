// Comprehensive script to fix ALL logger.error syntax errors
const fs = require('fs');
const path = require('path');

function fixLoggerErrorsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Pattern 1: logger.error with missing closing parenthesis
    // logger.error('message', { ... }
    const pattern1 = /logger\.error\(([^,]+),\s*(\{[^}]*\})\s*$/gm;
    content = content.replace(pattern1, (match, message, obj) => {
      hasChanges = true;
      return `logger.error(${message}, ${obj})`;
    });
    
    // Pattern 2: logger.error with error as Error type
    // logger.error('message', { error: error as Error, ... }
    const pattern2 = /logger\.error\(([^,]+),\s*\{\s*error:\s*([^,]+)\s+as\s+Error,([^}]*)\}/g;
    content = content.replace(pattern2, (match, message, errorVar, rest) => {
      hasChanges = true;
      return `logger.error(${message}, { error: ${errorVar} instanceof Error ? ${errorVar}.message : 'Unknown error',${rest}})`;
    });
    
    // Pattern 3: Multi-line logger.error with missing closing parenthesis
    const pattern3 = /logger\.error\(([^,]+),\s*(\{[^}]*)\s*$/gm;
    content = content.replace(pattern3, (match, message, obj) => {
      hasChanges = true;
      return `logger.error(${message}, ${obj})`;
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed logger errors in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findAndFixFiles(dir) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      fixedCount += findAndFixFiles(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      if (fixLoggerErrorsInFile(filePath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

console.log('🔧 Fixing ALL logger.error syntax errors...');
const fixedCount = findAndFixFiles('app');
console.log(`\n✅ Fixed logger errors in ${fixedCount} files`);
console.log('🎯 All syntax errors should now be resolved!');
