const fs = require('fs');
const path = require('path');

// Find all admin API routes
const adminRoutesDir = path.join(__dirname, '../app/api/admin');
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

findFiles(adminRoutesDir);

console.log(`Found ${files.length} admin files to fix`);

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Add requireAdmin import if missing
    if (content.includes('requireAdmin(') && !content.includes("import { requireAdmin }")) {
      const importMatch = content.match(/import.*from.*['"]@\/lib\/api-response['"]/);
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          importMatch[0] + '\nimport { requireAdmin } from \'@/lib/admin-auth\''
        );
        modified = true;
      }
    }

    // Fix authResult.success to authResult.error
    if (content.includes('authResult.success')) {
      content = content.replace(
        /if\s*\(\s*!authResult\.success\s*\)\s*\{[\s\S]*?return\s+apiError\([^)]+\)[\s\S]*?\}/g,
        'if (authResult.error) {\n      return authResult.response\n    }'
      );
      modified = true;
    }

    // Remove businessId references from admin routes
    if (content.includes('authResult.businessId')) {
      content = content.replace(/const businessId = authResult\.businessId[\s\S]*?\n/g, '');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log('Admin authentication fixes completed');

