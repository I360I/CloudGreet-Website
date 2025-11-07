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

    // Add missing requireAdmin import
    if (content.includes('requireAdmin(') && !content.includes("import { requireAdmin }")) {
      // Find the first import line
      const lines = content.split('\n');
      let insertIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() === '' && insertIndex > 0) {
          break;
        }
      }
      
      // Add the import
      lines.splice(insertIndex, 0, "import { requireAdmin } from '@/lib/admin-auth'");
      content = lines.join('\n');
      modified = true;
    }

    // Add missing api-response imports
    const apiResponseFunctions = ['apiUnauthorized', 'apiError', 'apiSuccess', 'apiInternalError', 'apiNotFound'];
    const missingImports = [];
    
    for (const func of apiResponseFunctions) {
      if (content.includes(`${func}(`) && !content.includes(`import { ${func}`)) {
        missingImports.push(func);
      }
    }
    
    if (missingImports.length > 0) {
      // Find existing api-response import
      const existingImport = content.match(/import\s*\{[^}]*\}\s*from\s*['"]@\/lib\/api-response['"]/);
      if (existingImport) {
        // Add missing functions to existing import
        const currentFunctions = existingImport[0].match(/\{([^}]+)\}/)[1].split(',').map(f => f.trim());
        const allFunctions = [...new Set([...currentFunctions, ...missingImports])];
        const newImport = `import { ${allFunctions.join(', ')} } from '@/lib/api-response'`;
        content = content.replace(existingImport[0], newImport);
        modified = true;
      } else {
        // Add new import
        const lines = content.split('\n');
        let insertIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ')) {
            insertIndex = i + 1;
          } else if (lines[i].trim() === '' && insertIndex > 0) {
            break;
          }
        }
        
        lines.splice(insertIndex, 0, `import { ${missingImports.join(', ')} } from '@/lib/api-response'`);
        content = lines.join('\n');
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed imports: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log('Import fixes completed');

