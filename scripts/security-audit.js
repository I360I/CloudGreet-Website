const fs = require('fs');
const path = require('path');

console.log('🔒 SECURITY AUDIT - IDENTIFYING VULNERABILITIES');
console.log('===============================================\n');

const apiDir = path.join(__dirname, '../app/api');
const issues = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for missing input sanitization
    if (line.includes('req.body') && !line.includes('sanitize') && !line.includes('validate')) {
      if (!line.includes('//') && !line.includes('*')) {
        issues.push({
          file: filePath.replace(__dirname + '/../', ''),
          line: lineNum,
          issue: 'Missing input sanitization',
          code: line.trim()
        });
      }
    }
    
    // Check for missing environment variable validation
    if (line.includes('process.env.') && !line.includes('||') && !line.includes('?') && !line.includes('!')) {
      if (!line.includes('//') && !line.includes('*')) {
        issues.push({
          file: filePath.replace(__dirname + '/../', ''),
          line: lineNum,
          issue: 'Missing environment variable validation',
          code: line.trim()
        });
      }
    }
    
    // Check for hardcoded secrets
    if (line.includes('sk-') || line.includes('pk_') || line.includes('whsec_') || line.includes('password')) {
      if (!line.includes('process.env.') && !line.includes('//') && !line.includes('*')) {
        issues.push({
          file: filePath.replace(__dirname + '/../', ''),
          line: lineNum,
          issue: 'Potential hardcoded secret',
          code: line.trim()
        });
      }
    }
    
    // Check for missing error message sanitization
    if (line.includes('error.message') && !line.includes('sanitize')) {
      if (!line.includes('//') && !line.includes('*')) {
        issues.push({
          file: filePath.replace(__dirname + '/../', ''),
          line: lineNum,
          issue: 'Missing error message sanitization',
          code: line.trim()
        });
      }
    }
    
    // Check for missing rate limiting
    if (line.includes('req.') && !line.includes('rate') && !line.includes('limit')) {
      if (line.includes('POST') || line.includes('PUT') || line.includes('DELETE')) {
        if (!line.includes('//') && !line.includes('*')) {
          issues.push({
            file: filePath.replace(__dirname + '/../', ''),
            line: lineNum,
            issue: 'Missing rate limiting consideration',
            code: line.trim()
          });
        }
      }
    }
  });
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (file.endsWith('.ts') && file.includes('route.ts')) {
      scanFile(filePath);
    }
  });
}

scanDirectory(apiDir);

console.log(`🔍 Found ${issues.length} security issues:\n`);

issues.forEach((issue, index) => {
  console.log(`${index + 1}. ${issue.issue}`);
  console.log(`   File: ${issue.file}:${issue.line}`);
  console.log(`   Code: ${issue.code}`);
  console.log('');
});

console.log('🔒 SECURITY AUDIT COMPLETE!');
console.log(`📊 Total Issues: ${issues.length}`);


