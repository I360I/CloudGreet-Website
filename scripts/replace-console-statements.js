const fs = require('fs');
const path = require('path');

// Console statement mappings
const consoleMappings = {
  'console.log': 'logger.info',
  'console.error': 'logger.error', 
  'console.warn': 'logger.warn',
  'console.debug': 'logger.debug'
};

// Files to process (excluding scripts and test files)
const targetDirectories = ['lib', 'app'];

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

function addLoggerImport(content, filePath) {
  // Check if logger is already imported
  if (content.includes("import { logger }") || content.includes("from '@/lib/monitoring'")) {
    return content;
  }

  // Determine the import path based on file location
  let importPath = '@/lib/monitoring';
  if (filePath.includes('/lib/')) {
    importPath = './monitoring';
  }

  // Add import at the top
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find the last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith('const ') && lines[i].includes('require(')) {
      insertIndex = i + 1;
    }
  }
  
  lines.splice(insertIndex, 0, `import { logger } from '${importPath}'`);
  return lines.join('\n');
}

function replaceConsoleStatements(content, filePath) {
  let newContent = content;
  let hasChanges = false;

  // Replace console statements
  Object.entries(consoleMappings).forEach(([consoleMethod, loggerMethod]) => {
    const regex = new RegExp(`\\b${consoleMethod}\\b`, 'g');
    const matches = [...content.matchAll(regex)];
    
    if (matches.length > 0) {
      newContent = newContent.replace(regex, loggerMethod);
      hasChanges = true;
    }
  });

  // Add logger import if changes were made
  if (hasChanges) {
    newContent = addLoggerImport(newContent, filePath);
  }

  return { content: newContent, hasChanges };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, hasChanges } = replaceConsoleStatements(content, filePath);
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ ${filePath} - Replaced console statements`);
      return true;
    } else {
      console.log(`⚪ ${filePath} - No console statements found`);
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
  console.log('🔧 Replacing console statements with logger calls...\n');
  
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
  console.log('\n📋 Console Statement Replacement Complete!');
  console.log('\n📋 Benefits:');
  console.log('- Centralized logging through logger utility');
  console.log('- Consistent log formatting across the app');
  console.log('- Better log levels (info, warn, error, debug)');
  console.log('- Structured logging with context');
  console.log('- Production-ready logging system');
  console.log('\n⚠️  Note: Test the application to ensure logging works correctly');
}

main();

