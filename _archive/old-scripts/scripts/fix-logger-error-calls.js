const fs = require('fs');
const path = require('path');

// Pattern to find logger.error calls with raw error parameters
const loggerErrorPattern = /logger\.error\(([^,]+),\s*([^)]+)\)/g;

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

function fixLoggerErrorCalls(content) {
  let newContent = content;
  let hasChanges = false;

  // Replace logger.error calls with proper context
  newContent = newContent.replace(loggerErrorPattern, (match, message, errorParam) => {
    hasChanges = true;
    return `logger.error(${message}, { error: ${errorParam} instanceof Error ? ${errorParam}.message : 'Unknown error' })`;
  });

  return { content: newContent, hasChanges };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, hasChanges } = fixLoggerErrorCalls(content);
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ ${filePath} - Fixed logger error calls`);
      return true;
    } else {
      console.log(`⚪ ${filePath} - No logger error calls to fix`);
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
  console.log('🔧 Fixing logger error calls...\n');
  
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
  console.log('\n📋 Logger Error Calls Fixed!');
  console.log('\n📋 Benefits:');
  console.log('- Proper TypeScript error handling');
  console.log('- Consistent logger usage');
  console.log('- Better error context');
  console.log('- Type-safe logging');
}

main();

