'use client'

import React, { useState } from 'react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type Severity = 'low' | 'medium' | 'high'
interface AnalysisResult {
  name: string
  passed: boolean
  details: string
  severity: Severity
}

export default function CodeQualityPage() {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const runCodeAnalysis = async () => {
    setIsAnalyzing(true)
    setAnalysisResults([])
    
    try {
      const response = await fetchWithAuth('/api/admin/code-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisType: 'quality' })
      })

      if (!response.ok) {
        setAnalysisResults([{
          name: 'Code Analysis Error',
          passed: false,
          details: `HTTP ${response.status}`,
          severity: 'high'
        }])
        return
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        setAnalysisResults([{
          name: 'Code Analysis Error',
          passed: false,
          details: 'Invalid response from server',
          severity: 'high'
        }])
        return
      }
      setAnalysisResults((data.analysis as any[]).map((item: any) => ({
        ...item,
        severity: item.passed ? 'low' : 'high'
      })))
    } catch (error) {
      console.error('Error:', error)
      setAnalysisResults([{
        name: 'Code Analysis Error',
        passed: false,
        details: error instanceof Error ? error.message : 'Unknown error',
        severity: 'high'
      }])
    }
    
    setIsAnalyzing(false)
  }

  const runSecurityScan = async () => {
    setIsAnalyzing(true)
    setAnalysisResults([])
    
    try {
      const response = await fetchWithAuth('/api/admin/code-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisType: 'security' })
      })

      if (!response.ok) {
        setAnalysisResults([{
          name: 'Security Scan Error',
          passed: false,
          details: `HTTP ${response.status}`,
          severity: 'high'
        }])
        return
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        setAnalysisResults([{
          name: 'Security Scan Error',
          passed: false,
          details: 'Invalid response from server',
          severity: 'high'
        }])
        return
      }
      setAnalysisResults((data.analysis as any[]).map((item: any) => ({
        ...item,
        severity: item.passed ? 'low' : 'high'
      })))
    } catch (error) {
      console.error('Error:', error)
      setAnalysisResults([{
        name: 'Security Scan Error',
        passed: false,
        details: error instanceof Error ? error.message : 'Unknown error',
        severity: 'high'
      }])
    }
    
    setIsAnalyzing(false)
  }

  const runPerformanceAnalysis = async () => {
    setIsAnalyzing(true)
    setAnalysisResults([])
    
    try {
      const response = await fetchWithAuth('/api/admin/code-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisType: 'performance' })
      })

      if (!response.ok) {
        setAnalysisResults([{
          name: 'Performance Analysis Error',
          passed: false,
          details: `HTTP ${response.status}`,
          severity: 'high'
        }])
        return
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        setAnalysisResults([{
          name: 'Performance Analysis Error',
          passed: false,
          details: 'Invalid response from server',
          severity: 'high'
        }])
        return
      }
      setAnalysisResults((data.analysis as any[]).map((item: any) => ({
        ...item,
        severity: item.passed ? 'low' : 'medium'
      })))
    } catch (error) {
      console.error('Error:', error)
      setAnalysisResults([{
        name: 'Performance Analysis Error',
        passed: false,
        details: error instanceof Error ? error.message : 'Unknown error',
        severity: 'high'
      }])
    }
    
    setIsAnalyzing(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Built-in Code Quality Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={runCodeAnalysis}
          disabled={isAnalyzing}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
        >
          {isAnalyzing ? 'Analyzing...' : 'Run Code Analysis'}
        </button>
        
        <button
          onClick={runSecurityScan}
          disabled={isAnalyzing}
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
        >
          {isAnalyzing ? 'Scanning...' : 'Run Security Scan'}
        </button>
        
        <button
          onClick={runPerformanceAnalysis}
          disabled={isAnalyzing}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
        >
          {isAnalyzing ? 'Analyzing...' : 'Run Performance Analysis'}
        </button>
      </div>

      {analysisResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Analysis Results</h2>
          
          <div className="grid grid-cols-1 gap-4">
            {analysisResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.passed
                    ? 'bg-green-50 border-green-200'
                    : result.severity === 'high'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{result.name}</h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        result.passed
                          ? 'bg-green-100 text-green-800'
                          : result.severity === 'high'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {result.passed ? 'PASSED' : 'FAILED'}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        result.severity === 'high'
                          ? 'bg-red-100 text-red-800'
                          : result.severity === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {result.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  {result.details}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {analysisResults.filter(r => r.passed).length}
                </div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {analysisResults.filter(r => !r.passed && r.severity === 'high').length}
                </div>
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {analysisResults.filter(r => !r.passed && r.severity === 'medium').length}
                </div>
                <div className="text-sm text-gray-600">Medium Priority</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((analysisResults.filter(r => r.passed).length / analysisResults.length) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Quality Score</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
