const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const API_ROUTES_DIR = path.join(ROOT_DIR, 'app', 'api');

// Fix common syntax patterns
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changesMade = false;

  // Fix missing commas in object literals
  content = content.replace(/(\w+):\s*(\w+)\s*(\w+):\s*(\w+)/g, '$1: $2,\n    $3: $4');
  
  // Fix missing try blocks
  content = content.replace(/(\s+const businessId = authResult\.businessId\s*\n)(\s+)(const|let|var|\/\/)/g, '$1\n$2try {\n$2  $3');
  
  // Fix missing catch blocks
  content = content.replace(/(\s+}\s*)(\n\s*return)/g, '$1\n    } catch (error) {\n      logger.error(\'Operation failed\', { error: error instanceof Error ? error.message : \'Unknown error\' })\n      return apiError(\'Operation failed\', 500)\n    }$2');
  
  // Fix malformed catch blocks
  content = content.replace(/(\s+}\s*catch\s*\(\s*error\s*\)\s*{\s*\n)(\s+logger\.error[^}]+}\s*\n)(\s+return\s+apiError[^}]+}\s*\n)(\s+}\s*)$/gm, '$1$2$3$4');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    changesMade = true;
  }
  return changesMade;
}

function traverseDirectory(dir) {
  let modifiedFilesCount = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const relativeFilePath = path.relative(ROOT_DIR, filePath);

    if (fs.statSync(filePath).isDirectory()) {
      modifiedFilesCount += traverseDirectory(filePath);
    } else if (filePath.endsWith('.ts') && !filePath.includes('node_modules')) {
      if (fixFile(filePath)) {
        modifiedFilesCount++;
        console.log(`✅ Fixed: ${relativeFilePath}`);
      }
    }
  }
  return modifiedFilesCount;
}

console.log('🔧 Fixing remaining syntax errors...\n');
const totalModified = traverseDirectory(API_ROUTES_DIR);
console.log(`\n✅ Fixed ${totalModified} files`);














