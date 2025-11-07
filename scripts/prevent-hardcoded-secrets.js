#!/usr/bin/env node

/**
 * Script to prevent hardcoded secrets in the codebase
 * Run this in CI/CD pipeline to catch hardcoded secrets before deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns that indicate potential hardcoded secrets
const SECRET_PATTERNS = [
  // API Keys
  /(api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9+/=]{20,}['"]/gi,
  /(secret[_-]?key|secretkey)\s*[:=]\s*['"][a-zA-Z0-9+/=]{20,}['"]/gi,
  /(private[_-]?key|privatekey)\s*[:=]\s*['"][a-zA-Z0-9+/=]{20,}['"]/gi,
  /(auth[_-]?token|authtoken)\s*[:=]\s*['"][a-zA-Z0-9+/=]{20,}['"]/gi,
  /(jwt[_-]?secret|jwtsecret)\s*[:=]\s*['"][a-zA-Z0-9+/=]{20,}['"]/gi,
  
  // Common secret patterns
  /(password|passwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
  /(token)\s*[:=]\s*['"][a-zA-Z0-9+/=]{20,}['"]/gi,
  
  // Database credentials
  /(database[_-]?url|db[_-]?url)\s*[:=]\s*['"][^'"]*:\/\/[^'"]*['"]/gi,
  
  // AWS credentials
  /(aws[_-]?access[_-]?key[_-]?id|awsaccesskeyid)\s*[:=]\s*['"][A-Z0-9]{20}['"]/gi,
  /(aws[_-]?secret[_-]?access[_-]?key|awssecretaccesskey)\s*[:=]\s*['"][a-zA-Z0-9+/=]{40}['"]/gi,
  
  // Stripe keys
  /(stripe[_-]?secret[_-]?key|stripesecretkey)\s*[:=]\s*['"]sk_[a-zA-Z0-9]{20,}['"]/gi,
  /(stripe[_-]?publishable[_-]?key|stripepublishablekey)\s*[:=]\s*['"]pk_[a-zA-Z0-9]{20,}['"]/gi,
  
  // OpenAI keys
  /(openai[_-]?api[_-]?key|openaiapikey)\s*[:=]\s*['"]sk-[a-zA-Z0-9]{20,}['"]/gi,
  
  // Twilio credentials
  /(twilio[_-]?account[_-]?sid|twilioaccountsid)\s*[:=]\s*['"][A-Za-z0-9]{32}['"]/gi,
  /(twilio[_-]?auth[_-]?token|twilioauthtoken)\s*[:=]\s*['"][a-zA-Z0-9]{32}['"]/gi,
];

// Files/directories to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,
  /\.env\.example$/,
  /\.env\.local$/,
  /\.env$/,
  /test/,
  /tests/,
  /__tests__/,
  /\.test\./,
  /\.spec\./,
  /jest\.setup\.js$/,
  /scripts\/test-/,
  /scripts\/security-audit\.js$/,
  /ADMIN_SECURITY_AUDIT\.md$/,
  /scripts\/deploy-all\.ps1$/,
];

// Acceptable patterns (not considered secrets)
const ACCEPTABLE_PATTERNS = [
  // Test data
  /test[_-]?password/gi,
  /test[_-]?key/gi,
  /test[_-]?secret/gi,
  /test[_-]?token/gi,
  /mock[_-]?/gi,
  /fake[_-]?/gi,
  /dummy[_-]?/gi,
  
  // Configuration objects (not secrets)
  /key:\s*['"][a-z_]+['"]/gi,
  /label:\s*['"][^'"]+['"]/gi,
  /icon:\s*[A-Z]/gi,
  
  // Environment variable references
  /process\.env\./gi,
  /process\.env\[/gi,
  
  // Comments and documentation
  /\/\/.*['"][^'"]*['"]/gi,
  /\/\*.*['"][^'"]*['"]/gi,
  /#.*['"][^'"]*['"]/gi,
  
  // Log messages and error messages
  /logger\.(error|warn|info|debug)\(/gi,
  /console\.(log|error|warn|info|debug)\(/gi,
  /Error updating password/gi,
  /Error storing reset token/gi,
  /Create a password/gi,
  /Unknown error/gi,
  
  // Object property names
  /PASSWORD:\s*['"][^'"]*['"]/gi,
  /password:\s*['"][^'"]*['"]/gi,
  
  // Function parameters and variable names
  /password[_-]?hash/gi,
  /password[_-]?field/gi,
  /password[_-]?input/gi,
  /password[_-]?validation/gi,
];

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function isAcceptableMatch(match, line, filePath) {
  // Check if it's in a comment or documentation
  if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('#')) {
    return true;
  }
  
  // Check against acceptable patterns
  return ACCEPTABLE_PATTERNS.some(pattern => pattern.test(line));
}

function scanFile(filePath) {
  const issues = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      SECRET_PATTERNS.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            if (!isAcceptableMatch(match, line, filePath)) {
              issues.push({
                file: filePath,
                line: index + 1,
                match: match,
                fullLine: line.trim()
              });
            }
          });
        }
      });
    });
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
      } else if (stat.isFile() && !shouldExcludeFile(fullPath)) {
        // Only scan JavaScript/TypeScript files
        if (/\.(js|ts|jsx|tsx)$/.test(item)) {
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
  console.log('🔍 Scanning for hardcoded secrets...\n');
  
  const rootDir = process.cwd();
  const issues = scanDirectory(rootDir);
  
  if (issues.length === 0) {
    console.log('✅ No hardcoded secrets found!');
    process.exit(0);
  }
  
  console.log(`❌ Found ${issues.length} potential hardcoded secrets:\n`);
  
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.file}:${issue.line}`);
    console.log(`   Match: ${issue.match}`);
    console.log(`   Line:  ${issue.fullLine}\n`);
  });
  
  console.log('🚨 Hardcoded secrets detected! Please:');
  console.log('1. Replace hardcoded values with environment variables');
  console.log('2. Add the variable to .env.example');
  console.log('3. Update your .env.local file');
  console.log('4. Re-run this check\n');
  
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { scanFile, scanDirectory, SECRET_PATTERNS };
