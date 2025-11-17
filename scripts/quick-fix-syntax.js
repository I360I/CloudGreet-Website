const fs = require('fs');
const path = require('path');

// Common syntax fixes
const fixes = [
  // Fix interface with trailing comma
  {
    pattern: /interface\s+(\w+)\s*\{\s*([^}]+),\s*\}/g,
    replacement: 'interface $1 {\n  $2\n}'
  },
  // Fix malformed catch blocks
  {
    pattern: /\s+catch\s*\(\s*error\s*\)\s*\{[\s\S]*?\}/g,
    replacement: ''
  },
  // Fix trailing commas in object literals
  {
    pattern: /,\s*}/g,
    replacement: '\n}'
  },
  // Fix malformed try-catch
  {
    pattern: /try\s*\{[\s\S]*?\}\s*\)\s*}/g,
    replacement: (match) => {
      const tryContent = match.match(/try\s*\{([\s\S]*?)\}\s*\)\s*}/)[1];
      return `try {\n${tryContent}\n} catch (error) {\n  console.error('Error:', error);\n}`
    }
  }
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    fixes.forEach(fix => {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

// Fix the specific files with errors
const filesToFix = [
  'app/components/account/ProfileTab.tsx',
  'app/components/account/SecurityTab.tsx',
  'app/admin/code-quality/page.tsx',
  'app/admin/layout.tsx',
  'app/admin/manual-tests/page.tsx'
];

filesToFix.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    fixFile(fullPath);
  }
});

console.log('Quick syntax fixes applied!');














