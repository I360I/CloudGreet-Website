#!/usr/bin/env node

/**
 * Comprehensive check of Client Acquisition and Admin Dashboard for real implementations
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE CHECK: CLIENT ACQUISITION & ADMIN DASHBOARD\n');

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
  console.log(`📁 Scanning ${dir}/...`);
  scanDirectory(dir);
});

console.log('\n📊 ANALYSIS RESULTS:\n');

// Report issues
if (issues.length > 0) {
  console.log('🚨 POTENTIAL ISSUES FOUND:');
  issues.forEach((issue, index) => {
    const severity = issue.severity === 'high' ? '🔴' : '🟡';
    console.log(`${severity} ${index + 1}. ${issue.file}`);
    console.log(`   Type: ${issue.type}`);
    console.log(`   Count: ${issue.count}`);
    console.log(`   Severity: ${issue.severity}\n`);
  });
} else {
  console.log('✅ NO MOCK DATA ISSUES FOUND!\n');
}

// Report real implementations
console.log('✅ REAL IMPLEMENTATIONS FOUND:');
realImplementations.forEach((impl, index) => {
  const confidence = impl.confidence === 'high' ? '🟢' : '🟡';
  console.log(`${confidence} ${index + 1}. ${impl.file}`);
  console.log(`   Type: ${impl.type}`);
  console.log(`   Count: ${impl.count}`);
  console.log(`   Confidence: ${impl.confidence}\n`);
});

// Summary
const totalIssues = issues.length;
const totalReal = realImplementations.length;
const highConfidenceReal = realImplementations.filter(r => r.confidence === 'high').length;

console.log('📈 SUMMARY:');
console.log(`Total files checked: ${filesToCheck.length} directories`);
console.log(`Mock data issues: ${totalIssues}`);
console.log(`Real implementations: ${totalReal}`);
console.log(`High confidence real: ${highConfidenceReal}`);

if (totalIssues === 0 && totalReal > 0) {
  console.log('\n🎉 EXCELLENT! Client Acquisition & Admin Dashboard are fully real!');
} else if (totalIssues > 0) {
  console.log('\n⚠️ Some mock data found - needs attention');
} else {
  console.log('\n❓ No real implementations found - may need investigation');
}


