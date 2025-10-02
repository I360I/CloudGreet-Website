// AGGRESSIVE SCRIPT TO FIX ALL 75 LOGGER.ERROR SYNTAX ERRORS
const fs = require('fs');
const path = require('path');

function fixAllLoggerErrors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fixes = [];
    
    // Pattern 1: Fix missing closing parenthesis in logger.error calls
    // logger.error('message', { ... }
    const pattern1 = /logger\.error\(([^,]+),\s*(\{[^}]*\})\s*$/gm;
    content = content.replace(pattern1, (match, message, obj) => {
      fixes.push(`Fixed missing closing parenthesis: ${message.trim()}`);
      return `logger.error(${message}, ${obj})`;
    });
    
    // Pattern 2: Fix "error as Error" type assertions
    const pattern2 = /logger\.error\(([^,]+),\s*\{\s*error:\s*([^,]+)\s+as\s+Error,([^}]*)\}/g;
    content = content.replace(pattern2, (match, message, errorVar, rest) => {
      fixes.push(`Fixed error type assertion: ${message.trim()}`);
      return `logger.error(${message}, { error: ${errorVar} instanceof Error ? ${errorVar}.message : 'Unknown error',${rest}})`;
    });
    
    // Pattern 3: Fix multi-line logger.error with missing closing parenthesis
    const pattern3 = /logger\.error\(([^,]+),\s*(\{[^}]*)\s*$/gm;
    content = content.replace(pattern3, (match, message, obj) => {
      fixes.push(`Fixed multi-line missing parenthesis: ${message.trim()}`);
      return `logger.error(${message}, ${obj})`;
    });
    
    // Pattern 4: Fix logger.error with missing closing parenthesis and semicolon
    const pattern4 = /logger\.error\(([^,]+),\s*(\{[^}]*)\s*$/gm;
    content = content.replace(pattern4, (match, message, obj) => {
      fixes.push(`Fixed missing parenthesis: ${message.trim()}`);
      return `logger.error(${message}, ${obj})`;
    });
    
    // Pattern 5: Fix logger.error with extra closing parenthesis
    const pattern5 = /logger\.error\(([^,]+),\s*(\{[^}]*\})\s*\)\)/g;
    content = content.replace(pattern5, (match, message, obj) => {
      fixes.push(`Fixed extra closing parenthesis: ${message.trim()}`);
      return `logger.error(${message}, ${obj})`;
    });
    
    // Pattern 6: Fix logger.error with missing closing parenthesis after multi-line objects
    const pattern6 = /logger\.error\(([^,]+),\s*(\{[^}]*)\s*$/gm;
    content = content.replace(pattern6, (match, message, obj) => {
      fixes.push(`Fixed multi-line object: ${message.trim()}`);
      return `logger.error(${message}, ${obj})`;
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${fixes.length} syntax errors in: ${filePath}`);
      fixes.forEach(fix => console.log(`   - ${fix}`));
      return fixes.length;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function findAndFixAllFiles(dir) {
  const files = fs.readdirSync(dir);
  let totalFixes = 0;
  let filesFixed = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      const result = findAndFixAllFiles(filePath);
      totalFixes += result.totalFixes;
      filesFixed += result.filesFixed;
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const fixes = fixAllLoggerErrors(filePath);
      if (fixes > 0) {
        totalFixes += fixes;
        filesFixed++;
      }
    }
  }
  
  return { totalFixes, filesFixed };
}

console.log('🔧 AGGRESSIVE SYNTAX ERROR FIXER');
console.log('==================================');
console.log('Fixing ALL 75 logger.error syntax errors...');

const result = findAndFixAllFiles('app');
console.log(`\n📊 FINAL RESULTS:`);
console.log(`   Total syntax errors fixed: ${result.totalFixes}`);
console.log(`   Files modified: ${result.filesFixed}`);

if (result.totalFixes > 0) {
  console.log(`\n✅ SUCCESS: Fixed ${result.totalFixes} syntax errors across ${result.filesFixed} files`);
  console.log('🎯 Ready for build verification...');
} else {
  console.log('\n✅ No syntax errors found!');
}
