const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing logger calls with missing closing braces...\n');

function fixMissingBraces(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let hasChanges = false;

    // Fix pattern: logger.error('msg', { error: { ... })  - missing closing brace
    content = content.replace(
      /logger\.(error|warn|info)\('([^']+)',\s*\{\s*error:\s*\{\s*([^}]+)\s*\}\)/gs,
      (match, level, message, context) => {
        hasChanges = true;
        // Check if context already has proper closing
        if (context.includes('}')) {
          return match; // Already has closing brace
        }
        return `logger.${level}('${message}', { ${context.trim()} })`;
      }
    );

    // Fix pattern: { error: { something }) - missing closing brace before )
    content = content.replace(
      /\{\s*error:\s*\{\s*([^}]+?)\s*\}\)/g,
      (match, context) => {
        hasChanges = true;
        // Count braces
        const openBraces = (match.match(/\{/g) || []).length;
        const closeBraces = (match.match(/\}/g) || []).length;
        
        if (openBraces > closeBraces) {
          return `{ ${context.trim()} })`;
        }
        return match;
      }
    );

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  let totalFiles = 0;
  let updatedFiles = 0;

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const result = processDirectory(fullPath);
      totalFiles += result.totalFiles;
      updatedFiles += result.updatedFiles;
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js')) {
      totalFiles++;
      if (fixMissingBraces(fullPath)) {
        updatedFiles++;
      }
    }
  }

  return { totalFiles, updatedFiles };
}

// Process app directory
console.log('📁 Processing app/ directory...');
const result = processDirectory('app');

console.log(`\n✅ Processed ${result.totalFiles} files`);
console.log(`✅ Updated ${result.updatedFiles} files`);

if (result.updatedFiles > 0) {
  console.log('\n📋 Missing Braces Fixed!');
} else {
  console.log('\n📋 No issues found to fix.');
}


