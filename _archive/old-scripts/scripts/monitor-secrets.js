#!/usr/bin/env node

/**
 * Secrets Monitoring Script
 * Monitors secret usage, expiration, and security status
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Secret monitoring configuration
const SECRET_MONITORING = {
  'JWT_SECRET': {
    maxAge: 90, // days
    lastRotated: null,
    usage: 'authentication',
    riskLevel: 'high'
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    maxAge: 180,
    lastRotated: null,
    usage: 'database',
    riskLevel: 'critical'
  },
  'OPENAI_API_KEY': {
    maxAge: 365,
    lastRotated: null,
    usage: 'ai_services',
    riskLevel: 'high'
  },
  'RETELL_API_KEY': {
    maxAge: 365,
    lastRotated: null,
    usage: 'ai_services',
    riskLevel: 'high'
  },
  'TELNYX_API_KEY': {
    maxAge: 365,
    lastRotated: null,
    usage: 'telecommunications',
    riskLevel: 'high'
  },
  'STRIPE_SECRET_KEY': {
    maxAge: 365,
    lastRotated: null,
    usage: 'payments',
    riskLevel: 'critical'
  },
  'RESEND_API_KEY': {
    maxAge: 365,
    lastRotated: null,
    usage: 'email',
    riskLevel: 'medium'
  }
};

function loadSecretsMetadata() {
  const metadataFile = path.join(__dirname, '..', 'secrets-metadata.json');
  if (fs.existsSync(metadataFile)) {
    return JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
  }
  return {};
}

function saveSecretsMetadata(metadata) {
  const metadataFile = path.join(__dirname, '..', 'secrets-metadata.json');
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
}

function checkSecretAge(secretName, lastRotated, maxAge) {
  if (!lastRotated) {
    return { status: 'unknown', daysSinceRotation: null };
  }
  
  const now = new Date();
  const rotationDate = new Date(lastRotated);
  const daysSinceRotation = Math.floor((now - rotationDate) / (1000 * 60 * 60 * 24));
  
  if (daysSinceRotation > maxAge) {
    return { status: 'expired', daysSinceRotation };
  } else if (daysSinceRotation > maxAge * 0.8) {
    return { status: 'expiring_soon', daysSinceRotation };
  } else {
    return { status: 'fresh', daysSinceRotation };
  }
}

function checkSecretStrength(secretName, secretValue) {
  const checks = {
    length: secretValue.length >= 32,
    complexity: /[A-Z]/.test(secretValue) && /[a-z]/.test(secretValue) && /[0-9]/.test(secretValue),
    specialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secretValue),
    noCommonPatterns: !/(password|secret|key|123|abc)/i.test(secretValue)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  const strength = score >= 3 ? 'strong' : score >= 2 ? 'medium' : 'weak';
  
  return { strength, score, checks };
}

function checkSecretUsage(secretName, secretValue) {
  // Check if secret is used in code (basic check)
  const codeFiles = [
    path.join(__dirname, '..', 'app'),
    path.join(__dirname, '..', 'lib'),
    path.join(__dirname, '..', 'scripts')
  ];
  
  let usageCount = 0;
  const usageFiles = [];
  
  codeFiles.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = getAllFiles(dir);
      files.forEach(file => {
        if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes(secretName)) {
            usageCount++;
            usageFiles.push(file);
          }
        }
      });
    }
  });
  
  return { usageCount, usageFiles };
}

function getAllFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files = files.concat(getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  });
  
  return files;
}

function generateSecurityReport() {
  console.log('🔒 Generating security report...\n');
  
  const env = loadEnvFile(path.join(__dirname, '..', '.env.local'));
  const metadata = loadSecretsMetadata();
  const report = {
    timestamp: new Date().toISOString(),
    secrets: {},
    summary: {
      total: 0,
      expired: 0,
      expiringSoon: 0,
      weak: 0,
      unused: 0,
      criticalIssues: 0
    }
  };
  
  Object.entries(SECRET_MONITORING).forEach(([secretName, config]) => {
    const secretValue = env[secretName];
    const secretMetadata = metadata[secretName] || {};
    
    if (!secretValue) {
      report.secrets[secretName] = {
        status: 'missing',
        riskLevel: config.riskLevel,
        usage: config.usage
      };
      report.summary.total++;
      return;
    }
    
    // Check age
    const ageCheck = checkSecretAge(secretName, secretMetadata.lastRotated, config.maxAge);
    
    // Check strength
    const strengthCheck = checkSecretStrength(secretName, secretValue);
    
    // Check usage
    const usageCheck = checkSecretUsage(secretName, secretValue);
    
    const secretReport = {
      status: ageCheck.status,
      daysSinceRotation: ageCheck.daysSinceRotation,
      strength: strengthCheck.strength,
      strengthScore: strengthCheck.score,
      usageCount: usageCheck.usageCount,
      riskLevel: config.riskLevel,
      usage: config.usage,
      lastRotated: secretMetadata.lastRotated,
      recommendations: []
    };
    
    // Generate recommendations
    if (ageCheck.status === 'expired') {
      secretReport.recommendations.push('Rotate immediately');
      report.summary.expired++;
    } else if (ageCheck.status === 'expiring_soon') {
      secretReport.recommendations.push('Schedule rotation soon');
      report.summary.expiringSoon++;
    }
    
    if (strengthCheck.strength === 'weak') {
      secretReport.recommendations.push('Improve secret strength');
      report.summary.weak++;
    }
    
    if (usageCheck.usageCount === 0) {
      secretReport.recommendations.push('Verify secret is being used');
      report.summary.unused++;
    }
    
    if (config.riskLevel === 'critical' && (ageCheck.status === 'expired' || strengthCheck.strength === 'weak')) {
      report.summary.criticalIssues++;
    }
    
    report.secrets[secretName] = secretReport;
    report.summary.total++;
  });
  
  return report;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

function displaySecurityReport(report) {
  console.log('🔒 Security Report');
  console.log(`Generated: ${report.timestamp}\n`);
  
  console.log('📊 Summary:');
  console.log(`   Total secrets: ${report.summary.total}`);
  console.log(`   Expired: ${report.summary.expired}`);
  console.log(`   Expiring soon: ${report.summary.expiringSoon}`);
  console.log(`   Weak strength: ${report.summary.weak}`);
  console.log(`   Unused: ${report.summary.unused}`);
  console.log(`   Critical issues: ${report.summary.criticalIssues}\n`);
  
  console.log('🔍 Secret Details:\n');
  
  Object.entries(report.secrets).forEach(([secretName, secretReport]) => {
    const statusIcon = secretReport.status === 'expired' ? '❌' : 
                      secretReport.status === 'expiring_soon' ? '⚠️' : 
                      secretReport.status === 'missing' ? '❓' : '✅';
    
    console.log(`${statusIcon} ${secretName}:`);
    console.log(`   Status: ${secretReport.status}`);
    console.log(`   Risk Level: ${secretReport.riskLevel}`);
    console.log(`   Usage: ${secretReport.usage}`);
    
    if (secretReport.daysSinceRotation !== null) {
      console.log(`   Days since rotation: ${secretReport.daysSinceRotation}`);
    }
    
    if (secretReport.strength) {
      console.log(`   Strength: ${secretReport.strength} (${secretReport.strengthScore}/4)`);
    }
    
    if (secretReport.usageCount !== undefined) {
      console.log(`   Usage count: ${secretReport.usageCount}`);
    }
    
    if (secretReport.recommendations.length > 0) {
      console.log(`   Recommendations:`);
      secretReport.recommendations.forEach(rec => {
        console.log(`      - ${rec}`);
      });
    }
    
    console.log('');
  });
  
  // Overall recommendations
  if (report.summary.criticalIssues > 0) {
    console.log('🚨 Critical Issues Found!');
    console.log('   Immediate action required for production security.');
  } else if (report.summary.expired > 0 || report.summary.expiringSoon > 0) {
    console.log('⚠️  Attention Required');
    console.log('   Some secrets need rotation or attention.');
  } else {
    console.log('✅ All secrets are in good condition');
  }
}

function monitorSecrets() {
  console.log('🔍 Monitoring secrets...\n');
  
  const report = generateSecurityReport();
  displaySecurityReport(report);
  
  // Save report
  const reportFile = path.join(__dirname, '..', 'security-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📁 Report saved to: ${reportFile}`);
  
  // Return exit code based on critical issues
  return report.summary.criticalIssues === 0 ? 0 : 1;
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'monitor':
      const exitCode = monitorSecrets();
      process.exit(exitCode);
      break;
      
    case 'check':
      console.log('🔍 Quick security check...\n');
      const report = generateSecurityReport();
      
      if (report.summary.criticalIssues > 0) {
        console.log('❌ Critical security issues found!');
        process.exit(1);
      } else if (report.summary.expired > 0) {
        console.log('⚠️  Some secrets have expired');
        process.exit(1);
      } else {
        console.log('✅ No critical security issues');
        process.exit(0);
      }
      break;
      
    default:
      console.log('🔒 Secrets Monitoring Script');
      console.log('');
      console.log('Usage:');
      console.log('  node monitor-secrets.js monitor    # Full security report');
      console.log('  node monitor-secrets.js check      # Quick security check');
      console.log('');
      console.log('Examples:');
      console.log('  node monitor-secrets.js monitor');
      console.log('  node monitor-secrets.js check');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateSecurityReport, monitorSecrets };














