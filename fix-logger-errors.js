// Fix logger.error calls that have 3 arguments instead of 2
const fs = require('fs');
const path = require('path');

function fixLoggerErrors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern to match logger.error calls with 3 arguments
    const regex = /logger\.error\(([^,]+),\s*([^,]+),\s*(\{[^}]*\})\)/g;
    
    let hasChanges = false;
    const newContent = content.replace(regex, (match, message, error, context) => {
      hasChanges = true;
      // Convert to 2-argument format
      return `logger.error(${message}, ${context.replace(/\{/, '{ error: ' + error + ', ')}`;
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed logger errors in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findAndFixFiles(dir) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixedCount += findAndFixFiles(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      if (fixLoggerErrors(filePath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

// Fix all TypeScript/JavaScript files
const fixedCount = findAndFixFiles('app');
console.log(`\nFixed logger errors in ${fixedCount} files`);
