#!/usr/bin/env node

/**
 * Comprehensive Code Quality Audit
 * Audits code quality, maintainability, and best practices
 */

const fs = require('fs');
const path = require('path');

// Quality metrics tracking
const qualityResults = {
  files: 0,
  lines: 0,
  functions: 0,
  classes: 0,
  interfaces: 0,
  types: 0,
  errors: 0,
  warnings: 0,
  issues: []
};

// Utility functions
function countLines(content) {
  return content.split('\n').length;
}

function countFunctions(content) {
  const functionRegex = /(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>|(?:async\s+)?\w+\s*\([^)]*\)\s*{)/g;
  return (content.match(functionRegex) || []).length;
}

function countClasses(content) {
  const classRegex = /class\s+\w+/g;
  return (content.match(classRegex) || []).length;
}

function countInterfaces(content) {
  const interfaceRegex = /interface\s+\w+/g;
  return (content.match(interfaceRegex) || []).length;
}

function countTypes(content) {
  const typeRegex = /type\s+\w+/g;
  return (content.match(typeRegex) || []).length;
}

function checkCodeQuality(filePath, content) {
  const issues = [];
  
  // Check for console statements
  if (content.includes('console.log') || content.includes('console.error') || content.includes('console.warn')) {
    issues.push({
      type: 'warning',
      message: 'Console statements found - should use logger instead',
      line: content.split('\n').findIndex(line => line.includes('console.')) + 1
    });
  }
  
  // Check for TODO comments
  const todoMatches = content.match(/TODO|FIXME|HACK|XXX/gi);
  if (todoMatches) {
    issues.push({
      type: 'warning',
      message: `${todoMatches.length} TODO/FIXME comments found`,
      line: content.split('\n').findIndex(line => line.match(/TODO|FIXME|HACK|XXX/i)) + 1
    });
  }
  
  // Check for any types
  const anyMatches = content.match(/\bany\b/g);
  if (anyMatches) {
    issues.push({
      type: 'warning',
      message: `${anyMatches.length} 'any' types found - should use specific types`,
      line: content.split('\n').findIndex(line => line.includes('any')) + 1
    });
  }
  
  // Check for empty catch blocks
  const emptyCatchRegex = /catch\s*\([^)]*\)\s*{\s*}/g;
  if (emptyCatchRegex.test(content)) {
    issues.push({
      type: 'error',
      message: 'Empty catch blocks found - should handle errors properly',
      line: content.split('\n').findIndex(line => line.match(emptyCatchRegex)) + 1
    });
  }
  
  // Check for hardcoded values
  const hardcodedRegex = /(?:password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/gi;
  if (hardcodedRegex.test(content)) {
    issues.push({
      type: 'error',
      message: 'Hardcoded secrets found - should use environment variables',
      line: content.split('\n').findIndex(line => line.match(hardcodedRegex)) + 1
    });
  }
  
  // Check for large functions (more than 50 lines)
  const functions = content.split(/\n\s*(?:function|const\s+\w+\s*=\s*(?:async\s+)?\(|(?:async\s+)?\w+\s*\()/);
  functions.forEach((func, index) => {
    if (index > 0) {
      const lines = func.split('\n').length;
      if (lines > 50) {
        issues.push({
          type: 'warning',
          message: `Large function found (${lines} lines) - consider breaking it down`,
          line: content.split('\n').findIndex(line => line.match(/function|const\s+\w+\s*=\s*(?:async\s+)?\(|(?:async\s+)?\w+\s*\(/)) + 1
        });
      }
    }
  });
  
  // Check for missing error handling
  const asyncFunctions = content.match(/async\s+(?:function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>|\w+\s*\([^)]*\)\s*{)/g);
  if (asyncFunctions) {
    asyncFunctions.forEach(() => {
      if (!content.includes('try') && !content.includes('catch')) {
        issues.push({
          type: 'warning',
          message: 'Async function without error handling',
          line: content.split('\n').findIndex(line => line.includes('async')) + 1
        });
      }
    });
  }
  
  // Check for magic numbers
  const magicNumbers = content.match(/\b\d{3,}\b/g);
  if (magicNumbers) {
    issues.push({
      type: 'warning',
      message: `${magicNumbers.length} magic numbers found - should use named constants`,
      line: content.split('\n').findIndex(line => line.match(/\b\d{3,}\b/)) + 1
    });
  }
  
  return issues;
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    
    // Only analyze TypeScript/JavaScript files
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return;
    }
    
    qualityResults.files++;
    qualityResults.lines += countLines(content);
    qualityResults.functions += countFunctions(content);
    qualityResults.classes += countClasses(content);
    qualityResults.interfaces += countInterfaces(content);
    qualityResults.types += countTypes(content);
    
    const issues = checkCodeQuality(filePath, content);
    issues.forEach(issue => {
      qualityResults.issues.push({
        file: filePath,
        ...issue
      });
      
      if (issue.type === 'error') {
        qualityResults.errors++;
      } else {
        qualityResults.warnings++;
      }
    });
    
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(file)) {
        walkDirectory(filePath);
      }
    } else {
      analyzeFile(filePath);
    }
  });
}

