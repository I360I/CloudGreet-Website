export type StepStatus = 'idle' | 'pending' | 'confirmed' | 'failed'

export interface ProgressStep {
  stepId: string
  questionId?: string
  status: StepStatus
  requestId: string
  startedAt?: number
  finishedAt?: number
  error?: string
}

export interface ProgressSnapshot {
  currentStep: string | null
  completedSteps: string[]
  steps: Record<string, ProgressStep>
}

export class ProgressManager {
  private steps: Record<string, ProgressStep> = {}
  private currentStep: string | null = null
  private completedSteps: string[] = []

  getSnapshot(): ProgressSnapshot {
    return {
      currentStep: this.currentStep,
      completedSteps: [...this.completedSteps],
      steps: { ...this.steps },
    }
  }

  begin(stepId: string, requestId: string, questionId?: string): ProgressStep {
    const now = Date.now()
    const existing = this.steps[stepId]
    if (existing && existing.status === 'confirmed') return existing
    const step: ProgressStep = {
      stepId,
      questionId,
      requestId,
      status: 'pending',
      startedAt: existing?.startedAt ?? now,
    }
    this.steps[stepId] = step
    this.currentStep = stepId
    return step
  }

  confirm(stepId: string, requestId: string): ProgressStep {
    const step = this.steps[stepId]
    if (!step) throw new Error('Unknown step')
    if (step.requestId !== requestId) return step // idempotent guard
    if (step.status === 'confirmed') return step
    step.status = 'confirmed'
    step.finishedAt = Date.now()
    if (!this.completedSteps.includes(stepId)) this.completedSteps.push(stepId)
    if (this.currentStep === stepId) this.currentStep = null
    return step
  }

  fail(stepId: string, requestId: string, error: string): ProgressStep {
    const step = this.steps[stepId]
    if (!step) throw new Error('Unknown step')
    if (step.requestId !== requestId) return step
    step.status = 'failed'
    step.finishedAt = Date.now()
    step.error = error
    if (this.currentStep === stepId) this.currentStep = null
    return step
  }
}

// Singleton for simple apps; in multi-tenant scenarios, scope by session/tenant
export const globalProgressManager = new ProgressManager()
















