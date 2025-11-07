const fs = require('fs');
const path = require('path');

// Pattern to find malformed logger.error calls
const malformedPattern = /logger\.error\(([^,]+),\s*\{\s*error:\s*\{\s*error:\s*[^}]+\}\s*\}\)/g;

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

  // Fix malformed logger.error calls
  newContent = newContent.replace(malformedPattern, (match, message) => {
    hasChanges = true;
    return `logger.error(${message}, { error: 'Unknown error' })`;
  });

  // Also fix any other malformed patterns
  const complexPattern = /logger\.error\(([^,]+),\s*\{\s*error:\s*[^}]+\}\s*\}\)/g;
  newContent = newContent.replace(complexPattern, (match, message) => {
    hasChanges = true;
    return `logger.error(${message}, { error: 'Unknown error' })`;
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
  console.log('🔧 Fixing malformed logger calls...\n');
  
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
  console.log('\n📋 Malformed Logger Calls Fixed!');
}

main();

