'use client'

import React from 'react'
import { useProgress } from '@/app/contexts/ProgressContext'

export default function ProgressDemo() {
  const { snapshot, begin, confirm, fail } = useProgress()
  const [stepId, setStepId] = React.useState('step-1')
  const [requestId, setRequestId] = React.useState(() => `req_${Date.now()}`)

  const start = () => begin(stepId, requestId, 'q1')
  const markDone = () => confirm(stepId, requestId)
  const markFail = () => fail(stepId, requestId, 'Example failure')

  return (
    <div className="space-y-4 p-4 rounded border border-gray-700">
      <h3 className="text-lg font-semibold">Progress Demo</h3>
      <div className="flex gap-2">
        <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={stepId} onChange={e => setStepId(e.target.value)} />
        <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1 w-56" value={requestId} onChange={e => setRequestId(e.target.value)} />
        <button className="bg-blue-600 rounded px-3 py-1" onClick={start}>Begin</button>
        <button className="bg-green-600 rounded px-3 py-1" onClick={markDone}>Confirm</button>
        <button className="bg-red-600 rounded px-3 py-1" onClick={markFail}>Fail</button>
      </div>
      <pre className="bg-gray-900 border border-gray-800 rounded p-3 text-xs overflow-auto max-h-64">
{JSON.stringify(snapshot, null, 2)}
      </pre>
    </div>
  )
}














