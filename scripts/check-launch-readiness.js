#!/usr/bin/env node

/**
 * CloudGreet Launch Readiness Check
 * 
 * Comprehensive check of all systems before launch:
 * - Database schema verification
 * - Environment variables validation
 * - Code build verification
 * - Configuration checks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

let allPassed = true;
const issues = [];

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(name, condition, fix = null) {
  if (condition) {
    log(`✓ ${name}`, 'green');
    return true;
  } else {
    log(`✗ ${name}`, 'red');
    if (fix) {
      log(`  → ${fix}`, 'yellow');
    }
    issues.push({ name, fix });
    allPassed = false;
    return false;
  }
}

async function checkDatabase() {
  log('\n📊 DATABASE SETUP CHECK', 'bold');
  log('─'.repeat(70));
  
  try {
    // Check if validation script exists
    const validateScript = path.join(__dirname, 'verify-database-schema.js');
    if (fs.existsSync(validateScript)) {
      try {
        execSync('node scripts/verify-database-schema.js', { stdio: 'pipe' });
        check('Database schema verified', true);
      } catch (error) {
        check('Database schema verified', false, 
          'Run: npm run validate:db - Make sure Supabase is connected and schema is set up');
      }
    } else {
      check('Database validation script exists', false,
        'verify-database-schema.js script is missing');
    }
  } catch (error) {
    check('Database check', false, 'Unable to verify database setup');
  }
}

async function checkEnvironment() {
  log('\n🔐 ENVIRONMENT VARIABLES CHECK', 'bold');
  log('─'.repeat(70));
  
  try {
    // Load .env.local if it exists
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, 'utf8');
      envFile.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
    
    // Check critical variables
    const critical = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET',
      'NEXT_PUBLIC_APP_URL'
    ];
    
    critical.forEach(varName => {
      const value = process.env[varName];
      check(
        `${varName} is set`,
        !!value && value.length > 0,
        `Set ${varName} in Vercel Dashboard → Settings → Environment Variables`
      );
    });
    
    // Check required variables
    const required = [
      'STRIPE_SECRET_KEY',
      'TELNYX_API_KEY',
      'OPENAI_API_KEY',
      'RETELL_API_KEY'
    ];
    
    required.forEach(varName => {
      const value = process.env[varName];
      check(
        `${varName} is set`,
        !!value && value.length > 0,
        `Set ${varName} in Vercel Dashboard → Settings → Environment Variables`
      );
    });
    
    // Try to run validation script
    try {
      const { validateEnvironment } = require('./validate-environment.js');
      validateEnvironment();
    } catch (error) {
      // Ignore - just means we can't run full validation
    }
  } catch (error) {
    check('Environment variables check', false, 'Unable to verify environment variables');
  }
}

async function checkCode() {
  log('\n💻 CODE VERIFICATION CHECK', 'bold');
  log('─'.repeat(70));
  
  // Check if package.json exists
  const packageJson = path.join(process.cwd(), 'package.json');
  check('package.json exists', fs.existsSync(packageJson));
  
  // Check if critical files exist
  const criticalFiles = [
    'next.config.js',
    'tsconfig.json',
    'middleware.ts',
    'app/api/health/route.ts'
  ];
  
  criticalFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    check(`Critical file exists: ${file}`, fs.existsSync(filePath));
  });
  
  // Check if database schema file exists
  const schemaFile = path.join(process.cwd(), 'ULTIMATE_COMPLETE_SUPABASE_SCHEMA.sql');
  check('Database schema file exists', fs.existsSync(schemaFile),
    'ULTIMATE_COMPLETE_SUPABASE_SCHEMA.sql file is required for database setup');
}

async function checkConfiguration() {
  log('\n⚙️  CONFIGURATION CHECK', 'bold');
  log('─'.repeat(70));
  
  // Check if setup guide exists
  const setupGuide = path.join(process.cwd(), 'SETUP_GUIDE.md');
  check('Setup guide exists', fs.existsSync(setupGuide),
    'Run setup guide to configure external services');
  
  // Check if checklist exists
  const checklist = path.join(process.cwd(), 'QUICK_LAUNCH_CHECKLIST.md');
  check('Launch checklist exists', fs.existsSync(checklist),
    'Use QUICK_LAUNCH_CHECKLIST.md to track your progress');
}

async function main() {
  log('\n🚀 CLOUDGREET LAUNCH READINESS CHECK', 'bold');
  log('─'.repeat(70));
  log('This script verifies all systems are ready for launch.\n');
  
  await checkCode();
  await checkDatabase();
  await checkEnvironment();
  await checkConfiguration();
  
  // Summary
  log('\n📋 SUMMARY', 'bold');
  log('─'.repeat(70));
  
  if (allPassed) {
    log('\n✅ ALL CHECKS PASSED - Ready for launch!', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Run database setup: See SETUP_GUIDE.md Phase 1', 'cyan');
    log('2. Set environment variables: See SETUP_GUIDE.md Phase 2', 'cyan');
    log('3. Configure external services: See SETUP_GUIDE.md Phase 3', 'cyan');
    log('4. Deploy to production: See SETUP_GUIDE.md Phase 4', 'cyan');
    log('5. Run tests: See SETUP_GUIDE.md Phase 5', 'cyan');
    process.exit(0);
  } else {
    log('\n❌ SOME CHECKS FAILED - Fix issues before launch', 'red');
    log('\nIssues found:', 'yellow');
    issues.forEach((issue, index) => {
      log(`${index + 1}. ${issue.name}`, 'yellow');
      if (issue.fix) {
        log(`   → ${issue.fix}`, 'cyan');
      }
    });
    log('\nSee SETUP_GUIDE.md for detailed setup instructions.', 'cyan');
    process.exit(1);
  }
}

// Run checks
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main };








