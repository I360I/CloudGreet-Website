#!/usr/bin/env node

/**
 * Migration script to replace localStorage.getItem('token') with fetchWithAuth
 * 
 * This script helps identify and migrate token usage patterns.
 * Manual review required for each file.
 */

const fs = require('fs')
const path = require('path')
const { glob } = require('glob')

const patterns = [
  /localStorage\.getItem\(['"]token['"]\)/g,
  /Authorization.*localStorage\.getItem\(['"]token['"]\)/g,
]

async function findFiles() {
  const files = await glob('app/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/.next/**']
  })
  
  const results = []
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const matches = patterns.some(pattern => pattern.test(content))
    
    if (matches) {
      const lines = content.split('\n')
      const lineNumbers = lines
        .map((line, idx) => ({ line, idx: idx + 1 }))
        .filter(({ line }) => patterns.some(p => p.test(line)))
        .map(({ idx }) => idx)
      
      results.push({
        file,
        lineNumbers,
        count: lineNumbers.length
      })
    }
  }
  
  return results.sort((a, b) => b.count - a.count)
}

async function main() {
  console.log('🔍 Scanning for localStorage token usage...\n')
  
  const files = await findFiles()
  
  console.log(`Found ${files.length} files with localStorage token usage:\n`)
  
  files.forEach(({ file, count, lineNumbers }) => {
    console.log(`  ${file}`)
    console.log(`    ${count} occurrence(s) at lines: ${lineNumbers.join(', ')}`)
  })
  
  console.log(`\n📊 Total: ${files.reduce((sum, f) => sum + f.count, 0)} occurrences`)
  console.log('\n💡 Migration pattern:')
  console.log('   OLD: fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })')
  console.log('   NEW: fetchWithAuth(url)')
  console.log('\n   OLD: const token = localStorage.getItem("token")')
  console.log('   NEW: import { useAuthToken } from "@/hooks/useAuthToken"')
  console.log('        const { token } = useAuthToken()')
}

main().catch(console.error)

