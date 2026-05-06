'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, PlayCircle, Loader2, ArrowUpRight, Circle,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../../_components/Shell'
import {
  VIDEO_STEPS, totalDone, type VideoProgress, type VideoStep,
} from '@/lib/onboarding/video-steps'

/**
 * Async video walkthrough.
 *
 * Self-paced companion to the live onboarding wizard - the customer can
 * watch each step, tick off the action items, and resume anywhere. The
 * progress blob is stored on businesses.onboarding_video_progress.
 *
 * Step content (titles, blurbs, video URLs, action lists) lives in
 * lib/onboarding/video-steps.ts so updating it doesn't touch this file.
 */

export default function VideoOnboardingPage() {
  const [progress, setProgress] = useState<VideoProgress>({})
  const [loading, setLoading] = useState(true)
  const [openKey, setOpenKey] = useState<string | null>(VIDEO_STEPS[0]?.key || null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetchWithAuth('/api/onboarding/videos')
        const j = await r.json().catch(() => ({}))
        if (!cancelled && j?.success) {
          setProgress(j.progress || {})
          // Auto-open the first not-yet-done step.
          const firstUndone = VIDEO_STEPS.find((s) => !(j.progress?.[s.key]?.watched && j.progress?.[s.key]?.completed))
          if (firstUndone) setOpenKey(firstUndone.key)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const patch = async (key: string, payload: { watched?: boolean; completed?: boolean }) => {
    // Optimistic.
    setProgress((p) => ({
      ...p,
      [key]: { ...(p[key] || {}), ...payload, updated_at: new Date().toISOString() },
    }))
    try {
      await fetchWithAuth('/api/onboarding/videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...payload }),
      })
    } catch { /* optimistic; reload tolerates stale state */ }
  }

  const done = totalDone(progress)
  const total = VIDEO_STEPS.length

  return (
    <DashShell activeLabel="Setup">
      <div className="px-4 lg:px-8 py-6 lg:py-10 max-w-3xl">
        <div className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-2">
            Walkthrough
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-gray-900">
            Watch the setup walkthrough
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-xl">
            Self-paced. Watch each step, tick the action items, and come back any time.
            You can do the live setup wizard alongside this -{' '}
            <Link href="/dashboard/onboarding" className="text-gray-900 underline underline-offset-2">
              open it here
            </Link>.
          </p>
        </div>

        <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">Progress</div>
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: total ? `${(done / total) * 100}%` : 0 }}
            />
          </div>
          <div className="text-sm tabular-nums text-gray-900 font-medium">
            {done} <span className="text-gray-400">/ {total}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <ol className="space-y-3">
            {VIDEO_STEPS.map((step, idx) => (
              <StepCard
                key={step.key}
                step={step}
                index={idx}
                progress={progress[step.key] || {}}
                isOpen={openKey === step.key}
                onToggle={() => setOpenKey((cur) => (cur === step.key ? null : step.key))}
                onWatched={() => patch(step.key, { watched: true })}
                onCompleted={(v) => patch(step.key, { completed: v })}
              />
            ))}
          </ol>
        )}
      </div>
    </DashShell>
  )
}

function StepCard({
  step, index, progress, isOpen, onToggle, onWatched, onCompleted,
}: {
  step: VideoStep
  index: number
  progress: { watched?: boolean; completed?: boolean }
  isOpen: boolean
  onToggle: () => void
  onWatched: () => void
  onCompleted: (v: boolean) => void
}) {
  const done = !!(progress.watched && progress.completed)

  return (
    <li className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="shrink-0">
          {done ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : progress.watched ? (
            <Circle className="w-6 h-6 text-amber-400" />
          ) : (
            <Circle className="w-6 h-6 text-gray-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">
              Step {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">
              · {step.durationLabel}
            </span>
          </div>
          <div className="text-sm sm:text-base font-medium text-gray-900 mt-0.5">{step.title}</div>
          <div className="text-xs sm:text-sm text-gray-500 mt-0.5">{step.blurb}</div>
        </div>
        <div className="text-xs text-gray-400 shrink-0">
          {isOpen ? 'Hide' : 'Open'}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 p-4 sm:p-5 space-y-5">
          <VideoEmbed url={step.videoUrl} onPlay={onWatched} />

          {step.actions?.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-2">
                Action items
              </div>
              <ul className="space-y-1.5">
                {step.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!progress.completed}
                onChange={(e) => onCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              Mark this step done
            </label>
            {step.cta && (
              <Link
                href={step.cta.href}
                className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:underline"
              >
                {step.cta.label}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

function VideoEmbed({ url, onPlay }: { url: string; onPlay: () => void }) {
  if (!url) {
    return (
      <div className="aspect-video bg-gray-100 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center px-6">
        <PlayCircle className="w-8 h-8 text-gray-400 mb-2" />
        <div className="text-sm font-medium text-gray-700">Video coming soon</div>
        <div className="text-xs text-gray-500 mt-1 max-w-xs">
          Use the action items below for now - this step still works without the video.
        </div>
      </div>
    )
  }
  // Loom share URL → embed URL.
  const isLoom = /loom\.com\/share\//.test(url)
  const embedUrl = isLoom ? url.replace('/share/', '/embed/') : url
  // Treat anything that ends in .mp4/.webm as a native video tag, else iframe.
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(embedUrl)) {
    return (
      <video
        src={embedUrl}
        controls
        playsInline
        onPlay={onPlay}
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
        onLoad={onPlay}
        className="w-full h-full"
      />
    </div>
  )
}
