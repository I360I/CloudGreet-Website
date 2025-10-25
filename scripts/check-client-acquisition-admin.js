#!/usr/bin/env node

/**
 * Comprehensive check of Client Acquisition and Admin Dashboard for real implementations
 */

const fs = require('fs');
const path = require('path');



// Files to check for client acquisition and admin features
const filesToCheck = [
  'app/admin',
  'app/api/admin',
  'lib/lead-enrichment',
  'app/components',
  'app/dashboard',
  'app/analytics'
];

const issues = [];
const realImplementations = [];

/**
 * Check if file contains real implementations vs mock data
 */
function checkFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for mock/fake implementations
    const mockPatterns = [
      /mock.*data/i,
      /fake.*data/i,
      /simulate.*data/i,
      /placeholder.*data/i,
      /test.*data/i,
      /demo.*data/i,
      /hardcoded.*data/i,
      /Math\.random.*\*.*\d+/g,
      /return.*\d+.*\/\/.*hardcoded/i,
      /return.*\[.*\].*\/\/.*mock/i
    ];
    
    // Check for real implementations
    const realPatterns = [
      /supabaseAdmin\.from\(/g,
      /await.*fetch\(/g,
      /database.*query/i,
      /real.*data/i,
      /actual.*data/i,
      /\.select\(/g,
      /\.insert\(/g,
      /\.update\(/g,
      /\.delete\(/g
    ];
    
    let mockCount = 0;
    let realCount = 0;
    
    mockPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) mockCount += matches.length;
    });
    
    realPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) realCount += matches.length;
    });
    
    if (mockCount > 0) {
      issues.push({
        file: filePath,
        type: 'mock_data',
        count: mockCount,
        severity: mockCount > 5 ? 'high' : 'medium'
      });
    }
    
    if (realCount > 0) {
      realImplementations.push({
        file: filePath,
        type: 'real_implementation',
        count: realCount,
        confidence: realCount > 5 ? 'high' : 'medium'
      });
    }
    
  } catch (error) {
    console.error(`Error checking ${filePath}:`, error.message);
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        checkFile(itemPath);
      }
    });
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error.message);
  }
}

// Scan all relevant directories
filesToCheck.forEach(dir => {
  
  scanDirectory(dir);
});



// Report issues
if (issues.length > 0) {
  
  issues.forEach((issue, index) => {
    const severity = issue.severity === 'high' ? '🔴' : '🟡';
    
    
    
    
  });
} else {
  
}

// Report real implementations

realImplementations.forEach((impl, index) => {
  const confidence = impl.confidence === 'high' ? '🟢' : '🟡';
  
  
  
  
});

// Summary
const totalIssues = issues.length;
const totalReal = realImplementations.length;
const highConfidenceReal = realImplementations.filter(r => r.confidence === 'high').length;







if (totalIssues === 0 && totalReal > 0) {
  
} else if (totalIssues > 0) {
  
} else {
  
}


