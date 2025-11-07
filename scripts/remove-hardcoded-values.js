const fs = require('fs');
const path = require('path');

// Hardcoded values to replace
const hardcodedReplacements = [
  {
    // Test emails
    pattern: /test@example\.com/g,
    replacement: 'process.env.TEST_EMAIL || "test@example.com"',
    description: 'Test email addresses'
  },
  {
    // Demo domains
    pattern: /test@yourdomain\.com/g,
    replacement: 'process.env.FROM_EMAIL || "noreply@cloudgreet.com"',
    description: 'Demo email domains'
  },
  {
    // Localhost URLs
    pattern: /http:\/\/localhost:3000/g,
    replacement: 'process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"',
    description: 'Localhost URLs'
  },
  {
    // WebSocket localhost
    pattern: /ws:\/\/localhost:3000/g,
    replacement: 'process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000"',
    description: 'WebSocket localhost URLs'
  },
  {
    // OpenAI API URLs
    pattern: /https:\/\/api\.openai\.com\/v1/g,
    replacement: 'process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1"',
    description: 'OpenAI API base URLs'
  },
  {
    // OpenAI models
    pattern: /model:\s*['"]gpt-4o['"]/g,
    replacement: 'model: process.env.OPENAI_MODEL || "gpt-4o"',
    description: 'OpenAI model names'
  },
  {
    // OpenAI realtime models
    pattern: /model:\s*['"]gpt-4o-realtime-preview-2024-12-17['"]/g,
    replacement: 'model: process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17"',
    description: 'OpenAI realtime model names'
  },
  {
    // Voice IDs
    pattern: /voice_id:\s*['"]openai-alloy['"]/g,
    replacement: 'voice_id: process.env.DEFAULT_VOICE_ID || "openai-alloy"',
    description: 'Default voice IDs'
  },
  {
    // Admin emails
    pattern: /admin@cloudgreet\.com/g,
    replacement: 'process.env.ADMIN_EMAIL || "admin@cloudgreet.com"',
    description: 'Admin email addresses'
  }
];

// Files to process
const targetDirectories = ['app', 'lib'];

// Files to skip
const skipFiles = [
  'scripts',
  'test',
  '.test.',
  '.spec.',
  'node_modules',
  '.next',
  'dist',
  'build',
  'config',
  'env'
];

function shouldSkipFile(filePath) {
  return skipFiles.some(skip => filePath.includes(skip));
}

function addEnvironmentVariables(content, filePath) {
  // Check if file already has environment variable imports
  if (content.includes('process.env.')) {
    return content;
  }

  // Add environment variable comment at the top
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find the last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith('const ') && lines[i].includes('require(')) {
      insertIndex = i + 1;
    }
  }
  
  // Add comment about environment variables
  lines.splice(insertIndex, 0, '// Environment variables are used for configuration');
  return lines.join('\n');
}

function replaceHardcodedValues(content, filePath) {
  let newContent = content;
  let hasChanges = false;
  let replacements = [];

  // Apply each replacement pattern
  hardcodedReplacements.forEach(({ pattern, replacement, description }) => {
    if (pattern.test(newContent)) {
      const matches = [...newContent.matchAll(pattern)];
      newContent = newContent.replace(pattern, replacement);
      hasChanges = true;
      replacements.push({
        description,
        count: matches.length,
        replacement: replacement.substring(0, 50) + '...'
      });
    }
  });

  // Add environment variable comment if changes were made
  if (hasChanges) {
    newContent = addEnvironmentVariables(newContent, filePath);
  }

  return { content: newContent, hasChanges, replacements };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, hasChanges, replacements } = replaceHardcodedValues(content, filePath);
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ ${filePath} - Removed hardcoded values`);
      replacements.forEach(({ description, count }) => {
        console.log(`   📝 ${description}: ${count} replacements`);
      });
      return true;
    } else {
      console.log(`⚪ ${filePath} - No hardcoded values found`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${filePath} - Error: ${error.message}`);
    return false;
  }
}

function getAllFiles(dirPath) {
  const files = [];
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!shouldSkipFile(fullPath)) {
          traverse(fullPath);
        }
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))) {
        if (!shouldSkipFile(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dirPath);
  return files;
}

function createEnvironmentConfig() {
  const envConfig = `# Environment Configuration Template
# Copy this to .env.local and fill in your values

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Email Configuration
FROM_EMAIL=noreply@cloudgreet.com
TEST_EMAIL=test@example.com
ADMIN_EMAIL=admin@cloudgreet.com

# OpenAI Configuration
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17

# Voice Configuration
DEFAULT_VOICE_ID=openai-alloy

# Database Configuration
DATABASE_URL=your_database_url_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key_here

# Authentication
JWT_SECRET=your_jwt_secret_here

# External Services
TELNYX_API_KEY=your_telnyx_api_key_here
RETELL_API_KEY=your_retell_api_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Email Service
RESEND_API_KEY=your_resend_api_key_here

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
`;

  fs.writeFileSync('.env.example', envConfig);
  console.log('📄 Created .env.example template');
}

function main() {
  console.log('🔧 Removing hardcoded values...\n');
  
  let totalProcessed = 0;
  let totalUpdated = 0;
  
  targetDirectories.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📁 Processing ${dir}/ directory...`);
      const files = getAllFiles(dir);
      
      files.forEach(filePath => {
        totalProcessed++;
        if (processFile(filePath)) {
          totalUpdated++;
        }
      });
    }
  });
  
  // Create environment configuration template
  createEnvironmentConfig();
  
  console.log(`\n✅ Processed ${totalProcessed} files`);
  console.log(`✅ Updated ${totalUpdated} files`);
  console.log('\n📋 Hardcoded Values Removal Complete!');
  console.log('\n📋 Benefits:');
  console.log('- Environment-based configuration');
  console.log('- Easier deployment across environments');
  console.log('- Better security practices');
  console.log('- Centralized configuration management');
  console.log('- Reduced hardcoded dependencies');
  console.log('\n📄 Created .env.example template for reference');
  console.log('\n⚠️  Note: Update your .env.local file with the new environment variables');
}

main();

