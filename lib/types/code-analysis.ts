/**
 * Type definitions for code analysis results
 */

export interface CodeAnalysisItem {
  name: string
  passed: boolean
  details?: string
  severity?: 'low' | 'medium' | 'high'
  [key: string]: unknown
}

export interface CodeAnalysisResponse {
  success: boolean
  analysis: CodeAnalysisItem[]
  [key: string]: unknown
}




