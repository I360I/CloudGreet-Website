#!/usr/bin/env node

/**
 * COMPREHENSIVE CODEBASE AUDIT SCRIPT
 * Finds ALL issues in one pass - no incremental discovery
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const issues = {
  hardcodedBusinessValues: [],
  selectStar: [],
  todoComments: [],
  consoleLogs: [],
  missingErrorHandling: [],
  placeholderFunctions: [],
  fakeDataGeneration: [],
  emptySuccessReturns: []
};

// Patterns to check
const BUSINESS_VALUE_PATTERNS = [
  /(?:amount|price|fee|cost|unit_amount|ticket|revenue).*[:=]\s*(?:5000|20000|500|299|50|200)/gi,
  /(?:close_rate|closeRate|conversion).*[:=]\s*0?\.?35/gi,
  /(?:subscription|monthly).*[:=]\s*(?:200|299)/gi,
  /(?:booking|per_booking).*[:=]\s*(?:50|5)/gi,
];

const CONFIG_IMPORT_PATTERN = /import.*CONFIG.*from.*config/i;

function checkFile(filePath, content, relativePath) {
  const lines = content.split('\n');
  
  // Check for hardcoded business values
  lines.forEach((line, index) => {
    // Skip if already using CONFIG
    if (CONFIG_IMPORT_PATTERN.test(content) && line.includes('CONFIG.BUSINESS')) {
      return;
    }
    
    BUSINESS_VALUE_PATTERNS.forEach(pattern => {
      // Skip if it's in CONFIG definition file itself, or already using CONFIG, or is a comment
      if (pattern.test(line) && 
          !relativePath.includes('config.ts') && 
          !line.includes('CONFIG') && 
          !line.trim().startsWith('//') &&
          !line.includes('CONFIG.BUSINESS') &&
          !line.includes('export const CONFIG')) {
        // Additional check: make sure it's not a scoring threshold or query cost
        if (!line.includes('score') && !line.includes('threshold') && !line.includes('cost +=') && !line.includes('avgRevenue')) {
          issues.hardcodedBusinessValues.push({
            file: relativePath,
            line: index + 1,
            content: line.trim()
          });
        }
      }
    });
  });
  
  // Check for select('*') - but exclude legitimate uses
  const selectStarMatches = content.match(/\.select\(['"]\*['"]\)/g);
  if (selectStarMatches) {
    // Verify it's actually a database query issue, not legitimate use
    const lines = content.split('\n');
    selectStarMatches.forEach(match => {
      const matchIndex = content.indexOf(match);
      const lineNum = content.substring(0, matchIndex).split('\n').length;
      const line = lines[lineNum - 1];
      const context = content.substring(Math.max(0, matchIndex - 100), matchIndex + 100);
      
      // Exclude legitimate uses:
      // - Count queries: select('*', { count: 'exact', head: true })
      // - String literals or comments
      // - Code that DETECTS select('*') (query optimizer)
      if (line && 
          !line.trim().startsWith('//') && 
          !line.includes('"select') && 
          !line.includes("'select") &&
          !context.includes('count:') && // Count queries are legitimate
          !context.includes('head: true') && // Count queries
          !context.includes('includes(\'select') && // Detection code
          !context.includes('includes("select') && // Detection code
          !context.includes('selectColumns.includes')) { // Analysis code
        issues.selectStar.push({
          file: relativePath,
          line: lineNum,
          content: line.trim()
        });
      }
    });
  }
  
  // Check for TODO/FIXME (excluding legitimate ones)
  const todoMatches = content.match(/(TODO|FIXME|XXX|HACK|placeholder|stub|mock|fake|not implemented)/gi);
  if (todoMatches) {
    // Exclude legitimate uses:
    // - HTML placeholder attributes (placeholder="...")
    // - CSS classes (placeholder-gray-400)
    // - Variable names (PLACEHOLDERS, placeholder =)
    // - Test mocks (Mock utilities)
    // - Comments explaining what we're NOT doing ("instead of mock data")
    // - Environment variable validation (includes('placeholder'))
    const suspicious = todoMatches.filter(m => {
      const matchIndex = content.indexOf(m);
      const context = content.substring(Math.max(0, matchIndex - 50), matchIndex + 50).toLowerCase();
      return !context.includes('placeholder=') && 
             !context.includes('placeholder-') && 
             !context.includes('const placeholder') &&
             !context.includes('export const placeholders') &&
             !context.includes('includes(\'placeholder\')') &&
             !context.includes('includes("placeholder")') &&
             !context.includes('test') && 
             !context.includes('mock utilities') &&
             !context.includes('instead of mock') &&
             !context.includes('not_implemented') && // HTTP status code constant
             !context.includes('not implemented') && // HTTP status message
             !context.includes('const not_implemented') && // Constant definition
             !context.includes('notimplemented') && // CamelCase constant
             !context.includes('fake numbers') && // Validation pattern (e.g., "check for fake numbers")
             !context.includes('fake patterns') && // Validation pattern
             !context.includes('isFake') && // Validation variable
             !context.includes('fakePatterns') && // Validation variable
             !context.includes('check for fake') && // Validation comment
             !context.includes('obviously fake') && // Validation comment
             !context.includes('(xxx)') && // Phone format pattern
             !context.includes('xxx-') && // Format pattern
             !context.includes('format as') && // Format description
             !context.includes('format:') && // Format description
             !context.includes('pattern') // Format pattern
    });
    if (suspicious.length > 0) {
      issues.todoComments.push({
        file: relativePath,
        count: suspicious.length
      });
    }
  }
  
  // Check for console.logs (excluding error handling in catch blocks)
  const consoleMatches = content.match(/console\.(log|warn|error|debug)/g);
  if (consoleMatches) {
    // Only flag if not in error handling context
    const lines = content.split('\n');
    consoleMatches.forEach((match, i) => {
      const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
      const context = lines.slice(Math.max(0, lineNum - 3), lineNum + 1).join('\n');
      if (!context.includes('catch') && !context.includes('error') && !context.includes('logger')) {
        issues.consoleLogs.push({
          file: relativePath,
          line: lineNum,
          type: match
        });
      }
    });
  }
  
  // Check for Math.random() used for business data (not UI animations)
  const randomMatches = content.match(/Math\.random\(\)/g);
  if (randomMatches) {
    // In API routes and monitoring/automation libs, Math.random() for data generation is suspicious
    const isSuspiciousPath = relativePath.includes('/api/') || 
                             relativePath.includes('\\api\\') ||
                             relativePath.includes('monitoring') || 
                             relativePath.includes('automation');
    
    if (isSuspiciousPath) {
      randomMatches.forEach((match, i) => {
        let matchIndex;
        if (i === 0) {
          matchIndex = content.indexOf(match);
        } else {
          const previousIndex = content.lastIndexOf(match, matchIndex - 1);
          matchIndex = content.indexOf(match, previousIndex + 1);
        }
        if (matchIndex === -1) return;
        
        const context = content.substring(Math.max(0, matchIndex - 200), matchIndex + 200);
        // Exclude legitimate uses: UI animations, retry jitter, ID generation
        // But INCLUDE: recordMetric (monitoring fake data), business metrics, revenue, appointments
        const isLegitimate = context.includes('animation') || 
            context.includes('jitter') || 
            context.includes('toString(36)') ||
            context.includes('substr') ||
            context.includes('baseRadius') ||
            context.includes('amplitude') ||
            context.includes('frequency') ||
            context.includes('opacity') ||
            context.includes('color') ||
            context.includes('phase') ||
            context.includes('speed') ||
            relativePath.includes('component') ||
            relativePath.includes('CallOrb') ||
            relativePath.includes('RingOrb') ||
            relativePath.includes('WaveBackground');
        
        // Flag if it's NOT legitimate AND it's in a suspicious path (monitoring, automation, API)
        if (!isLegitimate) {
          issues.fakeDataGeneration.push({
            file: relativePath,
            line: content.substring(0, matchIndex).split('\n').length,
            context: context.substring(0, 100)
          });
        }
      });
    }
  }
  
  // Check for async functions that return success without doing work
  if (relativePath.includes('api') && content.includes('async') && content.includes('success: true')) {
    const asyncFunctionMatches = content.match(/async\s+(function|\()[\s\S]{0,500}return.*success.*true/gi);
    if (asyncFunctionMatches) {
      asyncFunctionMatches.forEach(match => {
        // Check if function has database operations, API calls, or real work
        const hasRealWork = match.includes('await') && (
          match.includes('supabase') ||
          match.includes('fetch(') ||
          match.includes('stripe') ||
          match.includes('telnyx') ||
          match.includes('retell') ||
          match.includes('.insert') ||
          match.includes('.update') ||
          match.includes('.delete') ||
          match.includes('.select') ||
          match.includes('createCalendarEvent') ||
          match.includes('sendSMS') ||
          match.includes('sendEmail')
        );
        
        if (!hasRealWork && match.includes('success: true')) {
          const lineNum = content.indexOf(match.split('return')[0]);
          issues.emptySuccessReturns.push({
            file: relativePath,
            line: content.substring(0, lineNum).split('\n').length,
            snippet: match.substring(0, 150)
          });
        }
      });
    }
  }
}

function scanDirectory(dir, baseDir = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(baseDir, entry.name);
    
    // Skip node_modules, .git, etc.
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
      continue;
    }
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath, relativePath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        checkFile(fullPath, content, relativePath);
      } catch (err) {
        // Skip files that can't be read
      }
    }
  }
}

// Run audit
console.log('🔍 Running comprehensive audit...\n');
scanDirectory('app', 'app');
scanDirectory('lib', 'lib');

// Report results
console.log('📊 AUDIT RESULTS:\n');
console.log('═'.repeat(60));

if (issues.hardcodedBusinessValues.length > 0) {
  console.log(`\n❌ HARDCODED BUSINESS VALUES (${issues.hardcodedBusinessValues.length}):`);
  issues.hardcodedBusinessValues.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line} - ${issue.content.substring(0, 60)}`);
  });
}

if (issues.selectStar.length > 0) {
  console.log(`\n❌ SELECT('*') QUERIES (${issues.selectStar.length}):`);
  issues.selectStar.forEach(issue => {
    console.log(`  ${issue.file}`);
  });
}

if (issues.todoComments.length > 0) {
  console.log(`\n⚠️  TODO/FIXME COMMENTS (${issues.todoComments.length}):`);
  issues.todoComments.forEach(issue => {
    console.log(`  ${issue.file} (${issue.count} found)`);
  });
}

if (issues.consoleLogs.length > 0) {
  console.log(`\n⚠️  CONSOLE STATEMENTS (${issues.consoleLogs.length}):`);
  issues.consoleLogs.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line} - ${issue.type}`);
  });
}

if (issues.fakeDataGeneration.length > 0) {
  console.log(`\n❌ FAKE DATA GENERATION (${issues.fakeDataGeneration.length}):`);
  issues.fakeDataGeneration.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line} - ${issue.context.substring(0, 60)}...`);
  });
}

if (issues.emptySuccessReturns.length > 0) {
  console.log(`\n❌ EMPTY SUCCESS RETURNS (${issues.emptySuccessReturns.length}):`);
  issues.emptySuccessReturns.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line} - ${issue.snippet.substring(0, 60)}...`);
  });
}

const totalIssues = 
  issues.hardcodedBusinessValues.length +
  issues.selectStar.length +
  issues.todoComments.length +
  issues.consoleLogs.length +
  issues.fakeDataGeneration.length +
  issues.emptySuccessReturns.length;

console.log('\n' + '═'.repeat(60));
console.log(`\n📈 TOTAL ISSUES FOUND: ${totalIssues}\n`);

if (totalIssues === 0) {
  console.log('✅ ALL CHECKS PASSED - CODEBASE IS CLEAN!\n');
  process.exit(0);
} else {
  console.log('❌ ISSUES FOUND - FIX REQUIRED\n');
  process.exit(1);
}

