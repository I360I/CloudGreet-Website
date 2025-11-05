import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface AnalysisResult {
  name: string
  passed: boolean
  details: string
  severity: 'low' | 'medium' | 'high'
}

async function analyzeCodeQuality(): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = []
  const appDir = path.join(process.cwd(), 'app')
  const libDir = path.join(process.cwd(), 'lib')

    // Check for TypeScript files
    try {
      const files: string[] = []
      
      const findTsFiles = (dir: string) => {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
              findTsFiles(fullPath)
            } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
              files.push(fullPath)
            }
          }
        } catch (err) {
          // Directory might not exist
        }
      }

      findTsFiles(appDir)
      findTsFiles(libDir)

    results.push({
      name: 'TypeScript Files Found',
      passed: files.length > 0,
      details: `Found ${files.length} TypeScript files`,
      severity: files.length > 0 ? 'low' : 'high'
    })

    // Check for missing imports
    let missingImports = 0
    let totalFiles = 0
    for (const file of files.slice(0, 50)) { // Limit to first 50 files
      try {
        const content = fs.readFileSync(file, 'utf-8')
        totalFiles++
        
        // Check for common import patterns
        const hasImports = /^import\s+.*from/.test(content) || /^import\s+['"]/.test(content)
        if (!hasImports && content.length > 100) { // Files > 100 chars should have imports
          missingImports++
        }
      } catch (err) {
        // Skip files that can't be read
      }
    }

    results.push({
      name: 'Import Statements',
      passed: missingImports === 0,
      details: `${missingImports} files missing imports out of ${totalFiles} checked`,
      severity: missingImports > 0 ? 'medium' : 'low'
    })

    // Check for error handling
    let filesWithErrorHandling = 0
    let filesChecked = 0
    for (const file of files.slice(0, 50)) {
      try {
        const content = fs.readFileSync(file, 'utf-8')
        if (content.includes('try') || content.includes('catch')) {
          filesWithErrorHandling++
        }
        if (content.length > 200) {
          filesChecked++
        }
      } catch (err) {
        // Skip
      }
    }

    results.push({
      name: 'Error Handling',
      passed: filesChecked === 0 || filesWithErrorHandling / filesChecked > 0.5,
      details: `${filesWithErrorHandling}/${filesChecked} files have error handling`,
      severity: filesChecked === 0 || filesWithErrorHandling / filesChecked > 0.5 ? 'low' : 'medium'
    })

  } catch (error) {
    results.push({
      name: 'Code Quality Analysis',
      passed: false,
      details: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high'
    })
  }

  return results
}

async function analyzeSecurity(): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = []
  const appDir = path.join(process.cwd(), 'app')
  const libDir = path.join(process.cwd(), 'lib')

  try {
    const files: string[] = []
    
    const findTsFiles = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            findTsFiles(fullPath)
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            files.push(fullPath)
          }
        }
      } catch (err) {
        // Skip
      }
    }

    findTsFiles(appDir)
    findTsFiles(libDir)

    // Check for hardcoded secrets
    let hardcodedSecrets = 0
    let filesWithSecrets: string[] = []
    const secretPatterns = [
      /sk-[a-zA-Z0-9]{32,}/, // OpenAI keys
      /pk_[a-zA-Z0-9]{32,}/, // Stripe keys
      /rk_[a-zA-Z0-9]{32,}/, // Retell keys
      /password\s*=\s*['"][^'"]+['"]/i,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/i
    ]

    for (const file of files.slice(0, 100)) {
      try {
        const content = fs.readFileSync(file, 'utf-8')
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            hardcodedSecrets++
            filesWithSecrets.push(path.basename(file))
            break
          }
        }
      } catch (err) {
        // Skip
      }
    }

    results.push({
      name: 'Hardcoded Secrets',
      passed: hardcodedSecrets === 0,
      details: hardcodedSecrets > 0 
        ? `Found ${hardcodedSecrets} potential secrets in: ${filesWithSecrets.slice(0, 3).join(', ')}`
        : 'No hardcoded secrets found',
      severity: hardcodedSecrets > 0 ? 'high' : 'low'
    })

    // Check for SQL injection patterns
    let sqlInjectionRisk = 0
    for (const file of files.slice(0, 100)) {
      try {
        const content = fs.readFileSync(file, 'utf-8')
        // Look for string concatenation in SQL queries
        if (content.includes('SELECT') || content.includes('INSERT') || content.includes('UPDATE')) {
          if (content.includes('${') && content.includes('SELECT') || 
              content.includes('+') && content.includes('SELECT')) {
            sqlInjectionRisk++
          }
        }
      } catch (err) {
        // Skip
      }
    }

    results.push({
      name: 'SQL Injection Risk',
      passed: sqlInjectionRisk === 0,
      details: sqlInjectionRisk > 0 
        ? `Found ${sqlInjectionRisk} potential SQL injection risks`
        : 'No SQL injection risks detected',
      severity: sqlInjectionRisk > 0 ? 'high' : 'low'
    })

    // Check for environment variable usage
    let envVarUsage = 0
    for (const file of files.slice(0, 100)) {
      try {
        const content = fs.readFileSync(file, 'utf-8')
        if (content.includes('process.env.')) {
          envVarUsage++
        }
      } catch (err) {
        // Skip
      }
    }

    results.push({
      name: 'Environment Variables',
      passed: envVarUsage > 0,
      details: `${envVarUsage} files use environment variables`,
      severity: envVarUsage > 0 ? 'low' : 'medium'
    })

  } catch (error) {
    results.push({
      name: 'Security Analysis',
      passed: false,
      details: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high'
    })
  }

  return results
}

