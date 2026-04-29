#!/usr/bin/env node

// Script to standardize API responses across all routes
const fs = require('fs')
const path = require('path')

function standardizeApiRoute(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    let newContent = content
    
    // Skip if already using api-response
    if (content.includes('api-response') || content.includes('APIResponseHandler')) {
      console.log(`✅ ${filePath} - Already standardized`)
      return
    }
    
    console.log(`🔧 ${filePath} - Standardizing API responses`)
    
    // Add import for api-response
    if (!newContent.includes("import { apiSuccess, apiError, apiNotFound, apiUnauthorized, apiInternalError } from '@/lib/api-response'")) {
      const importMatch = newContent.match(/import.*from.*['"]@\/lib\/monitoring['"]/)
      if (importMatch) {
        newContent = newContent.replace(
          importMatch[0],
          `${importMatch[0]}\nimport { apiSuccess, apiError, apiNotFound, apiUnauthorized, apiInternalError } from '@/lib/api-response'`
        )
      } else {
        // Add after first import
        const firstImport = newContent.match(/import.*from.*['"].*['"];?\n/)
        if (firstImport) {
          newContent = newContent.replace(
            firstImport[0],
            `${firstImport[0]}import { apiSuccess, apiError, apiNotFound, apiUnauthorized, apiInternalError } from '@/lib/api-response'\n`
          )
        }
      }
    }
    
    // Replace common response patterns
    
    // Success responses
    newContent = newContent.replace(
      /return NextResponse\.json\(\{\s*success:\s*true,?\s*([^}]*)\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\)/g,
      (match, data, status) => {
        // Extract data from the response
        const dataMatch = data.match(/data:\s*([^,}]+)/)
        const messageMatch = data.match(/message:\s*['"]([^'"]*)['"]/)
        
        if (dataMatch) {
          return `return apiSuccess(${dataMatch[1]}${messageMatch ? `, '${messageMatch[1]}'` : ''}, ${status})`
        } else {
          return `return apiSuccess(null${messageMatch ? `, '${messageMatch[1]}'` : ''}, ${status})`
        }
      }
    )
    
    // Error responses
    newContent = newContent.replace(
      /return NextResponse\.json\(\{\s*success:\s*false,?\s*error:\s*['"]([^'"]*)['"]\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\)/g,
      (match, errorMessage, status) => {
        return `return apiError('${errorMessage}', ${status})`
      }
    )
    
    // 401 Unauthorized
    newContent = newContent.replace(
      /return NextResponse\.json\(\{\s*error:\s*['"]Unauthorized['"]\s*\}\s*,\s*\{\s*status:\s*401\s*\}\)/g,
      'return apiUnauthorized()'
    )
    
    // 404 Not Found
    newContent = newContent.replace(
      /return NextResponse\.json\(\{\s*error:\s*['"]([^'"]*)['"]\s*\}\s*,\s*\{\s*status:\s*404\s*\}\)/g,
      (match, message) => {
        return `return apiNotFound('${message}')`
      }
    )
    
    // 500 Internal Server Error
    newContent = newContent.replace(
      /return NextResponse\.json\(\{\s*error:\s*['"]Internal server error['"]\s*\}\s*,\s*\{\s*status:\s*500\s*\}\)/g,
      'return apiInternalError()'
    )
    
    // Generic error responses
    newContent = newContent.replace(
      /return NextResponse\.json\(\{\s*error:\s*([^}]+)\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\)/g,
      (match, error, status) => {
        // Handle different error formats
        if (error.includes("'") || error.includes('"')) {
          const errorMatch = error.match(/['"]([^'"]*)['"]/)
          if (errorMatch) {
            return `return apiError('${errorMatch[1]}', ${status})`
          }
        }
        return `return apiError(${error}, ${status})`
      }
    )
    
    // Write back to file if changes were made
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent)
      console.log(`✅ ${filePath} - Standardized`)
    } else {
      console.log(`⚠️  ${filePath} - No changes needed`)
    }
    
  } catch (error) {
    console.error(`❌ ${filePath} - Error: ${error.message}`)
  }
}

function scanApiRoutes() {
  const apiDir = 'app/api'
  const routes = []
  
  function scanDir(dir) {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        scanDir(fullPath)
      } else if (item === 'route.ts') {
        routes.push(fullPath)
      }
    }
  }
  
  scanDir(apiDir)
  return routes
}

console.log('🔧 Standardizing API responses across all routes...\n')

const routes = scanApiRoutes()
let totalUpdated = 0

for (const route of routes) {
  const beforeContent = fs.readFileSync(route, 'utf8')
  standardizeApiRoute(route)
  const afterContent = fs.readFileSync(route, 'utf8')
  
  if (beforeContent !== afterContent) {
    totalUpdated++
  }
}

console.log(`\n✅ Standardized API responses in ${totalUpdated} files`)
console.log('\n📋 Benefits:')
console.log('- Consistent response format across all APIs')
console.log('- Centralized error handling')
console.log('- Better logging and monitoring')
console.log('- Easier client-side integration')
console.log('- Improved debugging capabilities')

