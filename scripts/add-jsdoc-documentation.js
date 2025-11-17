const fs = require('fs');
const path = require('path');

// Get all TypeScript files
function getAllTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Add JSDoc documentation to functions
function addJSDocDocumentation(content) {
  let fixed = content;
  let changes = 0;

  // Add JSDoc to exported functions without documentation
  fixed = fixed.replace(
    /^export\s+(?:async\s+)?function\s+(\w+)\s*\(/gm,
    (match, funcName) => {
      // Check if JSDoc already exists
      const beforeMatch = fixed.substring(0, fixed.indexOf(match));
      const lastComment = beforeMatch.lastIndexOf('/**');
      const lastFunction = beforeMatch.lastIndexOf('export');
      
      if (lastComment > lastFunction) {
        return match; // Already has JSDoc
      }
      
      changes++;
      return `/**
 * ${funcName} - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * \`\`\`typescript
 * await ${funcName}(param1, param2)
 * \`\`\`
 */
${match}`;
    }
  );

  // Add JSDoc to class methods without documentation
  fixed = fixed.replace(
    /^(\s+)(?:async\s+)?(\w+)\s*\(/gm,
    (match, indent, methodName) => {
      // Skip if it's a constructor or already has JSDoc
      if (methodName === 'constructor' || methodName.startsWith('_')) {
        return match;
      }
      
      const beforeMatch = fixed.substring(0, fixed.indexOf(match));
      const lastComment = beforeMatch.lastIndexOf('/**');
      const lastMethod = beforeMatch.lastIndexOf(methodName);
      
      if (lastComment > lastMethod - 50) { // Check within reasonable distance
        return match; // Already has JSDoc
      }
      
      changes++;
      return `${indent}/**
${indent} * ${methodName} - Add description here
${indent} * 
${indent} * @param {...any} args - Method parameters
${indent} * @returns {Promise<any>} Method return value
${indent} * @throws {Error} When operation fails
${indent} * 
${indent} * @example
${indent} * \`\`\`typescript
${indent} * await this.${methodName}(param1, param2)
${indent} * \`\`\`
${indent} */
${match}`;
    }
  );

  // Add JSDoc to arrow functions
  fixed = fixed.replace(
    /^export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\(/gm,
    (match, funcName) => {
      const beforeMatch = fixed.substring(0, fixed.indexOf(match));
      const lastComment = beforeMatch.lastIndexOf('/**');
      const lastFunction = beforeMatch.lastIndexOf('export');
      
      if (lastComment > lastFunction) {
        return match;
      }
      
      changes++;
      return `/**
 * ${funcName} - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * \`\`\`typescript
 * await ${funcName}(param1, param2)
 * \`\`\`
 */
${match}`;
    }
  );

  return { content: fixed, changes };
}

// Main execution
const srcDir = path.join(process.cwd(), 'lib');
const files = getAllTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files to document...`);

let totalFiles = 0;
let totalChanges = 0;

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const result = addJSDocDocumentation(content);
    
    if (result.changes > 0) {
      fs.writeFileSync(file, result.content);
      console.log(`Added JSDoc to ${result.changes} functions in ${path.relative(process.cwd(), file)}`);
      totalFiles++;
      totalChanges += result.changes;
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
}

console.log(`\nAdded JSDoc documentation to ${totalChanges} functions across ${totalFiles} files.`);














