// Comprehensive script to fix ALL import path issues
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

function fixImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Calculate the correct relative path to lib directory
    const relativePath = path.relative(path.dirname(filePath), path.join(process.cwd(), 'lib'));
    const libPath = relativePath.replace(/\\/g, '/');

    // Fix all incorrect import paths
    const replacements = [
      // Fix various incorrect lib imports
      [/from ['\"]\.\.\/\.\.\/\.\.\/\.\.\/lib\//g, `from '${libPath}/`],
      [/from ['\"]\.\.\/\.\.\/\.\.\/lib\//g, `from '${libPath}/`],
      [/from ['\"]\.\.\/\.\.\/lib\//g, `from '${libPath}/`],
      [/from ['\"]\.\.\/lib\//g, `from '${libPath}/`],
      [/from ['\"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib\//g, `from '${libPath}/`],
    ];

    replacements.forEach(([pattern, replacement]) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed imports in: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

console.log('🔧 Fixing ALL import paths in the entire app directory...\n');

const tsFiles = findTsFiles(path.join(process.cwd(), 'app'));
let fixedCount = 0;

tsFiles.forEach(filePath => {
  if (fixImports(filePath)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Import path fixes completed! Fixed ${fixedCount} files.`);
