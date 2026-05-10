'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleNotch, Lock, CheckCircle, PlayCircle, WarningCircle, ArrowRight, Trophy } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { ONBOARDING_STEPS, type OnboardingStep } from '@/lib/sales/onboarding-steps'
import { QUIZ, QUIZ_PASS_THRESHOLD, type QuizQuestion } from '@/lib/sales/onboarding-quiz'

/**
 * Async rep onboarding - 7 sequential gated steps.
 *
 * State (current_step, quiz_passed_at, etc.) lives on sales_reps and is
 * loaded from /api/sales/onboarding/state. Step content + the quiz
 * bank live in lib/sales/. Editing this file should be UI changes only.
 *
 * The Stripe Connect step (3) reuses the existing /api/sales/connect-onboarding
 * endpoint so reps land in the same Stripe Express flow as before; on
 * return, /sales/onboarding/done flips payouts_enabled, and once that's
 * true the rep can mark step 3 complete here.
 */

type State = {
  current_step: number
  onboarding_completed_at: string | null
  quiz_attempts: number
  quiz_passed_at: string | null
  last_quiz_score: number | null
  stripe_payouts_enabled: boolean
}

export default function RepOnboardingPage() {
  const [state, setState] = useState<State | null>(null)
  const [loading, setLoading] = useState(true)
  const [openStep, setOpenStep] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  const reload = async () => {
    try {
      const r = await fetchWithAuth('/api/sales/onboarding/state')
      const j = await r.json().catch(() => ({}))
      if (j?.success) {
        setState(j)
        if (openStep === null) setOpenStep(j.current_step)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [])

  const advance = async (stepNumber: number) => {
    setError(''); setBusy(stepNumber)
    try {
      const r = await fetchWithAuth('/api/sales/onboarding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complete_step: stepNumber }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setError(j?.error || 'Could not advance')
        return
      }
      // Optimistic: update local state in one render so the next step
      // unlocks and auto-opens immediately. Otherwise there's a flash
      // where setOpenStep fires before the reload's setState lands and
      // the still-locked next step renders empty.
      setState((prev) => prev ? { ...prev, current_step: j.current_step } : prev)
      setOpenStep(j.current_step)
    } finally {
      setBusy(null)
    }
  }

  const startStripeConnect = async () => {
    setError(''); setBusy(3)
    try {
      const r = await fetch('/api/sales/connect-onboarding', { method: 'POST', credentials: 'include' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success || !j.url) {
        setError(j?.error || 'Could not start Stripe onboarding')
        setBusy(null)
        return
      }
      window.location.href = j.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <SalesShell activeLabel="Onboarding">
        <section className="max-w-3xl mx-auto px-6 py-10">
          <SalesLoadingState />
        </section>
      </SalesShell>
    )
  }

  if (!state) {
    return (
      <SalesShell activeLabel="Onboarding">
        <section className="max-w-3xl mx-auto px-6 py-10">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-3">
            <WarningCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Could not load onboarding state.</p>
          </div>
        </section>
      </SalesShell>
    )
  }

  const totalSteps = ONBOARDING_STEPS.length
  const done = state.onboarding_completed_at
    ? totalSteps
    : Math.max(0, state.current_step - 1)

  return (
    <SalesShell activeLabel="Onboarding">
      <section className="max-w-3xl mx-auto px-6 py-10">
        <SalesPageHeader eyebrow="onboarding" title="Get ready to sell" />

        <p className="text-sm text-gray-600 mb-6 max-w-xl">
          Watch each video, mark it complete, and pass the quiz to unlock the full dashboard. Self-paced - resume any time.
        </p>

        {/* Progress bar */}
        <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">Progress</div>
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(done / totalSteps) * 100}%` }}
            />
          </div>
          <div className="text-sm tabular-nums text-gray-900 font-medium">
            {done}<span className="text-gray-400"> / {totalSteps}</span>
          </div>
        </div>

        {state.onboarding_completed_at && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <Trophy className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Onboarding complete - you&apos;re live.</p>
              <p className="text-xs text-emerald-800 mt-1">
                Quiz passed at {state.last_quiz_score ?? 0}%. Lead scraper and payment links are unlocked.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <ol className="space-y-3">
          {ONBOARDING_STEPS.map((step) => {
            const status =
              step.number < state.current_step ? 'done'
              : step.number === state.current_step ? 'current'
              : 'locked'
            // Once onboarding is fully complete, treat every step as 'done'
            // so the rep can rewatch any of them.
            const effectiveStatus = state.onboarding_completed_at ? 'done' : status
            return (
              <StepCard
                key={step.key}
                step={step}
                status={effectiveStatus}
                isOpen={openStep === step.number}
                onToggle={() => setOpenStep((cur) => (cur === step.number ? null : step.number))}
                stripePayoutsEnabled={state.stripe_payouts_enabled}
                quizPassed={!!state.quiz_passed_at}
                quizAttempts={state.quiz_attempts}
                lastQuizScore={state.last_quiz_score}
                busy={busy === step.number}
                onMarkComplete={() => advance(step.number)}
                onStartStripe={startStripeConnect}
                onQuizDone={reload}
              />
            )
          })}
        </ol>
      </section>
    </SalesShell>
  )
}

function StepCard({
  step, status, isOpen, onToggle,
  stripePayoutsEnabled, quizPassed, quizAttempts, lastQuizScore,
  busy, onMarkComplete, onStartStripe, onQuizDone,
}: {
  step: OnboardingStep
  status: 'done' | 'current' | 'locked'
  isOpen: boolean
  onToggle: () => void
  stripePayoutsEnabled: boolean
  quizPassed: boolean
  quizAttempts: number
  lastQuizScore: number | null
  busy: boolean
  onMarkComplete: () => void
  onStartStripe: () => void
  onQuizDone: () => void
}) {
  const locked = status === 'locked'
  const done = status === 'done'

  return (
    <li className={`bg-white border rounded-2xl overflow-hidden transition-colors ${
      locked ? 'border-gray-200 opacity-60' : done ? 'border-emerald-200' : 'border-gray-300'
    }`}>
      <button
        type="button"
        onClick={locked ? undefined : onToggle}
        className={`w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-colors ${
          locked ? 'cursor-not-allowed' : 'hover:bg-gray-50/50'
        }`}
        disabled={locked}
      >
        <div className="shrink-0">
          {done ? (
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          ) : locked ? (
            <Lock className="w-5 h-5 text-gray-400" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium">
              {step.number}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">
              Step {String(step.number).padStart(2, '0')} · {step.durationLabel}
            </span>
          </div>
          <div className="text-sm sm:text-base font-medium text-gray-900 mt-0.5">{step.title}</div>
          <div className="text-xs sm:text-sm text-gray-500 mt-0.5">{step.goal}</div>
        </div>
        {!locked && (
          <div className="text-xs text-gray-400 shrink-0">{isOpen ? 'Hide' : 'Open'}</div>
        )}
      </button>

      {!locked && isOpen && (
        <div className="border-t border-gray-100 p-4 sm:p-5 space-y-5">
          <VideoEmbed url={step.videoUrl} />

          {step.outline.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-2">
                What this video covers
              </div>
              <ul className="space-y-1.5">
                {step.outline.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step.kind === 'stripe-connect' ? (
            <StripeConnectAction
              done={done}
              payoutsEnabled={stripePayoutsEnabled}
              busy={busy}
              onStart={onStartStripe}
              onMarkComplete={onMarkComplete}
            />
          ) : step.kind === 'quiz' ? (
            <QuizSection
              passed={quizPassed}
              attempts={quizAttempts}
              lastScore={lastQuizScore}
              onDone={onQuizDone}
            />
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-500">
                Watched the video and ready to move on?
              </p>
              <button
                type="button"
                onClick={onMarkComplete}
                disabled={busy || done}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {done ? 'Completed' : 'Mark complete'}
                {!done && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function StripeConnectAction({
  done, payoutsEnabled, busy, onStart, onMarkComplete,
}: {
  done: boolean; payoutsEnabled: boolean; busy: boolean
  onStart: () => void; onMarkComplete: () => void
}) {
  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700">
        <CheckCircle className="w-4 h-4" /> Stripe payouts connected.
      </div>
    )
  }
  if (!payoutsEnabled) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500">
          Stripe Express handles KYC + bank linking. You&apos;ll come back here when it&apos;s done.
        </p>
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : null}
          Connect Stripe
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-xs text-emerald-700 inline-flex items-center gap-1.5">
        <CheckCircle className="w-4 h-4" /> Stripe payouts enabled.
      </p>
      <button
        type="button"
        onClick={onMarkComplete}
        disabled={busy}
        className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function QuizSection({
  passed, attempts, lastScore, onDone,
}: {
  passed: boolean; attempts: number; lastScore: number | null; onDone: () => void
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    passed: boolean; scorePct: number;
    graded: { id: string; correct: boolean; videoStep: number }[]
  } | null>(null)

  const allAnswered = useMemo(
    () => QUIZ.every((q) => typeof answers[q.id] === 'number'),
    [answers],
  )

  if (passed && !result) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700">
        <CheckCircle className="w-4 h-4" />
        Quiz passed{lastScore !== null ? ` (${lastScore}%)` : ''}. The full dashboard is unlocked.
      </div>
    )
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const r = await fetchWithAuth('/api/sales/onboarding/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const j = await r.json().catch(() => ({}))
      if (j?.success) {
        setResult({ passed: j.passed, scorePct: j.scorePct, graded: j.graded || [] })
        onDone()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => { setAnswers({}); setResult(null) }

  return (
    <div className="space-y-5">
      {attempts > 0 && !result && (
        <div className="text-xs text-gray-500">
          Previous attempts: {attempts}{lastScore !== null ? ` · last score ${lastScore}%` : ''}
        </div>
      )}

      {result && (
        <div className={`rounded-xl border p-4 ${result.passed
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          <div className="text-sm font-medium">
            {result.passed
              ? `Passed - ${result.scorePct}%. The dashboard is fully unlocked.`
              : `Score: ${result.scorePct}% (need ${Math.round(QUIZ_PASS_THRESHOLD * 100)}% to pass).`}
          </div>
          {!result.passed && (
            <div className="text-xs mt-1">
              Review steps {Array.from(new Set(result.graded.filter((g) => !g.correct).map((g) => g.videoStep))).join(', ')} and try again.
            </div>
          )}
        </div>
      )}

      <ol className="space-y-4">
        {QUIZ.map((q, idx) => {
          const grade = result?.graded.find((g) => g.id === q.id)
          return (
            <QuizItem
              key={q.id}
              q={q}
              idx={idx}
              picked={answers[q.id]}
              correctIdx={result ? q.answer : undefined}
              isCorrect={grade?.correct}
              disabled={!!result}
              onPick={(i) => setAnswers((a) => ({ ...a, [q.id]: i }))}
            />
          )
        })}
      </ol>

      <div className="flex items-center justify-end gap-3">
        {result ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            {result.passed ? 'Done' : 'Retake'}
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!allAnswered || submitting}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <CircleNotch className="w-4 h-4 animate-spin" /> : null}
            Submit quiz
          </button>
        )}
      </div>
    </div>
  )
}

