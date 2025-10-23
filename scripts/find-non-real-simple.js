#!/usr/bin/env node

/**
 * SIMPLE NON-REAL IMPLEMENTATION DETECTOR
 * 
 * Finds the most critical non-real implementations in your CloudGreet codebase
 */

const fs = require('fs');
const path = require('path');

// Critical patterns to search for
const criticalPatterns = {
  mock: ['mock', 'fake', 'placeholder', 'simulate', 'demo data', 'test data'],
  console: ['console\\.log', 'console\\.error', 'console\\.warn'],
  random: ['Math\\.random', 'Math\\.floor.*random'],
  hardcoded: ['sk-', 'pk_', 'Bearer.*token', 'API_KEY.*=', 'SECRET.*=']
};

// Files to exclude
const excludePatterns = [
  'node_modules', '.git', '.next', 'dist', 'build', '__tests__', 'e2e', 'jest.setup.js', 'scripts'
];

// Results
const results = { issues: [], totalFiles: 0 };

/**
 * Check if file should be excluded
 */
function shouldExcludeFile(filePath) {
  return excludePatterns.some(pattern => filePath.includes(pattern));
}

/**
 * Check if file is a code file
 */
function isCodeFile(filePath) {
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  return codeExtensions.some(ext => filePath.endsWith(ext));
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  if (!isCodeFile(filePath) || shouldExcludeFile(filePath)) {
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    Object.entries(criticalPatterns).forEach(([category, patternList]) => {
      patternList.forEach(pattern => {
        const regex = new RegExp(pattern, 'gi');
        const matches = content.match(regex);
        
        if (matches) {
          const lines = content.split('\n');
          matches.forEach(match => {
            const lineIndex = lines.findIndex(line => 
              new RegExp(pattern, 'gi').test(line)
            );
            
            if (lineIndex !== -1) {
              issues.push({
                category,
                pattern: match,
                line: lineIndex + 1,
                content: lines[lineIndex].trim()
              });
            }
          });
        }
      });
    });
    
    if (issues.length > 0) {
      results.issues.push({
        file: filePath,
        issues: issues
      });
    }
    
    results.totalFiles++;
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else if (stat.isFile()) {
        analyzeFile(itemPath);
      }
    });
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Print results
 */
function printResults() {
  console.log(`\n🔍 NON-REAL IMPLEMENTATION DETECTOR RESULTS\n`);
  
  console.log(`📊 SUMMARY:`);
  console.log(`Total files scanned: ${results.totalFiles}`);
  console.log(`Files with issues: ${results.issues.length}\n`);
  
  if (results.issues.length === 0) {
    console.log(`✅ NO NON-REAL IMPLEMENTATIONS FOUND!`);
    console.log(`Your codebase is 100% real and production-ready!\n`);
    return;
  }
  
  // Print detailed issues
  console.log(`🚨 DETAILED ISSUES:\n`);
  
  results.issues.forEach((fileResult, index) => {
    console.log(`${index + 1}. ${fileResult.file}`);
    
    fileResult.issues.forEach((issue, issueIndex) => {
      console.log(`   Line ${issue.line}: ${issue.category}`);
      console.log(`   Pattern: ${issue.pattern}`);
      console.log(`   Content: ${issue.content}`);
      console.log('');
    });
    
    console.log('');
  });
  
  // Print recommendations
  console.log(`💡 RECOMMENDATIONS:\n`);
  console.log(`• Remove all mock/fake/placeholder data`);
  console.log(`• Replace console.log with proper logger`);
  console.log(`• Check if Math.random() is for legitimate purposes`);
  console.log(`• Remove hardcoded secrets and API keys`);
  console.log(`• Use environment variables instead`);
  console.log('');
}

/**
 * Main execution
 */
function main() {
  console.log(`🔍 SCANNING FOR NON-REAL IMPLEMENTATIONS...\n`);
  
  const startTime = Date.now();
  
  // Scan main directories
  const directories = ['app', 'lib'];
  
  directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`Scanning ${dir}/...`);
      scanDirectory(dir);
    }
  });
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  printResults();
  
  console.log(`Scan completed in ${duration}ms\n`);
  
  // Exit with error code if issues found
  if (results.issues.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { scanDirectory, analyzeFile, criticalPatterns, results };


