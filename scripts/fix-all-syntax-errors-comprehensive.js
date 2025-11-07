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

// Fix comprehensive syntax errors
function fixSyntaxErrors(content) {
  let fixed = content;
  let changes = 0;

  // Fix malformed destructuring assignments
  fixed = fixed.replace(/(\w+)\s*=\s*(\w+)\s*\{\s*([^}]+)\s*\}\s*catch\s*\([^)]*\)\s*\{[^}]*\}\s*=\s*\2/g, (match, var1, var2, destructure) => {
    changes++;
    return `${var1} = ${var2} { ${destructure} }`;
  });

  // Fix malformed object destructuring with catch blocks
  fixed = fixed.replace(/\{\s*([^}]+)\s*\}\s*catch\s*\([^)]*\)\s*\{[^}]*\}\s*=\s*(\w+)/g, (match, destructure, varName) => {
    changes++;
    return `{ ${destructure} } = ${varName}`;
  });

  // Fix malformed try-catch blocks
  fixed = fixed.replace(/(\w+)\s*\{\s*([^}]+)\s*\}\s*catch\s*\([^)]*\)\s*\{[^}]*\}\s*=\s*(\w+)/g, (match, keyword, content, varName) => {
    changes++;
    return `${keyword} { ${content} } = ${varName}`;
  });

  // Fix malformed string literals
  fixed = fixed.replace(/`([^`]*)\s*catch\s*\([^)]*\)\s*\{[^}]*\}\s*([^`]*)`/g, (match, part1, part2) => {
    changes++;
    return `\`${part1}${part2}\``;
  });

  // Fix malformed object properties
  fixed = fixed.replace(/(\w+):\s*([^,}]+),\s*(\w+):\s*([^,}]+)/g, (match, key1, val1, key2, val2) => {
    if (val1.includes('catch') || val2.includes('catch')) {
      changes++;
      return `${key1}: ${val1},\n  ${key2}: ${val2}`;
    }
    return match;
  });

  // Fix malformed function calls
  fixed = fixed.replace(/(\w+)\s*\(\s*([^)]*),\s*(\w+):\s*([^)]*)\s*\)/g, (match, func, args1, key, val) => {
    if (args1.includes('catch') || val.includes('catch')) {
      changes++;
      return `${func}(\n  ${args1},\n  ${key}: ${val}\n)`;
    }
    return match;
  });

  // Fix malformed JSON.stringify calls
  fixed = fixed.replace(/JSON\.stringify\(\s*\{\s*,\s*(\w+):\s*([^}]+)\s*\}\s*\)/g, (match, key, val) => {
    changes++;
    return `JSON.stringify({\n  ${key}: ${val}\n})`;
  });

  // Fix malformed variable declarations
  fixed = fixed.replace(/(\w+):\s*(\w+):\s*(\w+)/g, (match, var1, var2, var3) => {
    changes++;
    return `${var1}: ${var2}`;
  });

  // Fix malformed try blocks
  fixed = fixed.replace(/\}\s*try\s*\{/g, (match) => {
    changes++;
    return `} catch (error) {\n    logger.error('Error:', error);\n    throw error;\n  }\n  try {`;
  });

  // Fix missing try blocks before catch
  fixed = fixed.replace(/(\s+)(catch\s*\([^)]*\)\s*\{)/g, (match, indent, catchBlock) => {
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
    return `${match}\n${indent}catch (error) {\n${indent}  logger.error('Error:', error);\n${indent}  throw error;\n${indent}}`;
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
