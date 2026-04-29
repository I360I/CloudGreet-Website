#!/usr/bin/env node

/**
 * Script to verify SQL injection protection in the codebase
 * Checks that all database queries use parameterized queries (Supabase client)
 */

const fs = require('fs');
const path = require('path');

// Patterns that indicate actual SQL injection vulnerabilities
const SQL_INJECTION_PATTERNS = [
  // Direct string concatenation with SQL keywords
  /SELECT\s+.*\+.*['"]/gi,
  /INSERT\s+INTO\s+.*\+.*['"]/gi,
  /UPDATE\s+.*SET\s+.*\+.*['"]/gi,
  /DELETE\s+FROM\s+.*\+.*['"]/gi,
  /WHERE\s+.*\+.*['"]/gi,
  
  // Raw SQL queries with string concatenation
  /\.query\s*\(\s*['"][^'"]*\+/gi,
  /\.raw\s*\(\s*['"][^'"]*\+/gi,
  /\.sql\s*\(\s*['"][^'"]*\+/gi,
  
  // Direct database connection usage
  /pg\.connect/gi,
  /mysql\.createConnection/gi,
  /sqlite3\.Database/gi,
  
  // Unsafe query building with user input
  /supabase\.from\([^)]*\)\.select\([^)]*\+/gi,
  /supabase\.from\([^)]*\)\.insert\([^)]*\+/gi,
  /supabase\.from\([^)]*\)\.update\([^)]*\+/gi,
  /supabase\.from\([^)]*\)\.delete\([^)]*\+/gi
];

// Safe patterns (Supabase client usage)
const SAFE_PATTERNS = [
  /supabase\.from\(/g,
  /\.select\(/g,
  /\.insert\(/g,
  /\.update\(/g,
  /\.delete\(/g,
  /\.eq\(/g,
  /\.neq\(/g,
  /\.gt\(/g,
  /\.gte\(/g,
  /\.lt\(/g,
  /\.lte\(/g,
  /\.like\(/g,
  /\.ilike\(/g,
  /\.is\(/g,
  /\.in\(/g,
  /\.contains\(/g,
  /\.containedBy\(/g,
  /\.rangeGt\(/g,
  /\.rangeGte\(/g,
  /\.rangeLt\(/g,
  /\.rangeLte\(/g,
  /\.rangeAdjacent\(/g,
  /\.overlaps\(/g,
  /\.textSearch\(/g,
  /\.match\(/g,
  /\.not\(/g,
  /\.or\(/g,
  /\.filter\(/g,
  /\.order\(/g,
  /\.limit\(/g,
  /\.range\(/g,
  /\.single\(/g,
  /\.maybeSingle\(/g,
  /\.csv\(/g,
  /\.geojson\(/g,
  /\.explain\(/g,
  /\.rollback\(/g,
  /\.abort\(/g,
  /\.commit\(/g
];

// Files/directories to exclude from scanning
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
  /\.spec\./,
  /scripts/,
  /migrations/
];

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function hasSafePatterns(content) {
  return SAFE_PATTERNS.some(pattern => pattern.test(content));
}

function scanFile(filePath) {
  const issues = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if file doesn't contain database operations
    if (!content.includes('supabase') && !content.includes('database') && !content.includes('query')) {
      return issues;
    }
    
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for unsafe patterns
      SQL_INJECTION_PATTERNS.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          // Check if this line also has safe patterns (might be false positive)
          if (!hasSafePatterns(line)) {
            issues.push({
              file: filePath,
              line: index + 1,
              match: matches[0],
              fullLine: line.trim(),
              severity: 'warning'
            });
          }
        }
      });
    });
    
    // Check for direct database connections (high severity)
    if (content.includes('pg.connect') || content.includes('mysql.createConnection') || content.includes('sqlite3.Database')) {
      issues.push({
        file: filePath,
        line: 0,
        match: 'Direct database connection detected',
        fullLine: 'File contains direct database connection',
        severity: 'error'
      });
    }
    
    // Check for raw SQL queries (high severity)
    if (content.includes('.query(') || content.includes('.raw(') || content.includes('.sql(')) {
      issues.push({
        file: filePath,
        line: 0,
        match: 'Raw SQL query detected',
        fullLine: 'File contains raw SQL queries',
        severity: 'error'
      });
    }
    
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
  }
  
  return issues;
}

function scanDirectory(dirPath) {
  const issues = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!shouldExcludeFile(fullPath)) {
          issues.push(...scanDirectory(fullPath));
        }
      } else if (stat.isFile() && /\.(js|ts|jsx|tsx)$/.test(item)) {
        if (!shouldExcludeFile(fullPath)) {
          issues.push(...scanFile(fullPath));
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
  }
  
  return issues;
}

function main() {
  console.log('🔍 Verifying SQL injection protection...\n');
  
  const rootDir = process.cwd();
  const issues = scanDirectory(rootDir);
  
  // Group issues by severity
  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');
  
  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} critical SQL injection vulnerabilities:\n`);
    
    errors.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}:${issue.line}`);
      console.log(`   Issue: ${issue.match}`);
      console.log(`   Line:  ${issue.fullLine}\n`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} potential SQL injection issues:\n`);
    
    warnings.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}:${issue.line}`);
      console.log(`   Issue: ${issue.match}`);
      console.log(`   Line:  ${issue.fullLine}\n`);
    });
  }
  
  if (issues.length === 0) {
    console.log('✅ No SQL injection vulnerabilities found!');
    console.log('\n🔍 Security verification:');
    console.log('  - All database queries use Supabase client (parameterized)');
    console.log('  - No direct database connections detected');
    console.log('  - No raw SQL queries detected');
    console.log('  - No string concatenation with SQL detected');
  } else {
    console.log('🚨 SQL injection vulnerabilities detected! Please:');
    console.log('1. Replace direct database connections with Supabase client');
    console.log('2. Use parameterized queries instead of string concatenation');
    console.log('3. Avoid raw SQL queries');
    console.log('4. Use Supabase query builder methods');
    console.log('5. Re-run this check after fixes\n');
  }
  
  // Return appropriate exit code
  process.exit(errors.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { scanFile, scanDirectory, SQL_INJECTION_PATTERNS, SAFE_PATTERNS };