const fs = require('fs');
const path = require('path');

console.log('🔍 Finding REAL broken functionality, unconnected strings, and unfinished work...\n');

const issues = {
  unconnectedStrings: [],
  brokenFunctionality: [],
  unfinishedWork: [],
  sloppyCode: [],
  missingConnections: [],
  hardcodedValues: [],
  todoItems: [],
  consoleLogs: [],
  alertStatements: [],
  emptyFunctions: [],
  missingErrorHandling: [],
  brokenImports: [],
  undefinedVariables: []
};

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // 1. UNCONNECTED STRINGS - Hardcoded URLs, emails, phone numbers that aren't connected
      if (line.includes('http://') || line.includes('https://')) {
        const urlMatch = line.match(/https?:\/\/[^\s"']+/g);
        if (urlMatch) {
          urlMatch.forEach(url => {
            if (!url.includes('localhost') && !url.includes('vercel.app') && !url.includes('cloudgreet.com')) {
              issues.unconnectedStrings.push({
                file: filePath,
                line: lineNum,
                issue: `Unconnected URL: ${url}`,
                code: line.trim()
              });
            }
          });
        }
      }
      
      // 2. BROKEN FUNCTIONALITY - Functions that call APIs but don't handle responses
      if (line.includes('fetch(') && !line.includes('await') && !line.includes('.then(')) {
        issues.brokenFunctionality.push({
          file: filePath,
          line: lineNum,
          issue: 'Fetch without await or .then() - response not handled',
          code: line.trim()
        });
      }
      
      // 3. UNFINISHED WORK - TODO comments and placeholder text
      if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
        issues.todoItems.push({
          file: filePath,
          line: lineNum,
          issue: 'Unfinished work: ' + line.trim(),
          code: line.trim()
        });
      }
      
      // 4. SLOPPY CODE - Console.logs in production code
      if (line.includes('console.log') || line.includes('console.error')) {
        issues.consoleLogs.push({
          file: filePath,
          line: lineNum,
          issue: 'Console statement in production code',
          code: line.trim()
        });
      }
      
      // 5. ALERT STATEMENTS - Unprofessional user experience
      if (line.includes('alert(')) {
        issues.alertStatements.push({
          file: filePath,
          line: lineNum,
          issue: 'Alert statement - unprofessional UX',
          code: line.trim()
        });
      }
      
      // 6. EMPTY FUNCTIONS - Functions that do nothing
      if (line.includes('function') && line.includes('{') && line.includes('}')) {
        const nextLine = lines[index + 1];
        if (nextLine && nextLine.trim() === '}') {
          issues.emptyFunctions.push({
            file: filePath,
            line: lineNum,
            issue: 'Empty function - no implementation',
            code: line.trim()
          });
        }
      }
      
      // 7. MISSING ERROR HANDLING - Try blocks without catch
      if (line.includes('try {') && !content.includes('catch')) {
        issues.missingErrorHandling.push({
          file: filePath,
          line: lineNum,
          issue: 'Try block without catch - missing error handling',
          code: line.trim()
        });
      }
      
      // 8. HARDCODED VALUES - Demo data, test values
      if (line.includes('demo') || line.includes('test') || line.includes('example') || 
          line.includes('placeholder') || line.includes('dummy')) {
        issues.hardcodedValues.push({
          file: filePath,
          line: lineNum,
          issue: 'Hardcoded demo/test value',
          code: line.trim()
        });
      }
      
      // 9. BROKEN IMPORTS - Importing non-existent files
      if (line.includes('import') && line.includes('from')) {
        const importMatch = line.match(/from ['"]([^'"]+)['"]/);
        if (importMatch) {
          const importPath = importMatch[1];
          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const fullPath = path.resolve(path.dirname(filePath), importPath);
            if (!fs.existsSync(fullPath) && !fs.existsSync(fullPath + '.ts') && 
                !fs.existsSync(fullPath + '.tsx') && !fs.existsSync(fullPath + '.js')) {
              issues.brokenImports.push({
                file: filePath,
                line: lineNum,
                issue: `Broken import: ${importPath}`,
                code: line.trim()
              });
            }
          }
        }
      }
      
      // 10. UNDEFINED VARIABLES - Using variables that aren't defined
      if (line.includes('const ') || line.includes('let ') || line.includes('var ')) {
        const varMatch = line.match(/(const|let|var)\s+(\w+)/);
        if (varMatch) {
          const varName = varMatch[2];
          // Check if variable is used but not defined in scope
          const functionStart = content.lastIndexOf('function', index);
          const functionEnd = content.indexOf('}', index);
          if (functionStart > -1 && functionEnd > -1) {
            const functionContent = content.substring(functionStart, functionEnd);
            if (functionContent.includes(varName) && !functionContent.includes(`const ${varName}`) && 
                !functionContent.includes(`let ${varName}`) && !functionContent.includes(`var ${varName}`)) {
              issues.undefinedVariables.push({
                file: filePath,
                line: lineNum,
                issue: `Undefined variable: ${varName}`,
                code: line.trim()
              });
            }
          }
        }
      }
    });
    
  } catch (error) {
    console.log(`❌ Error reading ${filePath}: ${error.message}`);
  }
}

function scanDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!item.startsWith('.') && item !== 'node_modules' && item !== '.next') {
        scanDirectory(fullPath);
      }
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
      scanFile(fullPath);
    }
  });
}

// Scan the project
scanDirectory('.');

// Report findings
console.log('📊 REAL BROKEN FUNCTIONALITY REPORT\n');

Object.keys(issues).forEach(category => {
  const items = issues[category];
  if (items.length > 0) {
    console.log(`\n🔴 ${category.toUpperCase().replace(/([A-Z])/g, ' $1').trim()} (${items.length} issues):`);
    items.slice(0, 10).forEach(item => {
      console.log(`  📁 ${item.file}`);
      console.log(`     Line ${item.line}: ${item.issue}`);
      console.log(`     Code: ${item.code}`);
      console.log('');
    });
    if (items.length > 10) {
      console.log(`     ... and ${items.length - 10} more issues`);
    }
  }
});

// Summary
const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
console.log(`\n📈 SUMMARY:`);
console.log(`Total issues found: ${totalIssues}`);
console.log(`\n🎯 PRIORITY FIXES:`);
console.log(`1. Unconnected strings: ${issues.unconnectedStrings.length}`);
console.log(`2. Broken functionality: ${issues.brokenFunctionality.length}`);
console.log(`3. Unfinished work: ${issues.todoItems.length}`);
console.log(`4. Sloppy code: ${issues.consoleLogs.length + issues.alertStatements.length}`);
console.log(`5. Missing connections: ${issues.missingConnections.length}`);

const path = require('path');

console.log('🔍 Finding REAL broken functionality, unconnected strings, and unfinished work...\n');

