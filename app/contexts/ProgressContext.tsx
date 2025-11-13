'use client'

import React from 'react'
import { globalProgressManager, type ProgressSnapshot } from '@/lib/progress/ProgressManager'

type ProgressContextValue = {
  snapshot: ProgressSnapshot
  begin: (stepId: string, requestId: string, questionId?: string) => void
  confirm: (stepId: string, requestId: string) => Promise<void>
  fail: (stepId: string, requestId: string, error: string) => Promise<void>
}

const ProgressContext = React.createContext<ProgressContextValue | undefined>(undefined)

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = React.useState<ProgressSnapshot>(globalProgressManager.getSnapshot())

  const refresh = React.useCallback(() => setSnapshot(globalProgressManager.getSnapshot()), [])

  const begin = React.useCallback((stepId: string, requestId: string, questionId?: string) => {
    globalProgressManager.begin(stepId, requestId, questionId)
    refresh()
  }, [refresh])

  const confirm = React.useCallback(async (stepId: string, requestId: string) => {
    // confirm locally, also call API for auditing
    globalProgressManager.confirm(stepId, requestId)
    refresh()
    await fetch('/api/progress/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepId, requestId, status: 'confirmed' }),
    }).catch(() => {})
  }, [refresh])

  const fail = React.useCallback(async (stepId: string, requestId: string, error: string) => {
    globalProgressManager.fail(stepId, requestId, error)
    refresh()
    await fetch('/api/progress/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepId, requestId, status: 'failed', error }),
    }).catch(() => {})
  }, [refresh])

  const value: ProgressContextValue = React.useMemo(() => ({ snapshot, begin, confirm, fail }), [snapshot, begin, confirm, fail])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = React.useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}












