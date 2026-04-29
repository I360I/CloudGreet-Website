const fs = require('fs');
const path = require('path');

// JWT patterns to replace
const jwtPatterns = [
  {
    // Pattern: import jwt from 'jsonwebtoken'
    importPattern: /import\s+(?:jwt|.*)\s+from\s+['"]jsonwebtoken['"]/g,
    replacement: "import { JWTManager } from '@/lib/jwt-manager'"
  },
  {
    // Pattern: import * as jwt from 'jsonwebtoken'
    importPattern: /import\s+\*\s+as\s+jwt\s+from\s+['"]jsonwebtoken['"]/g,
    replacement: "import { JWTManager } from '@/lib/jwt-manager'"
  },
  {
    // Pattern: const jwt = (await import('jsonwebtoken')).default
    dynamicImportPattern: /const\s+jwt\s*=\s*\(await\s+import\(['"]jsonwebtoken['"]\)\)\.default/g,
    replacement: "// JWT handling centralized in JWTManager"
  },
  {
    // Pattern: const jwt = require('jsonwebtoken')
    requirePattern: /const\s+jwt\s*=\s*require\(['"]jsonwebtoken['"]\)/g,
    replacement: "const { JWTManager } = require('@/lib/jwt-manager')"
  }
];

// JWT usage patterns to replace
const usagePatterns = [
  {
    // Pattern: jwt.verify(token, jwtSecret) as any
    pattern: /jwt\.verify\(([^,]+),\s*([^)]+)\)\s+as\s+any/g,
    replacement: 'JWTManager.verifyToken($1)'
  },
  {
    // Pattern: jwt.verify(token, process.env.JWT_SECRET!) as any
    pattern: /jwt\.verify\(([^,]+),\s*process\.env\.JWT_SECRET!\)\s+as\s+any/g,
    replacement: 'JWTManager.verifyToken($1)'
  },
  {
    // Pattern: jwt.sign(payload, jwtSecret, options)
    pattern: /jwt\.sign\(([^,]+),\s*([^,]+)(?:,\s*([^)]+))?\)/g,
    replacement: 'JWTManager.signToken($1, $3)'
  },
  {
    // Pattern: jwt.sign(payload, process.env.JWT_SECRET, options)
    pattern: /jwt\.sign\(([^,]+),\s*process\.env\.JWT_SECRET(?:,\s*([^)]+))?\)/g,
    replacement: 'JWTManager.signToken($1, $2)'
  }
];

// Files to process
const targetDirectories = ['app'];

// Files to skip
const skipFiles = [
  'scripts',
  'test',
  '.test.',
  '.spec.',
  'node_modules',
  '.next',
  'dist',
  'build',
  'lib/jwt-manager.ts' // Don't process our own file
];

function shouldSkipFile(filePath) {
  return skipFiles.some(skip => filePath.includes(skip));
}

function replaceJWTImports(content) {
  let newContent = content;
  let hasChanges = false;

  // Replace import statements
  jwtPatterns.forEach(({ importPattern, dynamicImportPattern, requirePattern, replacement }) => {
    if (importPattern && importPattern.test(newContent)) {
      newContent = newContent.replace(importPattern, replacement);
      hasChanges = true;
    }
    if (dynamicImportPattern && dynamicImportPattern.test(newContent)) {
      newContent = newContent.replace(dynamicImportPattern, replacement);
      hasChanges = true;
    }
    if (requirePattern && requirePattern.test(newContent)) {
      newContent = newContent.replace(requirePattern, replacement);
      hasChanges = true;
    }
  });

  return { content: newContent, hasChanges };
}

function replaceJWTUsage(content) {
  let newContent = content;
  let hasChanges = false;

  // Replace usage patterns
  usagePatterns.forEach(({ pattern, replacement }) => {
    if (pattern.test(newContent)) {
      newContent = newContent.replace(pattern, replacement);
      hasChanges = true;
    }
  });

  return { content: newContent, hasChanges };
}

function updateJWTLogic(content, filePath) {
  let newContent = content;
  let hasChanges = false;

  // Replace common JWT verification patterns
  const jwtVerificationPattern = /const\s+decoded\s*=\s*jwt\.verify\([^)]+\)\s+as\s+any;?\s*if\s*\(\s*!decoded\s*\)\s*{[^}]*return[^}]*}/gs;
  
  if (jwtVerificationPattern.test(newContent)) {
    // Replace with JWTManager pattern
    newContent = newContent.replace(jwtVerificationPattern, (match) => {
      return `const jwtResult = JWTManager.verifyToken(token);
      if (!jwtResult.success) {
        return NextResponse.json({ error: jwtResult.error }, { status: 401 });
      }
      const decoded = jwtResult.payload;`;
    });
    hasChanges = true;
  }

  // Replace token extraction patterns
  const tokenExtractionPattern = /const\s+token\s*=\s*request\.headers\.get\(['"]authorization['"]\)\s*\.replace\(['"]Bearer\s+['"],\s*['"]\s*['"]\)/g;
  
  if (tokenExtractionPattern.test(newContent)) {
    newContent = newContent.replace(tokenExtractionPattern, 
      "const authHeader = request.headers.get('authorization');\n      const token = JWTManager.extractTokenFromHeader(authHeader);"
    );
    hasChanges = true;
  }

  return { content: newContent, hasChanges };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if no JWT usage
    if (!content.includes('jwt.') && !content.includes('jsonwebtoken')) {
      return false;
    }

    let newContent = content;
    let hasChanges = false;

    // Step 1: Replace imports
    const importResult = replaceJWTImports(newContent);
    if (importResult.hasChanges) {
      newContent = importResult.content;
      hasChanges = true;
    }

    // Step 2: Replace usage patterns
    const usageResult = replaceJWTUsage(newContent);
    if (usageResult.hasChanges) {
      newContent = usageResult.content;
      hasChanges = true;
    }

    // Step 3: Update JWT logic patterns
    const logicResult = updateJWTLogic(newContent, filePath);
    if (logicResult.hasChanges) {
      newContent = logicResult.content;
      hasChanges = true;
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ ${filePath} - Centralized JWT handling`);
      return true;
    } else {
      console.log(`⚪ ${filePath} - No JWT patterns found`);
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
  console.log('🔧 Centralizing JWT handling...\n');
  
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
  console.log('\n📋 JWT Centralization Complete!');
  console.log('\n📋 Benefits:');
  console.log('- Centralized JWT token handling');
  console.log('- Consistent error handling');
  console.log('- Better security practices');
  console.log('- Reduced code duplication');
  console.log('- Improved maintainability');
  console.log('\n⚠️  Note: Test authentication flows to ensure JWT handling works correctly');
}

main();