const issues = {
  unconnectedStrings: [],
  brokenFunctionality: [],
  unfinishedWork: [],
  sloppyCode: [],
  missingConnections: [],
  hardcodedValues: [],
  todoItems: [],
  consoleLogs: [],
  alertStatements: [],
  emptyFunctions: [],
  missingErrorHandling: [],
  brokenImports: [],
  undefinedVariables: []
};

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // 1. UNCONNECTED STRINGS - Hardcoded URLs, emails, phone numbers that aren't connected
      if (line.includes('http://') || line.includes('https://')) {
        const urlMatch = line.match(/https?:\/\/[^\s"']+/g);
        if (urlMatch) {
          urlMatch.forEach(url => {
            if (!url.includes('localhost') && !url.includes('vercel.app') && !url.includes('cloudgreet.com')) {
              issues.unconnectedStrings.push({
                file: filePath,
                line: lineNum,
                issue: `Unconnected URL: ${url}`,
                code: line.trim()
              });
            }
          });
        }
      }
      
      // 2. BROKEN FUNCTIONALITY - Functions that call APIs but don't handle responses
      if (line.includes('fetch(') && !line.includes('await') && !line.includes('.then(')) {
        issues.brokenFunctionality.push({
          file: filePath,
          line: lineNum,
          issue: 'Fetch without await or .then() - response not handled',
          code: line.trim()
        });
      }
      
      // 3. UNFINISHED WORK - TODO comments and placeholder text
      if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
        issues.todoItems.push({
          file: filePath,
          line: lineNum,
          issue: 'Unfinished work: ' + line.trim(),
          code: line.trim()
        });
      }
      
      // 4. SLOPPY CODE - Console.logs in production code
      if (line.includes('console.log') || line.includes('console.error')) {
        issues.consoleLogs.push({
          file: filePath,
          line: lineNum,
          issue: 'Console statement in production code',
          code: line.trim()
        });
      }
      
      // 5. ALERT STATEMENTS - Unprofessional user experience
      if (line.includes('alert(')) {
        issues.alertStatements.push({
          file: filePath,
          line: lineNum,
          issue: 'Alert statement - unprofessional UX',
          code: line.trim()
        });
      }
      
      // 6. EMPTY FUNCTIONS - Functions that do nothing
      if (line.includes('function') && line.includes('{') && line.includes('}')) {
        const nextLine = lines[index + 1];
        if (nextLine && nextLine.trim() === '}') {
          issues.emptyFunctions.push({
            file: filePath,
            line: lineNum,
            issue: 'Empty function - no implementation',
            code: line.trim()
          });
        }
      }
      
      // 7. MISSING ERROR HANDLING - Try blocks without catch
      if (line.includes('try {') && !content.includes('catch')) {
        issues.missingErrorHandling.push({
          file: filePath,
          line: lineNum,
          issue: 'Try block without catch - missing error handling',
          code: line.trim()
        });
      }
      
      // 8. HARDCODED VALUES - Demo data, test values
      if (line.includes('demo') || line.includes('test') || line.includes('example') || 
          line.includes('placeholder') || line.includes('dummy')) {
        issues.hardcodedValues.push({
          file: filePath,
          line: lineNum,
          issue: 'Hardcoded demo/test value',
          code: line.trim()
        });
      }
      
      // 9. BROKEN IMPORTS - Importing non-existent files
      if (line.includes('import') && line.includes('from')) {
        const importMatch = line.match(/from ['"]([^'"]+)['"]/);
        if (importMatch) {
          const importPath = importMatch[1];
          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const fullPath = path.resolve(path.dirname(filePath), importPath);
            if (!fs.existsSync(fullPath) && !fs.existsSync(fullPath + '.ts') && 
                !fs.existsSync(fullPath + '.tsx') && !fs.existsSync(fullPath + '.js')) {
              issues.brokenImports.push({
                file: filePath,
                line: lineNum,
                issue: `Broken import: ${importPath}`,
                code: line.trim()
              });
            }
          }
        }
      }
      
      // 10. UNDEFINED VARIABLES - Using variables that aren't defined
      if (line.includes('const ') || line.includes('let ') || line.includes('var ')) {
        const varMatch = line.match(/(const|let|var)\s+(\w+)/);
        if (varMatch) {
          const varName = varMatch[2];
          // Check if variable is used but not defined in scope
          const functionStart = content.lastIndexOf('function', index);
          const functionEnd = content.indexOf('}', index);
          if (functionStart > -1 && functionEnd > -1) {
            const functionContent = content.substring(functionStart, functionEnd);
            if (functionContent.includes(varName) && !functionContent.includes(`const ${varName}`) && 
                !functionContent.includes(`let ${varName}`) && !functionContent.includes(`var ${varName}`)) {
              issues.undefinedVariables.push({
                file: filePath,
                line: lineNum,
                issue: `Undefined variable: ${varName}`,
                code: line.trim()
              });
            }
          }
        }
      }
    });
    
  } catch (error) {
    console.log(`❌ Error reading ${filePath}: ${error.message}`);
  }
}

function scanDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!item.startsWith('.') && item !== 'node_modules' && item !== '.next') {
        scanDirectory(fullPath);
      }
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
      scanFile(fullPath);
    }
  });
}

// Scan the project
scanDirectory('.');

// Report findings
console.log('📊 REAL BROKEN FUNCTIONALITY REPORT\n');

Object.keys(issues).forEach(category => {
  const items = issues[category];
  if (items.length > 0) {
    console.log(`\n🔴 ${category.toUpperCase().replace(/([A-Z])/g, ' $1').trim()} (${items.length} issues):`);
    items.slice(0, 10).forEach(item => {
      console.log(`  📁 ${item.file}`);
      console.log(`     Line ${item.line}: ${item.issue}`);
      console.log(`     Code: ${item.code}`);
      console.log('');
    });
    if (items.length > 10) {
      console.log(`     ... and ${items.length - 10} more issues`);
    }
  }
});

// Summary
const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
console.log(`\n📈 SUMMARY:`);
console.log(`Total issues found: ${totalIssues}`);
console.log(`\n🎯 PRIORITY FIXES:`);
console.log(`1. Unconnected strings: ${issues.unconnectedStrings.length}`);
console.log(`2. Broken functionality: ${issues.brokenFunctionality.length}`);
console.log(`3. Unfinished work: ${issues.todoItems.length}`);
console.log(`4. Sloppy code: ${issues.consoleLogs.length + issues.alertStatements.length}`);
console.log(`5. Missing connections: ${issues.missingConnections.length}`);
