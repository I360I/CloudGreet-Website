// COMPREHENSIVE SYNTAX ERROR FIXER
const fs = require('fs');
const path = require('path');

function fixSyntaxErrorsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    let fixes = [];
    
    // Pattern 1: logger.error with missing closing parenthesis
    // logger.error('message', { ... }
    const pattern1 = /logger\.error\(([^,]+),\s*(\{[^}]*\})\s*$/gm;
    content = content.replace(pattern1, (match, message, obj) => {
      hasChanges = true;
      fixes.push(`Fixed missing closing parenthesis: ${message}`);
      return `logger.error(${message}, ${obj})`;
    });
    
    // Pattern 2: logger.error with "error as Error" type assertion
    const pattern2 = /logger\.error\(([^,]+),\s*\{\s*error:\s*([^,]+)\s+as\s+Error,([^}]*)\}/g;
    content = content.replace(pattern2, (match, message, errorVar, rest) => {
      hasChanges = true;
      fixes.push(`Fixed error type assertion: ${message}`);
      return `logger.error(${message}, { error: ${errorVar} instanceof Error ? ${errorVar}.message : 'Unknown error',${rest}})`;
    });
    
    // Pattern 3: Multi-line logger.error with missing closing parenthesis
    const pattern3 = /logger\.error\(([^,]+),\s*(\{[^}]*)\s*$/gm;
    content = content.replace(pattern3, (match, message, obj) => {
      hasChanges = true;
      fixes.push(`Fixed multi-line missing parenthesis: ${message}`);
      return `logger.error(${message}, ${obj})`;
    });
    
    // Pattern 4: Missing closing parenthesis in general function calls
    const pattern4 = /(\w+)\(([^)]*)\s*$/gm;
    content = content.replace(pattern4, (match, funcName, args) => {
      if (funcName === 'logger.error' && args.includes('{') && !args.includes('}')) {
        hasChanges = true;
        fixes.push(`Fixed general missing parenthesis: ${funcName}`);
        return `${funcName}(${args})`;
      }
      return match;
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${fixes.length} syntax errors in: ${filePath}`);
      fixes.forEach(fix => console.log(`   - ${fix}`));
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
  let totalFiles = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      const result = findAndFixFiles(filePath);
      fixedCount += result.fixedCount;
      totalFiles += result.totalFiles;
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      totalFiles++;
      if (fixSyntaxErrorsInFile(filePath)) {
        fixedCount++;
      }
    }
  }
  
  return { fixedCount, totalFiles };
}

console.log('🔧 COMPREHENSIVE SYNTAX ERROR FIX');
console.log('=====================================');
console.log('Scanning all TypeScript and JavaScript files...');

const result = findAndFixFiles('app');
console.log(`\n📊 RESULTS:`);
console.log(`   Files processed: ${result.totalFiles}`);
console.log(`   Files with fixes: ${result.fixedCount}`);
console.log(`   Files unchanged: ${result.totalFiles - result.fixedCount}`);

if (result.fixedCount > 0) {
  console.log(`\n✅ Fixed syntax errors in ${result.fixedCount} files`);
  console.log('🎯 Ready for build verification...');
} else {
  console.log('\n✅ No syntax errors found!');
}