function QuizItem({
  q, idx, picked, correctIdx, isCorrect, disabled, onPick,
}: {
  q: QuizQuestion; idx: number; picked: number | undefined
  correctIdx: number | undefined; isCorrect: boolean | undefined
  disabled: boolean; onPick: (i: number) => void
}) {
  return (
    <li className="bg-gray-50/60 border border-gray-200 rounded-xl p-4">
      <div className="text-sm font-medium text-gray-900 mb-3">
        <span className="text-gray-400 font-mono mr-2">{String(idx + 1).padStart(2, '0')}.</span>
        {q.prompt}
      </div>
      <div className="space-y-1.5">
        {q.options.map((opt, i) => {
          const checked = picked === i
          const showCorrect = correctIdx === i
          const showWrongPick = disabled && checked && !isCorrect
          return (
            <label
              key={i}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${
                disabled ? 'cursor-not-allowed' : 'hover:border-gray-400'
              } ${
                showCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : showWrongPick ? 'bg-rose-50 border-rose-200 text-rose-900'
                : checked ? 'bg-white border-gray-900' : 'bg-white border-gray-200'
              }`}
            >
              <input
                type="radio"
                name={q.id}
                value={i}
                checked={checked}
                disabled={disabled}
                onChange={() => onPick(i)}
                className="mt-1"
              />
              <span>{opt}</span>
            </label>
          )
        })}
      </div>
    </li>
  )
}

function VideoEmbed({ url }: { url: string }) {
  if (!url) {
    return (
      <div className="aspect-video bg-gray-100 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center px-6">
        <PlayCircle className="w-8 h-8 text-gray-400 mb-2" />
        <div className="text-sm font-medium text-gray-700">No video for this step</div>
        <div className="text-xs text-gray-500 mt-1 max-w-xs">
          The outline below covers everything you need.
        </div>
      </div>
    )
  }
  const isLoom = /loom\.com\/share\//.test(url)
  const embedUrl = isLoom ? url.replace('/share/', '/embed/') : url
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(embedUrl)) {
    return (
      <video
        src={embedUrl}
        controls
        playsInline
        className="w-full aspect-video rounded-xl bg-black"
      />
    )
  }
  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  )
}
