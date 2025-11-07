const fs = require('fs');
const path = require('path');

// Find all TypeScript files
const files = [];

function findFiles(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findFiles(fullPath);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
}

findFiles(path.join(__dirname, '../app/api'));

console.log(`Found ${files.length} API files to fix`);

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix logger.error calls with unknown error types
    if (content.includes('logger.error(') && content.includes('{ error }')) {
      content = content.replace(
        /logger\.error\(([^,]+),\s*\{\s*error\s*\}\s*\)/g,
        'logger.error($1, { error: error instanceof Error ? error.message : \'Unknown error\' })'
      );
      modified = true;
    }

    // Fix logger.error calls with unknown error types (alternative pattern)
    if (content.includes('logger.error(') && content.includes('error: error')) {
      content = content.replace(
        /logger\.error\(([^,]+),\s*\{\s*error:\s*error\s*\}\s*\)/g,
        'logger.error($1, { error: error instanceof Error ? error.message : \'Unknown error\' })'
      );
      modified = true;
    }

    // Fix matchAll iterations
    if (content.includes('.matchAll(') && content.includes('for (const')) {
      content = content.replace(
        /const\s+(\w+)\s*=\s*([^;]+)\.matchAll\(([^)]+)\);?\s*for\s*\(\s*const\s+\w+\s+of\s+\1\s*\)/g,
        'const $1 = Array.from($2.matchAll($3));\n        for (const match of $1)'
      );
      modified = true;
    }

    // Add missing requireAdmin imports for admin routes
    if (filePath.includes('/admin/') && content.includes('requireAdmin(') && !content.includes("import { requireAdmin }")) {
      const importMatch = content.match(/import.*from.*['"]@\/lib\/api-response['"]/);
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          importMatch[0] + '\nimport { requireAdmin } from \'@/lib/admin-auth\''
        );
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log('TypeScript strict mode fixes completed');

