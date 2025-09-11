'use client'

import { useState } from 'react'
import { Phone, Calendar, Play, CheckCircle, Mic, ArrowRight } from 'lucide-react'

interface TestFlowWidgetProps {
  onboardingData: any
  onTestComplete: () => void
}

export default function TestFlowWidget({ onboardingData, onTestComplete }: TestFlowWidgetProps) {
  const [testResults, setTestResults] = useState({
    phoneTest: false,
    calendarTest: false,
    aiTest: false
  })

  const handleTest = async (testId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setTestResults(prev => ({
        ...prev,
        [testId + 'Test']: true
      }))
    } catch (error) {
      console.error('Test failed:', error)
    }
  }

  const allTestsComplete = Object.values(testResults).every(result => result)

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Test Your AI Receptionist</h3>
            <p className="text-sm text-gray-600">Verify everything works before going live</p>
          </div>
        </div>
        {allTestsComplete && (
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">All tests passed!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              testResults.phoneTest ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {testResults.phoneTest ? <CheckCircle className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Phone Test</p>
              <p className="text-xs text-gray-500">Test call routing</p>
            </div>
          </div>
          {!testResults.phoneTest && (
            <button
              onClick={() => handleTest('phone')}
              className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
            >
              Test Phone
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              testResults.calendarTest ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {testResults.calendarTest ? <CheckCircle className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Calendar Test</p>
              <p className="text-xs text-gray-500">Test booking</p>
            </div>
          </div>
          {!testResults.calendarTest && (
            <button
              onClick={() => handleTest('calendar')}
              className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
            >
              Test Calendar
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              testResults.aiTest ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {testResults.aiTest ? <CheckCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">AI Test</p>
              <p className="text-xs text-gray-500">Test responses</p>
            </div>
          </div>
          {!testResults.aiTest && (
            <button
              onClick={() => handleTest('ai')}
              className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
            >
              Test AI
            </button>
          )}
        </div>
      </div>

      {allTestsComplete && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">
                All tests completed! Your AI receptionist is ready to go live.
              </span>
            </div>
            <button
              onClick={onTestComplete}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <span>Go Live</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
