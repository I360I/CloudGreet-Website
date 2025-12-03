const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const API_ROUTES_DIR = path.join(ROOT_DIR, 'app', 'api');

// Comprehensive syntax fixes
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changesMade = false;

  // Fix missing try blocks before main logic
  content = content.replace(
    /(\s+const businessId = authResult\.businessId\s*\n)(\s+)(const|let|var|\/\/)/g,
    '$1\n$2try {\n$2  $3'
  );

  // Fix missing catch blocks
  content = content.replace(
    /(\s+}\s*)(\n\s*return NextResponse\.json)/g,
    '$1\n    } catch (error) {\n      logger.error(\'Operation failed\', { error: error instanceof Error ? error.message : \'Unknown error\' })\n      return apiError(\'Operation failed\', 500)\n    }$2'
  );

  // Fix malformed catch blocks
  content = content.replace(
    /(\s+}\s*catch\s*\(\s*error\s*\)\s*{\s*\n)(\s+logger\.error[^}]+}\s*\n)(\s+return\s+apiError[^}]+}\s*\n)(\s+}\s*)$/gm,
    '$1$2$3$4'
  );

  // Fix missing commas in object literals
  content = content.replace(/(\w+):\s*(\w+)\s*(\w+):\s*(\w+)/g, '$1: $2,\n    $3: $4');

  // Fix missing variable declarations
  content = content.replace(
    /(\s+try\s*{\s*\n)(\s+)(const calendarEvent = await createCalendarEvent)/g,
    `$1$2// Parse and validate request body
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
  );

  // Fix indentation issues
  content = content.replace(/^(\s+)(\/\/ Send confirmation SMS)/gm, '$1  $2');

  // Fix missing variable references
  content = content.replace(/Bearer \$\{token\}/g, 'Bearer ${authResult.token}');
  content = content.replace(/userId,/g, 'userId: authResult.userId,');

  // Fix duplicate catch blocks
  content = content.replace(
    /(\s+}\s*catch\s*\(\s*error\s*\)\s*{\s*\n)(\s+logger\.error[^}]+}\s*\n)(\s+return\s+apiError[^}]+}\s*\n)(\s+}\s*)(\s+}\s*catch\s*\(\s*error\s*\)\s*{\s*\n)(\s+logger\.error[^}]+}\s*\n)(\s+return\s+apiError[^}]+}\s*\n)(\s+}\s*)$/gm,
    '$1$2$3$4'
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    changesMade = true;
  }
  return changesMade;
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
      if (fixFile(filePath)) {
        modifiedFilesCount++;
        console.log(`✅ Fixed: ${relativeFilePath}`);
      }
    }
  }
  return modifiedFilesCount;
}

console.log('🔧 Fixing all remaining syntax errors...\n');
const totalModified = traverseDirectory(API_ROUTES_DIR);
console.log(`\n✅ Fixed ${totalModified} files`);