async function analyzePerformance(): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = []
  const appDir = path.join(process.cwd(), 'app/api')

  try {
    const apiFiles: string[] = []
    
    const findApiFiles = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            findApiFiles(fullPath)
          } else if (entry.isFile() && entry.name === 'route.ts') {
            apiFiles.push(fullPath)
          }
        }
      } catch (err) {
        // Skip
      }
    }

    if (fs.existsSync(appDir)) {
      findApiFiles(appDir)
    }

    // Check for N+1 query patterns
    let nPlusOneQueries = 0
    for (const file of apiFiles.slice(0, 50)) {
      try {
        const content = fs.readFileSync(file, 'utf-8')
        // Look for loops with database queries inside
        const hasLoop = /for\s*\(|\.map\s*\(|\.forEach\s*\(/.test(content)
        const hasQuery = /\.from\s*\(|\.select\s*\(/.test(content)
        if (hasLoop && hasQuery) {
          // Check if query is inside loop
          const lines = content.split('\n')
          let inLoop = false
          for (const line of lines) {
            if (/for\s*\(|\.map\s*\(|\.forEach\s*\(/.test(line)) {
              inLoop = true
            }
            if (inLoop && /\.from\s*\(|\.select\s*\(/.test(line)) {
              nPlusOneQueries++
              break
            }
            if (/^[^]*\}/.test(line) && inLoop) {
              inLoop = false
            }
          }
        }
      } catch (err) {
        // Skip
      }
    }

    results.push({
      name: 'N+1 Query Patterns',
      passed: nPlusOneQueries === 0,
      details: nPlusOneQueries > 0 
        ? `Found ${nPlusOneQueries} potential N+1 query patterns`
        : 'No N+1 query patterns detected',
      severity: nPlusOneQueries > 0 ? 'medium' : 'low'
    })

    // Check for select('*') usage
    let selectAllQueries = 0
    for (const file of apiFiles.slice(0, 50)) {
      try {
        const content = fs.readFileSync(file, 'utf-8')
        if (content.includes("select('*'") || content.includes('select("*"')) {
          selectAllQueries++
        }
      } catch (err) {
        // Skip
      }
    }

    results.push({
      name: 'Select All Queries',
      passed: selectAllQueries === 0,
      details: selectAllQueries > 0 
        ? `Found ${selectAllQueries} files using select('*')`
        : 'All queries use specific field selection',
      severity: selectAllQueries > 0 ? 'medium' : 'low'
    })

    results.push({
      name: 'API Route Count',
      passed: apiFiles.length > 0,
      details: `Found ${apiFiles.length} API routes`,
      severity: 'low'
    })

  } catch (error) {
    results.push({
      name: 'Performance Analysis',
      passed: false,
      details: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high'
    })
  }

  return results
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    try {
      await requireAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { analysisType } = body

    let analysis: AnalysisResult[] = []

    switch (analysisType) {
      case 'quality':
        analysis = await analyzeCodeQuality()
        break
      case 'security':
        analysis = await analyzeSecurity()
        break
      case 'performance':
        analysis = await analyzePerformance()
        break
      default:
        return NextResponse.json(
          { error: 'Invalid analysis type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      analysis,
      analysisType,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Code analyzer error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to run analysis' },
      { status: 500 }
    )
  }
}