function generateQualityReport() {
  console.log('📊 Code Quality Audit Results:\n');
  
  // Basic metrics
  console.log('📈 Code Metrics:');
  console.log(`  Files analyzed: ${qualityResults.files}`);
  console.log(`  Total lines: ${qualityResults.lines.toLocaleString()}`);
  console.log(`  Functions: ${qualityResults.functions}`);
  console.log(`  Classes: ${qualityResults.classes}`);
  console.log(`  Interfaces: ${qualityResults.interfaces}`);
  console.log(`  Types: ${qualityResults.types}`);
  console.log(`  Average lines per file: ${Math.round(qualityResults.lines / qualityResults.files)}`);
  
  // Quality issues
  console.log('\n🚨 Quality Issues:');
  console.log(`  Errors: ${qualityResults.errors}`);
  console.log(`  Warnings: ${qualityResults.warnings}`);
  console.log(`  Total issues: ${qualityResults.issues.length}`);
  
  // Quality score calculation
  const totalIssues = qualityResults.errors + qualityResults.warnings;
  const qualityScore = Math.max(0, 100 - (totalIssues * 2)); // Deduct 2 points per issue
  console.log(`  Quality Score: ${qualityScore}%`);
  
  // Issue breakdown by type
  const errorIssues = qualityResults.issues.filter(i => i.type === 'error');
  const warningIssues = qualityResults.issues.filter(i => i.type === 'warning');
  
  if (errorIssues.length > 0) {
    console.log('\n❌ Critical Issues:');
    errorIssues.slice(0, 10).forEach(issue => {
      console.log(`  - ${issue.file}:${issue.line} - ${issue.message}`);
    });
    if (errorIssues.length > 10) {
      console.log(`  ... and ${errorIssues.length - 10} more errors`);
    }
  }
  
  if (warningIssues.length > 0) {
    console.log('\n⚠️  Warnings:');
    warningIssues.slice(0, 10).forEach(issue => {
      console.log(`  - ${issue.file}:${issue.line} - ${issue.message}`);
    });
    if (warningIssues.length > 10) {
      console.log(`  ... and ${warningIssues.length - 10} more warnings`);
    }
  }
  
  // Recommendations
  console.log('\n💡 Quality Recommendations:');
  if (qualityResults.errors > 0) {
    console.log('  - Fix critical errors immediately');
  }
  if (qualityResults.warnings > 0) {
    console.log('  - Address warnings to improve code quality');
  }
  console.log('  - Implement code review process');
  console.log('  - Use automated testing');
  console.log('  - Follow TypeScript best practices');
  console.log('  - Implement proper error handling');
  console.log('  - Use meaningful variable and function names');
  console.log('  - Keep functions small and focused');
  console.log('  - Add proper documentation');
  
  // File complexity analysis
  const avgLinesPerFile = qualityResults.lines / qualityResults.files;
  if (avgLinesPerFile > 200) {
    console.log('  - Consider breaking down large files');
  }
  
  const avgFunctionsPerFile = qualityResults.functions / qualityResults.files;
  if (avgFunctionsPerFile > 10) {
    console.log('  - Consider splitting files with many functions');
  }
  
  return qualityScore;
}

// Main audit runner
function runCodeQualityAudit() {
  console.log('🔍 Starting Code Quality Audit...\n');
  
  // Analyze source code
  const sourceDirs = ['app', 'lib', 'components', 'hooks', 'utils'];
  sourceDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      walkDirectory(dir);
    }
  });
  
  // Generate report
  const qualityScore = generateQualityReport();
  
  // Exit with appropriate code
  process.exit(qualityResults.errors > 0 ? 1 : 0);
}

// Run code quality audit
runCodeQualityAudit();













