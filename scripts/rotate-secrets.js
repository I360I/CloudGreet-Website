#!/usr/bin/env node

/**
 * Secrets Rotation Script
 * Manually rotate application secrets with proper validation and rollback
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const SECRETS_CONFIG = {
  jwt_secret: {
    type: 'jwt_secret',
    rotationInterval: 90,
    generateNew: () => crypto.randomBytes(64).toString('hex')
  },
  webhook_secret: {
    type: 'webhook_secret', 
    rotationInterval: 90,
    generateNew: () => crypto.randomBytes(32).toString('hex')
  },
  api_key: {
    type: 'api_key',
    rotationInterval: 365,
    generateNew: () => crypto.randomBytes(32).toString('hex')
  }
};

// Backup directory for old secrets
const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'secrets');
const ENV_FILE = path.join(__dirname, '..', '.env.local');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function backupCurrentSecrets() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `secrets-backup-${timestamp}.json`);
  
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const secrets = {};
  
  // Parse environment variables
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      secrets[key.trim()] = value.trim();
    }
  });
  
  fs.writeFileSync(backupFile, JSON.stringify(secrets, null, 2));
  console.log(`✅ Secrets backed up to: ${backupFile}`);
  return backupFile;
}

function generateNewSecret(secretName, secretType) {
  const config = SECRETS_CONFIG[secretType];
  if (!config) {
    throw new Error(`Unknown secret type: ${secretType}`);
  }
  
  return config.generateNew();
}

function updateEnvFile(secretName, newValue) {
  let envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const lines = envContent.split('\n');
  
  let updated = false;
  const newLines = lines.map(line => {
    if (line.startsWith(`${secretName}=`)) {
      updated = true;
      return `${secretName}=${newValue}`;
    }
    return line;
  });
  
  if (!updated) {
    newLines.push(`${secretName}=${newValue}`);
  }
  
  fs.writeFileSync(ENV_FILE, newLines.join('\n'));
  console.log(`✅ Updated ${secretName} in .env.local`);
}

function validateSecret(secretName, secretValue) {
  // Basic validation based on secret type
  switch (secretName) {
    case 'JWT_SECRET':
      if (secretValue.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters');
      }
      break;
    case 'RETELL_WEBHOOK_SECRET':
    case 'TELNYX_WEBHOOK_SECRET':
    case 'STRIPE_WEBHOOK_SECRET':
      if (secretValue.length < 16) {
        throw new Error('Webhook secret must be at least 16 characters');
      }
      break;
    case 'OPENAI_API_KEY':
      if (!secretValue.startsWith('sk-')) {
        throw new Error('OpenAI API key must start with "sk-"');
      }
      break;
    case 'STRIPE_SECRET_KEY':
      if (!secretValue.startsWith('sk_')) {
        throw new Error('Stripe secret key must start with "sk_"');
      }
      break;
  }
}

function rotateSecret(secretName, secretType = 'api_key') {
  console.log(`🔄 Rotating secret: ${secretName}`);
  
  try {
    // Generate new secret
    const newValue = generateNewSecret(secretName, secretType);
    
    // Validate new secret
    validateSecret(secretName, newValue);
    
    // Update environment file
    updateEnvFile(secretName, newValue);
    
    console.log(`✅ Successfully rotated ${secretName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to rotate ${secretName}:`, error.message);
    return false;
  }
}

function rotateAllSecrets() {
  console.log('🔄 Starting rotation of all secrets...\n');
  
  const secretsToRotate = [
    { name: 'JWT_SECRET', type: 'jwt_secret' },
    { name: 'RETELL_WEBHOOK_SECRET', type: 'webhook_secret' },
    { name: 'TELNYX_WEBHOOK_SECRET', type: 'webhook_secret' },
    { name: 'STRIPE_WEBHOOK_SECRET', type: 'webhook_secret' },
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  // Backup current secrets
  const backupFile = backupCurrentSecrets();
  
  // Rotate each secret
  secretsToRotate.forEach(({ name, type }) => {
    if (rotateSecret(name, type)) {
      successCount++;
    } else {
      failCount++;
    }
  });
  
  console.log(`\n📊 Rotation Summary:`);
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📁 Backup: ${backupFile}`);
  
  if (failCount > 0) {
    console.log(`\n⚠️  Some secrets failed to rotate. Check the backup file for rollback.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All secrets rotated successfully!`);
    console.log(`\n📋 Next steps:`);
    console.log(`  1. Restart the application to load new secrets`);
    console.log(`  2. Test all integrations to ensure they work with new secrets`);
    console.log(`  3. Update any external services with new webhook secrets`);
    console.log(`  4. Keep the backup file secure for potential rollback`);
  }
}

function rollbackSecrets(backupFile) {
  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    process.exit(1);
  }
  
  console.log(`🔄 Rolling back secrets from: ${backupFile}`);
  
  try {
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    // Update environment file with backup values
    let envContent = fs.readFileSync(ENV_FILE, 'utf8');
    const lines = envContent.split('\n');
    
    const newLines = lines.map(line => {
      const [key] = line.split('=');
      if (key && backupData[key.trim()]) {
        return `${key.trim()}=${backupData[key.trim()]}`;
      }
      return line;
    });
    
    fs.writeFileSync(ENV_FILE, newLines.join('\n'));
    console.log(`✅ Successfully rolled back secrets`);
    console.log(`📋 Next steps:`);
    console.log(`  1. Restart the application`);
    console.log(`  2. Verify all services are working`);
  } catch (error) {
    console.error(`❌ Failed to rollback secrets:`, error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  ensureBackupDir();
  
  switch (command) {
    case 'rotate':
      const secretName = args[1];
      const secretType = args[2] || 'api_key';
      
      if (secretName) {
        rotateSecret(secretName, secretType);
      } else {
        rotateAllSecrets();
      }
      break;
      
    case 'rollback':
      const backupFile = args[1];
      if (!backupFile) {
        console.error('❌ Please provide backup file path');
        console.log('Usage: node rotate-secrets.js rollback <backup-file>');
        process.exit(1);
      }
      rollbackSecrets(backupFile);
      break;
      
    case 'list':
      console.log('📋 Available secrets for rotation:');
      console.log('  - JWT_SECRET (jwt_secret)');
      console.log('  - RETELL_WEBHOOK_SECRET (webhook_secret)');
      console.log('  - TELNYX_WEBHOOK_SECRET (webhook_secret)');
      console.log('  - STRIPE_WEBHOOK_SECRET (webhook_secret)');
      break;
      
    default:
      console.log('🔐 Secrets Rotation Script');
      console.log('');
      console.log('Usage:');
      console.log('  node rotate-secrets.js rotate [secret-name] [secret-type]');
      console.log('  node rotate-secrets.js rollback <backup-file>');
      console.log('  node rotate-secrets.js list');
      console.log('');
      console.log('Examples:');
      console.log('  node rotate-secrets.js rotate                    # Rotate all secrets');
      console.log('  node rotate-secrets.js rotate JWT_SECRET jwt_secret');
      console.log('  node rotate-secrets.js rollback backups/secrets/secrets-backup-2024-01-01T00-00-00-000Z.json');
      console.log('  node rotate-secrets.js list');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = { rotateSecret, rotateAllSecrets, rollbackSecrets };















