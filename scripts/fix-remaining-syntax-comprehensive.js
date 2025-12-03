const fs = require('fs');
const path = require('path');

// Get all TypeScript files
function getAllTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix common syntax errors
function fixSyntaxErrors(content) {
  let fixed = content;
  let changes = 0;

  // Fix missing try blocks before catch
  fixed = fixed.replace(/(\s+)(catch\s*\([^)]*\)\s*\{)/g, (match, indent, catchBlock) => {
    // Check if there's a try block before this catch
    const beforeCatch = fixed.substring(0, fixed.indexOf(match));
    const lastTryIndex = beforeCatch.lastIndexOf('try {');
    const lastCatchIndex = beforeCatch.lastIndexOf('catch');
    
    if (lastTryIndex > lastCatchIndex) {
      return match; // Already has try block
    }
    
    changes++;
    return `${indent}try {\n${indent}  // TODO: Add proper error handling\n${indent}} ${catchBlock}`;
  });

  // Fix missing catch blocks after try
  fixed = fixed.replace(/(\s+)try\s*\{[^}]*\}(?!\s*catch)/g, (match, indent) => {
    changes++;
    return `${match}\n${indent}catch (error) {\n${indent}  console.error('Error:', error);\n${indent}  throw error;\n${indent}}`;
  });

  // Fix missing commas in object literals
  fixed = fixed.replace(/(\w+)\s*:\s*([^,}]+)\s*\n\s*(\w+)\s*:/g, '$1: $2,\n  $3:');
  
  // Fix missing commas in function parameters
  fixed = fixed.replace(/(\w+)\s*:\s*([^,)]+)\s*\n\s*(\w+)\s*:/g, '$1: $2,\n  $3:');

  // Fix missing semicolons
  fixed = fixed.replace(/(\w+)\s*\n\s*(\w+)/g, (match, p1, p2) => {
    if (p1.includes('return') || p1.includes('throw') || p1.includes('break') || p1.includes('continue')) {
      return `${p1};\n  ${p2}`;
    }
    return match;
  });

  // Fix malformed object destructuring
  fixed = fixed.replace(/\{\s*(\w+)\s*,\s*(\w+)\s*\}\s*=\s*([^;]+);/g, '{ $1, $2 } = $3;');

  // Fix missing closing braces
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    const missingBraces = openBraces - closeBraces;
    fixed += '\n' + '}'.repeat(missingBraces);
    changes += missingBraces;
  }

  // Fix missing closing parentheses
  const openParens = (fixed.match(/\(/g) || []).length;
  const closeParens = (fixed.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    const missingParens = openParens - closeParens;
    fixed += ')'.repeat(missingParens);
    changes += missingParens;
  }

  // Fix missing closing brackets
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    const missingBrackets = openBrackets - closeBrackets;
    fixed += ']'.repeat(missingBrackets);
    changes += missingBrackets;
  }

  return { content: fixed, changes };
}

// Main execution
const srcDir = path.join(process.cwd(), 'app');
const files = getAllTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files to check...`);

let totalFiles = 0;
let totalChanges = 0;

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const result = fixSyntaxErrors(content);
    
    if (result.changes > 0) {
      fs.writeFileSync(file, result.content);
      console.log(`Fixed ${result.changes} issues in ${path.relative(process.cwd(), file)}`);
      totalFiles++;
      totalChanges += result.changes;
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
}

console.log(`\nFixed ${totalChanges} syntax issues across ${totalFiles} files.`);















