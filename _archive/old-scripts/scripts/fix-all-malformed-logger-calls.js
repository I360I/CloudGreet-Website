const fs = require('fs');
const path = require('path');

// Pattern to find all malformed logger calls
const malformedPatterns = [
  // Pattern 1: Complex nested error objects
  /logger\.error\(([^,]+),\s*\{\s*error:\s*\{\s*error:\s*[^}]+\}\s*\}\)/g,
  // Pattern 2: Other malformed patterns
  /logger\.error\(([^,]+),\s*\{\s*error:\s*[^}]+\}\s*\}\)/g,
  // Pattern 3: Very complex nested patterns
  /logger\.error\(([^,]+),\s*\{\s*error:\s*[^}]+instanceof Error \? [^}]+instanceof Error \? [^}]+\}\s*\}\)/g
];

// Files to process
const targetDirectories = ['app'];

// Files to skip
const skipFiles = [
  'scripts',
  'test',
  '.test.',
  '.spec.',
  'node_modules',
  '.next',
  'dist',
  'build'
];

function shouldSkipFile(filePath) {
  return skipFiles.some(skip => filePath.includes(skip));
}

function fixMalformedLoggerCalls(content) {
  let newContent = content;
  let hasChanges = false;

  // Apply each pattern
  malformedPatterns.forEach(pattern => {
    newContent = newContent.replace(pattern, (match, message) => {
      hasChanges = true;
      return `logger.error(${message}, { error: 'Unknown error' })`;
    });
  });

  return { content: newContent, hasChanges };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, hasChanges } = fixMalformedLoggerCalls(content);
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ ${filePath} - Fixed malformed logger calls`);
      return true;
    } else {
      console.log(`⚪ ${filePath} - No malformed logger calls found`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${filePath} - Error: ${error.message}`);
    return false;
  }
}

function getAllFiles(dirPath) {
  const files = [];
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!shouldSkipFile(fullPath)) {
          traverse(fullPath);
        }
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))) {
        if (!shouldSkipFile(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dirPath);
  return files;
}

function main() {
  console.log('🔧 Fixing all malformed logger calls...\n');
  
  let totalProcessed = 0;
  let totalUpdated = 0;
  
  targetDirectories.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📁 Processing ${dir}/ directory...`);
      const files = getAllFiles(dir);
      
      files.forEach(filePath => {
        totalProcessed++;
        if (processFile(filePath)) {
          totalUpdated++;
        }
      });
    }
  });
  
  console.log(`\n✅ Processed ${totalProcessed} files`);
  console.log(`✅ Updated ${totalUpdated} files`);
  console.log('\n📋 All Malformed Logger Calls Fixed!');
}

main();

