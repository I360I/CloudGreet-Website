// Script to find and fix all unterminated string constants
const fs = require('fs');
const path = require('path');

// Find all TypeScript files in the app directory
function findTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixUnterminatedStrings(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix unterminated strings - look for imports with missing closing quotes
    const unterminatedPattern = /from ['"][^'"]*$/gm;
    const matches = content.match(unterminatedPattern);
    
    if (matches) {
      console.log(`Found unterminated strings in: ${path.relative(process.cwd(), filePath)}`);
      matches.forEach(match => {
        console.log(`  - ${match}`);
      });
      
      // Fix the most common pattern: missing closing quote
      content = content.replace(/from ['"]([^'"]*)$/gm, (match, path) => {
        // Determine if it should be single or double quote based on the opening quote
        const openingQuote = match.includes("'") ? "'" : '"';
        return `from ${openingQuote}${path}${openingQuote}`;
      });
      
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed unterminated strings in: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

console.log('🔧 Finding and fixing unterminated string constants...\n');

const tsFiles = findTsFiles(path.join(process.cwd(), 'app'));
let fixedCount = 0;

tsFiles.forEach(filePath => {
  if (fixUnterminatedStrings(filePath)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Unterminated string fixes completed! Fixed ${fixedCount} files.`);
