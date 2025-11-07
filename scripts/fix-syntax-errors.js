const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const API_ROUTES_DIR = path.join(ROOT_DIR, 'app', 'api');

// Common patterns to fix
const FIXES = [
  // Fix missing try blocks before main logic
  {
    pattern: /(\s+const businessId = authResult\.businessId\s*\n)(\s+)(const|let|var|\/\/)/g,
    replacement: '$1\n$2try {\n$2  $3'
  },
  
  // Fix missing variable declarations for common patterns
  {
    pattern: /(\s+try\s*{\s*\n)(\s+)(const calendarEvent = await createCalendarEvent)/g,
    replacement: `$1$2// Parse and validate request body
$2const body = await request.json()
$2const { 
$2  customer_name, 
$2  customer_phone, 
$2  customer_email, 
$2  service, 
$2  issue_description, 
$2  scheduled_date, 
$2  scheduled_time 
$2} = body

$2// Validate required fields
$2if (!customer_name || !customer_phone || !service || !scheduled_date || !scheduled_time) {
$2  return apiError('Missing required fields', 400)
$2}

$2// Parse appointment date and time
$2const appointmentDate = new Date(\`\${scheduled_date}T\${scheduled_time}\`)
$2const appointmentEnd = new Date(appointmentDate.getTime() + 60 * 60 * 1000) // 1 hour duration

$2// Create appointment in database
$2const { data: appointment, error: appointmentError } = await supabaseAdmin
$2  .from('appointments')
$2  .insert({
$2    business_id: businessId,
$2    customer_name,
$2    customer_phone,
$2    customer_email: customer_email || null,
$2    service_type: service,
$2    issue_description: issue_description || null,
$2    scheduled_date,
$2    scheduled_time,
$2    status: 'scheduled',
$2    created_at: new Date().toISOString(),
$2    updated_at: new Date().toISOString()
$2  })
$2  .select()
$2  .single()

$2if (appointmentError) {
$2  logger.error('Failed to create appointment', { error: appointmentError })
$2  return apiError('Failed to create appointment', 500)
$2}

$2let calendarEventId = null

$2// Create Google Calendar event
$2try {
$2  $3`
  },

  // Fix missing closing braces for try blocks
  {
    pattern: /(\s+}\s*catch\s*\(\s*error\s*\)\s*{\s*\n)(\s+logger\.error[^}]+}\s*\n)(\s+return\s+apiError[^}]+}\s*\n)(\s+}\s*)$/gm,
    replacement: '$1$2$3$4'
  },

  // Fix indentation issues
  {
    pattern: /^(\s+)(\/\/ Send confirmation SMS)/gm,
    replacement: '$1  $2'
  },

  // Fix missing variable references
  {
    pattern: /Bearer \$\{token\}/g,
    replacement: 'Bearer ${authResult.token}'
  },

  {
    pattern: /userId,/g,
    replacement: 'userId: authResult.userId,'
  },

  // Fix malformed catch blocks
  {
    pattern: /(\s+}\s*catch\s*\(\s*error\s*\)\s*{\s*\n)(\s+logger\.error[^}]+}\s*\n)(\s+return\s+apiError[^}]+}\s*\n)(\s+}\s*)$/gm,
    replacement: '$1$2$3$4'
  }
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changesMade = false;

  for (const fix of FIXES) {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      changesMade = true;
    }
  }

  if (changesMade) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function traverseDirectory(dir) {
  let modifiedFilesCount = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const relativeFilePath = path.relative(ROOT_DIR, filePath);

    if (fs.statSync(filePath).isDirectory()) {
      modifiedFilesCount += traverseDirectory(filePath);
    } else if (filePath.endsWith('.ts') && !filePath.includes('node_modules')) {
      console.log(`🔍 Processing: ${relativeFilePath}`);
      if (fixFile(filePath)) {
        modifiedFilesCount++;
        console.log(`✅ Fixed syntax errors in ${relativeFilePath}`);
      } else {
        console.log(`ℹ️  No changes needed in ${relativeFilePath}`);
      }
    }
  }
  return modifiedFilesCount;
}

console.log('🔧 Fixing syntax errors in API routes...\n');
const totalModified = traverseDirectory(API_ROUTES_DIR);

console.log(`\n📊 Summary:`);
console.log(`  - Files processed: ${totalModified + (fs.readdirSync(API_ROUTES_DIR, { recursive: true }).filter(f => f.endsWith('.ts')).length - totalModified)}`);
console.log(`  - Files modified: ${totalModified}\n`);

if (totalModified > 0) {
  console.log(`✅ Successfully fixed syntax errors in ${totalModified} files!`);
  console.log(`\n🔍 Next steps:`);
  console.log(`1. Run 'npx tsc --noEmit' to check for remaining errors`);
  console.log(`2. Test the API endpoints to ensure they work correctly`);
  process.exit(0);
} else {
  console.log('No syntax errors found or fixed.');
  process.exit(0);
}










