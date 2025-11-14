#!/usr/bin/env node

/**
 * Script to fix double authentication in API routes
 * Removes redundant JWT verification when requireAuth is already used
 */

const fs = require('fs');
const path = require('path');

// Patterns to identify double authentication
const DOUBLE_AUTH_PATTERNS = [
  // Pattern 1: requireAuth followed by JWTManager.verifyToken
  /requireAuth\(request\)[\s\S]*?JWTManager\.verifyToken\(token\)/g,
  // Pattern 2: requireAuth followed by jwt.verify
  /requireAuth\(request\)[\s\S]*?jwt\.verify\(token/g,
  // Pattern 3: requireAuth followed by manual auth header check
  /requireAuth\(request\)[\s\S]*?authHeader.*Bearer/g
];

// Files to exclude from processing
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,
  /test/,
  /tests/,
  /__tests__/,
  /\.test\./,
  /\.spec\./
];

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function fixDoubleAuth(content, filePath) {
  let modified = false;
  let newContent = content;
  
  // Pattern 1: Remove JWTManager.verifyToken after requireAuth
  const pattern1 = /(\s+const authResult = await requireAuth\(request\)[\s\S]*?const businessId = authResult\.businessId[\s\S]*?)(\s+try\s*{[\s\S]*?const authHeader = request\.headers\.get\('authorization'\)[\s\S]*?const token = authHeader\.replace\('Bearer ', ''\)[\s\S]*?const decoded = JWTManager\.verifyToken\(token\)[\s\S]*?if \(!decoded\.success \|\| !decoded\.payload\) \{[\s\S]*?return apiError\('Invalid token', 401\)[\s\S]*?\}[\s\S]*?const userBusinessId = decoded\.payload\.businessId[\s\S]*?)(\s+try\s*{)/g;
  
  newContent = newContent.replace(pattern1, (match, before, middle, after) => {
    modified = true;
    console.log(`  - Removed JWTManager.verifyToken after requireAuth`);
    return before + after;
  });
  
  // Pattern 2: Remove jwt.verify after requireAuth
  const pattern2 = /(\s+const authResult = await requireAuth\(request\)[\s\S]*?const businessId = authResult\.businessId[\s\S]*?)(\s+try\s*{[\s\S]*?const authHeader = request\.headers\.get\('authorization'\)[\s\S]*?const token = authHeader\.replace\('Bearer ', ''\)[\s\S]*?const decoded = jwt\.verify\(token[\s\S]*?\)[\s\S]*?const userBusinessId = decoded\.businessId[\s\S]*?)(\s+try\s*{)/g;
  
  newContent = newContent.replace(pattern2, (match, before, middle, after) => {
    modified = true;
    console.log(`  - Removed jwt.verify after requireAuth`);
    return before + after;
  });
  
  // Pattern 3: Remove manual auth header check after requireAuth
  const pattern3 = /(\s+const authResult = await requireAuth\(request\)[\s\S]*?const businessId = authResult\.businessId[\s\S]*?)(\s+try\s*{[\s\S]*?const authHeader = request\.headers\.get\('authorization'\)[\s\S]*?if \(!authHeader.*Bearer.*\) \{[\s\S]*?return apiUnauthorized\(\)[\s\S]*?\}[\s\S]*?)(\s+try\s*{)/g;
  
  newContent = newContent.replace(pattern3, (match, before, middle, after) => {
    modified = true;
    console.log(`  - Removed manual auth header check after requireAuth`);
    return before + after;
  });
  
  // Fix references to userBusinessId -> businessId
  newContent = newContent.replace(/userBusinessId/g, 'businessId');
  
  return { content: newContent, modified };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has both requireAuth and JWT verification
    const hasRequireAuth = content.includes('requireAuth(');
    const hasJWTVerification = content.includes('JWTManager.verifyToken') || content.includes('jwt.verify(');
    
    if (hasRequireAuth && hasJWTVerification) {
      console.log(`\n🔍 Processing: ${filePath}`);
      
      const result = fixDoubleAuth(content, filePath);
      
      if (result.modified) {
        fs.writeFileSync(filePath, result.content, 'utf8');
        console.log(`✅ Fixed double authentication in ${filePath}`);
        return true;
      } else {
        console.log(`ℹ️  No changes needed in ${filePath}`);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function scanDirectory(dirPath) {
  let filesProcessed = 0;
  let filesModified = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!shouldExcludeFile(fullPath)) {
          const result = scanDirectory(fullPath);
          filesProcessed += result.filesProcessed;
          filesModified += result.filesModified;
        }
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        if (!shouldExcludeFile(fullPath)) {
          filesProcessed++;
          if (processFile(fullPath)) {
            filesModified++;
          }
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error scanning directory ${dirPath}:`, error.message);
  }
  
  return { filesProcessed, filesModified };
}

function main() {
  console.log('🔧 Fixing double authentication in API routes...\n');
  
  const apiDir = path.join(process.cwd(), 'app', 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.error('❌ API directory not found:', apiDir);
    process.exit(1);
  }
  
  const result = scanDirectory(apiDir);
  
  console.log(`\n📊 Summary:`);
  console.log(`  - Files processed: ${result.filesProcessed}`);
  console.log(`  - Files modified: ${result.filesModified}`);
  
  if (result.filesModified > 0) {
    console.log(`\n✅ Successfully fixed ${result.filesModified} files with double authentication!`);
    console.log('\n🔍 Next steps:');
    console.log('1. Review the changes to ensure they look correct');
    console.log('2. Run tests to verify authentication still works');
    console.log('3. Test API endpoints to ensure they return 401 instead of 500');
  } else {
    console.log('\n✅ No files with double authentication found!');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixDoubleAuth, processFile };













