const fs = require('fs');
const path = require('path');

console.log('🔧 Final cleanup of logger issues...\n');

function finalCleanup(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let hasChanges = false;

    // Fix pattern: } instanceof Error ? { ... }.message : 'Unknown error' })
    content = content.replace(
      /\}\s+instanceof\s+Error\s+\?\s+\{[^}]+\}\.message\s+:\s+'Unknown error'\s+\}\)/gs,
      () => {
        hasChanges = true;
        return "})";
      }
    );

    // Fix pattern: logger.error('msg', { error: ... } instanceof Error ? { ... }.message : 'Unknown error' })
    content = content.replace(
      /logger\.(error|warn|info)\('([^']+)',\s*\{([^}]+)\}\s+instanceof\s+Error\s+\?\s+\{[^}]+\}\.message\s+:\s+'Unknown error'\s+\)/gs,
      (match, level, message, context) => {
        hasChanges = true;
        return `logger.${level}('${message}', {${context}})`;
      }
    );

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Cleaned up ${path.relative(process.cwd(), filePath)}`);
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
      if (finalCleanup(fullPath)) {
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
  console.log('\n📋 Final Cleanup Complete!');
} else {
  console.log('\n📋 No issues found to fix.');
}


