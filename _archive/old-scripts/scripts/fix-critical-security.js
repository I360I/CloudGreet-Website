const fs = require('fs');
const path = require('path');




const apiDir = path.join(__dirname, '../app/api');

function fixEnvironmentVariableValidation(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix missing environment variable validation
  const envVarPattern = /const (\w+) = process\.env\.(\w+)/g;
  let match;
  
  while ((match = envVarPattern.exec(content)) !== null) {
    const varName = match[1];
    const envName = match[2];
    
    // Check if validation already exists
    const nextLine = content.split('\n')[content.substring(0, match.index).split('\n').length];
    if (!nextLine.includes('if (!') && !nextLine.includes('throw new Error')) {
      const replacement = `const ${varName} = process.env.${envName}
  if (!${varName}) {
    return NextResponse.json({ error: 'Missing ${envName} environment variable' }, { status: 500 })
  }`;
      
      content = content.replace(match[0], replacement);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    }`);
  }
}

function fixErrorMessageSanitization(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix error message sanitization
  const errorPattern = /error: error instanceof Error \? error\.message : 'Unknown error'/g;
  const sanitizedReplacement = `error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'`;
  
  if (errorPattern.test(content)) {
    content = content.replace(errorPattern, sanitizedReplacement);
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    }`);
  }
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (file.endsWith('.ts') && file.includes('route.ts')) {
      fixEnvironmentVariableValidation(filePath);
      fixErrorMessageSanitization(filePath);
    }
  });
}

scanDirectory(apiDir);




