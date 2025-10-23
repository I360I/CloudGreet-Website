#!/usr/bin/env node

/**
 * COMPREHENSIVE NON-REAL IMPLEMENTATION DETECTOR
 * 
 * Finds all mock, fake, placeholder, simulated, or test data implementations
 * in your CloudGreet codebase
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Patterns to search for non-real implementations
const patterns = {
  mock: [
    'mock',
    'fake',
    'placeholder',
    'simulate',
    'demo data',
    'test data',
    'sample data',
    'dummy data',
    'hardcoded.*data',
    'generateRandom',
    'createRandom',
    'makeRandom',
    'randomData'
  ],
  console: [
    'console\\.log',
    'console\\.error',
    'console\\.warn',
    'console\\.debug'
  ],
  random: [
    'Math\\.random',
    'Math\\.floor.*random',
    'Math\\.ceil.*random'
  ],
  hardcoded: [
    'sk-',
    'pk_',
    'rk_',
    'Bearer.*token',
    'API_KEY.*=',
    'SECRET.*=',
    'password.*=',
    '\\+17372960092',
    '\\+18333956731'
  ],
  testNames: [
    "'John'", "'Jane'", "'Mike'", "'Sarah'", "'David'", "'Lisa'",
    "'Robert'", "'Emily'", "'James'", "'Jessica'",
    "'Smith'", "'Johnson'", "'Williams'", "'Brown'", "'Jones'"
  ],
  testPhones: [
    "'555'", "'444'", "'333'", "'222'", "'111'"
  ],
  testData: [
    'TODO', 'FIXME', 'XXX', 'HACK', 'BUG', 'TEMP'
  ]
};

// Files to exclude from search
const excludePatterns = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '__tests__',
  'e2e',
  'jest.setup.js',
  'scripts',
  '.env',
  '.env.local',
  '.env.example',
  'package-lock.json',
  'yarn.lock'
];

// Results storage
const results = {
  totalFiles: 0,
  issues: [],
  summary: {
    mock: 0,
    console: 0,
    random: 0,
    hardcoded: 0,
    testNames: 0,
    testPhones: 0,
    testData: 0
  }
};

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
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.sql'];
  return codeExtensions.some(ext => filePath.endsWith(ext));
}

/**
 * Search for patterns in file content
 */
function searchPatterns(filePath, content) {
  const fileIssues = [];
  
  Object.entries(patterns).forEach(([category, patternList]) => {
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
            fileIssues.push({
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
  
  return fileIssues;
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
    const issues = searchPatterns(filePath, content);
    
    if (issues.length > 0) {
      results.issues.push({
        file: filePath,
        issues: issues
      });
      
      // Update summary counts
      issues.forEach(issue => {
        results.summary[issue.category]++;
      });
    }
    
    results.totalFiles++;
  } catch (error) {
    console.error(`${colors.red}Error reading file ${filePath}: ${error.message}${colors.reset}`);
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
    console.error(`${colors.red}Error scanning directory ${dirPath}: ${error.message}${colors.reset}`);
  }
}

/**
 * Print results
 */
function printResults() {
  console.log(`\n${colors.bold}${colors.cyan}🔍 NON-REAL IMPLEMENTATION DETECTOR RESULTS${colors.reset}\n`);
  
  console.log(`${colors.bold}📊 SUMMARY:${colors.reset}`);
  console.log(`Total files scanned: ${colors.green}${results.totalFiles}${colors.reset}`);
  console.log(`Files with issues: ${colors.red}${results.issues.length}${colors.reset}\n`);
  
  if (results.issues.length === 0) {
    console.log(`${colors.green}✅ NO NON-REAL IMPLEMENTATIONS FOUND!${colors.reset}`);
    console.log(`${colors.green}Your codebase is 100% real and production-ready!${colors.reset}\n`);
    return;
  }
  
  // Print summary by category
  console.log(`${colors.bold}📈 ISSUES BY CATEGORY:${colors.reset}`);
  Object.entries(results.summary).forEach(([category, count]) => {
    if (count > 0) {
      const color = count > 0 ? colors.red : colors.green;
      console.log(`${color}${category}: ${count}${colors.reset}`);
    }
  });
  console.log('');
  
  // Print detailed issues
  console.log(`${colors.bold}🚨 DETAILED ISSUES:${colors.reset}\n`);
  
  results.issues.forEach((fileResult, index) => {
    console.log(`${colors.bold}${index + 1}. ${colors.blue}${fileResult.file}${colors.reset}`);
    
    fileResult.issues.forEach((issue, issueIndex) => {
      const categoryColor = getCategoryColor(issue.category);
      console.log(`   ${colors.yellow}Line ${issue.line}:${colors.reset} ${categoryColor}${issue.category}${colors.reset}`);
      console.log(`   ${colors.white}Pattern: ${colors.magenta}${issue.pattern}${colors.reset}`);
      console.log(`   ${colors.white}Content: ${colors.cyan}${issue.content}${colors.reset}`);
      console.log('');
    });
    
    console.log('');
  });
  
  // Print recommendations
  printRecommendations();
}

/**
 * Get color for category
 */
function getCategoryColor(category) {
  const categoryColors = {
    mock: colors.red,
    console: colors.yellow,
    random: colors.magenta,
    hardcoded: colors.red,
    testNames: colors.yellow,
    testPhones: colors.yellow,
    testData: colors.yellow
  };
  return categoryColors[category] || colors.white;
}

/**
 * Print recommendations
 */
function printRecommendations() {
  console.log(`${colors.bold}💡 RECOMMENDATIONS:${colors.reset}\n`);
  
  if (results.summary.mock > 0) {
    console.log(`${colors.red}• Remove all mock/fake/placeholder data${colors.reset}`);
    console.log(`${colors.red}• Replace with real database queries${colors.reset}`);
  }
  
  if (results.summary.console > 0) {
    console.log(`${colors.yellow}• Replace console.log with proper logger${colors.reset}`);
    console.log(`${colors.yellow}• Import logger from @/lib/monitoring${colors.reset}`);
  }
  
  if (results.summary.random > 0) {
    console.log(`${colors.magenta}• Check if Math.random() is for legitimate purposes${colors.reset}`);
    console.log(`${colors.magenta}• Replace random data generation with real data${colors.reset}`);
  }
  
  if (results.summary.hardcoded > 0) {
    console.log(`${colors.red}• Remove hardcoded secrets and API keys${colors.reset}`);
    console.log(`${colors.red}• Use environment variables instead${colors.reset}`);
  }
  
  if (results.summary.testNames > 0 || results.summary.testPhones > 0) {
    console.log(`${colors.yellow}• Replace test names/phones with real data${colors.reset}`);
    console.log(`${colors.yellow}• Use database queries for real customer data${colors.reset}`);
  }
  
  if (results.summary.testData > 0) {
    console.log(`${colors.yellow}• Address TODO/FIXME comments${colors.reset}`);
    console.log(`${colors.yellow}• Remove temporary code${colors.reset}`);
  }
  
  console.log('');
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bold}${colors.cyan}🔍 SCANNING FOR NON-REAL IMPLEMENTATIONS...${colors.reset}\n`);
  
  const startTime = Date.now();
  
  // Scan main directories
  const directories = ['app', 'lib', 'migrations'];
  
  directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`${colors.blue}Scanning ${dir}/...${colors.reset}`);
      scanDirectory(dir);
    }
  });
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  printResults();
  
  console.log(`${colors.green}Scan completed in ${duration}ms${colors.reset}\n`);
  
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

module.exports = {
  scanDirectory,
  analyzeFile,
  searchPatterns,
  patterns,
  results
};


