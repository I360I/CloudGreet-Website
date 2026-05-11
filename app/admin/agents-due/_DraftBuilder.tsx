'use client'

import { useEffect, useState, useCallback } from 'react'
import { CircleNotch, Sparkle, CheckCircle, WarningCircle, Copy, ArrowsClockwise, CaretDown, CaretUp, Globe, ChatCircle } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { PrimaryButton, GhostButton, Input } from '../_components/ui'
import { AgentChat } from './_AgentChat'

/**
 * Per-row "Build draft agent" panel for /admin/agents-due.
 *
 * Phase 1 of the AI agent builder: triggers the scrape + Claude pipeline,
 * shows the validation scorecard, lets the admin edit the prompt, then
 * Approve. Approval doesn't auto-deploy - the admin still pastes the
 * prompt into Retell and pastes the test number back via the existing
 * "Mark ready" flow on the same row. That keeps a human in the loop on
 * the Retell side while we trust the pipeline.
 */

type DraftStatus = 'none' | 'generating' | 'ready' | 'failed' | 'approved'

type ValidationCheck = {
  name: string
  ok: boolean
  detail: string
  level: 'critical' | 'warning'
}

type Draft = {
  status: DraftStatus
  context: any
  prompt: string | null
  approved_prompt: string | null
  validation: { passed: boolean; word_count: number; checks: ValidationCheck[] } | null
  error: string | null
  cost_micro: number
  generated_at: string | null
  approved_at: string | null
}

export function DraftBuilder({
  closeId,
  initialStatus,
  hasWebsite,
  currentWebsite,
  onChanged,
}: {
  closeId: string
  initialStatus: DraftStatus
  hasWebsite: boolean
  currentWebsite: string | null
  onChanged: () => void
}) {
  // Open by default when there's work to do: an in-flight draft, or
  // a missing website blocking the pipeline.
  const [open, setOpen] = useState(
    (initialStatus !== 'none' && initialStatus !== 'approved') || !hasWebsite,
  )
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<'generate' | 'save' | 'approve' | 'website' | null>(null)
  const [websiteDraft, setWebsiteDraft] = useState(currentWebsite || '')
  const [websiteEditing, setWebsiteEditing] = useState(!hasWebsite)
  const [edited, setEdited] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [copied, setCopied] = useState(false)
  // 'pipeline' = the original one-shot Claude pipeline.
  // 'chat'     = multi-turn chat with the managed agent (web_fetch + memory).
  // Default to chat if there's no existing draft (cleaner first-run UX),
  // pipeline if there is (so the admin lands back where their work lives).
  const [mode, setMode] = useState<'pipeline' | 'chat'>(
    initialStatus === 'none' ? 'chat' : 'pipeline',
  )

  const reload = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetchWithAuth(`/api/admin/agents-due/${closeId}/draft`)
      const j = await r.json().catch(() => ({}))
      if (j?.success) {
        setDraft({
          status: j.status || 'none',
          context: j.context,
          prompt: j.prompt,
          approved_prompt: j.approved_prompt,
          validation: j.validation,
          error: j.error,
          cost_micro: j.cost_micro || 0,
          generated_at: j.generated_at,
          approved_at: j.approved_at,
        })
        setEdited(null)
      } else if (j?.error) {
        setErr(j.error)
      }
    } finally {
      setLoading(false)
    }
  }, [closeId])

  useEffect(() => {
    if (open && !draft) void reload()
  }, [open, draft, reload])

  // Poll while generating - the API is synchronous but if a tab is
  // backgrounded we want the UI to catch up when refocused.
  useEffect(() => {
    if (draft?.status !== 'generating') return
    const t = setInterval(reload, 3000)
    return () => clearInterval(t)
  }, [draft?.status, reload])

  const saveWebsite = async () => {
    setBusy('website'); setErr('')
    try {
      const r = await fetchWithAuth(`/api/admin/agents-due/${closeId}/business`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: websiteDraft.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        // Show the full server message (which now includes the
        // underlying DB error if any) so the admin can debug instead
        // of staring at a silent "doesn't save" UI.
        const detail = j?.detail ? ` (${j.detail})` : ''
        setErr(`${j?.error || `Save failed (${r.status})`}${detail}`)
      } else {
        // Sync local input to the canonical, normalised URL the server
        // wrote (so a paste of "tehvac.com" displays as "https://tehvac.com").
        const savedUrl = j?.saved?.website
        if (typeof savedUrl === 'string') setWebsiteDraft(savedUrl)
        setWebsiteEditing(false)
        onChanged()
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  const generate = async () => {
    setBusy('generate'); setErr('')
    // Wipe local user edits so the regenerated prompt actually shows up
    // in the textarea (otherwise `value={edited ?? draft.prompt}` keeps
    // displaying the stale edited copy).
    setEdited(null)
    // Optimistic flip so the UI doesn't sit idle for the 30-60s pipeline.
    setDraft((d) => d ? { ...d, status: 'generating', prompt: null } : { status: 'generating' } as any)
    try {
      const r = await fetchWithAuth(`/api/admin/agents-due/${closeId}/generate`, { method: 'POST' })
      const text = await r.text()
      let j: any = {}
      try { j = JSON.parse(text) } catch { /* keep raw text */ }
      if (!r.ok || !j?.success) {
        // Surface the *full* server response (not just j.error) so missing
        // env vars, schema, or model-format failures don't show as a silent
        // "back to Build draft" button.
        setErr(j?.error || text.slice(0, 500) || `Pipeline failed (${r.status})`)
      }
      await reload()
      onChanged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Pipeline failed')
    } finally {
      setBusy(null)
    }
  }

  const save = async () => {
    if (edited === null) return
    setBusy('save'); setErr('')
    try {
      const r = await fetchWithAuth(`/api/admin/agents-due/${closeId}/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: edited }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) setErr(j?.error || 'Save failed')
      else await reload()
    } finally {
      setBusy(null)
    }
  }

  const approve = async () => {
    setBusy('approve'); setErr('')
    try {
      const final = edited ?? draft?.prompt ?? ''
      // Copy to clipboard at the same time so the admin can paste straight
      // into Retell - the next manual step.
      try { await navigator.clipboard.writeText(final) } catch { /* non-fatal */ }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      const r = await fetchWithAuth(`/api/admin/agents-due/${closeId}/approve-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: final }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) setErr(j?.error || 'Approve failed')
      else { await reload(); onChanged() }
    } finally {
      setBusy(null)
    }
  }

  const copyPrompt = async () => {
    const text = edited ?? draft?.prompt ?? ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { /* non-fatal */ }
  }

  return (
    <div className="border-t border-white/5 px-5 py-3 bg-fuchsia-500/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkle className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-fuchsia-300">
            AI agent draft
          </span>
          <DraftStatusPill status={draft?.status ?? initialStatus} />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {hasWebsite ? null : <span className="text-amber-300/80">no website on file</span>}
          {open ? <CaretUp className="w-3.5 h-3.5" /> : <CaretDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {open && (
        <div className="mt-3">
          {/* Website on file - always editable. The pipeline scrapes
              this URL, so getting it right is the highest-leverage knob. */}
          <div className="mb-3 rounded-lg border border-white/[0.08] bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Globe className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                {websiteEditing ? (
                  <Input
                    placeholder="example.com or https://example.com"
                    value={websiteDraft}
                    onChange={(e) => setWebsiteDraft(e.target.value)}
                    className="flex-1 font-mono text-xs"
                    onKeyDown={(e) => { if (e.key === 'Enter') void saveWebsite() }}
                  />
                ) : currentWebsite ? (
                  <a
                    href={currentWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-sky-300 hover:text-sky-200 truncate"
                  >
                    {currentWebsite.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span className="text-xs text-amber-300/80">No website on file - paste one to scrape</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {websiteEditing ? (
                  <>
                    <PrimaryButton onClick={saveWebsite} disabled={busy === 'website'}>
                      {busy === 'website' && <CircleNotch className="w-3 h-3 animate-spin" />}
                      Save
                    </PrimaryButton>
                    {hasWebsite && (
                      <GhostButton onClick={() => { setWebsiteEditing(false); setWebsiteDraft(currentWebsite || '') }}>
                        Cancel
                      </GhostButton>
                    )}
                  </>
                ) : (
                  <GhostButton onClick={() => setWebsiteEditing(true)}>
                    Edit
                  </GhostButton>
                )}
              </div>
            </div>
          </div>

          {/* Mode toggle - chat (managed agent + web_fetch) vs pipeline (one-shot scrape + Claude). */}
          <div className="mb-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 p-0.5">
            <button
              type="button"
              onClick={() => setMode('chat')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                mode === 'chat' ? 'bg-fuchsia-500/20 text-fuchsia-200' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ChatCircle className="w-3 h-3" /> Chat with AI
            </button>
            <button
              type="button"
              onClick={() => setMode('pipeline')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                mode === 'pipeline' ? 'bg-fuchsia-500/20 text-fuchsia-200' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sparkle className="w-3 h-3" /> One-shot pipeline
            </button>
          </div>

          {mode === 'chat' && (
            <div className="mb-3">
              <AgentChat
                closeId={closeId}
                hasWebsite={hasWebsite}
                onPromptAdopted={async () => {
                  setMode('pipeline')
                  await reload()
                  onChanged()
                }}
              />
            </div>
          )}

          {mode === 'pipeline' && loading && !draft && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CircleNotch className="w-3.5 h-3.5 animate-spin" /> Loading draft…
            </div>
          )}

          {mode === 'pipeline' && (!draft || draft.status === 'none') && !loading && (
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-400 max-w-md">
                Scrape the website + Google Places, hand it to Claude, validate the output, store the prompt for review. ~30-60s, ~$1 in API cost.
                {!hasWebsite && (
                  <span className="block mt-1 text-amber-300/80">
                    Add a website above first - the scraper has nothing to read otherwise.
                  </span>
                )}
              </p>
              <PrimaryButton onClick={generate} disabled={busy !== null || !hasWebsite}>
                {busy === 'generate' && <CircleNotch className="w-4 h-4 animate-spin" />}
                Build draft
              </PrimaryButton>
            </div>
          )}

          {mode === 'pipeline' && draft?.status === 'generating' && (
            <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/[0.06] px-4 py-5 flex items-center gap-3">
              <CircleNotch className="w-5 h-5 animate-spin text-fuchsia-300 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm text-fuchsia-200 font-medium">
                  Building agent prompt…
                </div>
                <div className="text-xs text-fuchsia-300/70 mt-0.5">
                  Scraping the website, calling Claude, validating the output.
                  This usually takes 30-60 seconds. The previous prompt will be
                  replaced when this finishes.
                </div>
              </div>
            </div>
          )}

          {mode === 'pipeline' && draft?.status === 'failed' && (
            <div className="space-y-3">
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-300">
                <div className="font-medium mb-0.5">Pipeline failed</div>
                <div className="font-mono">{draft.error || 'unknown error'}</div>
              </div>
              <GhostButton onClick={generate} disabled={busy !== null}>
                <ArrowsClockwise className="w-3 h-3" /> Retry
              </GhostButton>
            </div>
          )}

          {mode === 'pipeline' && (draft?.status === 'ready' || draft?.status === 'approved') && draft.prompt && (
            <div className="space-y-3">
              {draft.validation && (
                <ValidationCard validation={draft.validation} costMicro={draft.cost_micro} />
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
                    Generated prompt {draft.status === 'approved' && '· APPROVED'}
                  </span>
                  <div className="flex items-center gap-2">
                    <GhostButton onClick={copyPrompt}>
                      {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </GhostButton>
                    {edited !== null && draft.status === 'ready' && (
                      <GhostButton onClick={save} disabled={busy !== null}>
                        {busy === 'save' && <CircleNotch className="w-3 h-3 animate-spin" />}
                        Save edits
                      </GhostButton>
                    )}
                  </div>
                </div>
                <textarea
                  value={edited ?? draft.prompt}
                  onChange={(e) => setEdited(e.target.value)}
                  rows={14}
                  spellCheck={false}
                  readOnly={draft.status === 'approved'}
                  className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 leading-relaxed focus:border-fuchsia-400/40 focus:outline-none resize-y"
                />
              </div>

              <ContextDrawer
                open={showContext}
                onToggle={() => setShowContext((v) => !v)}
                context={draft.context}
              />

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[10px] text-gray-500">
                  {draft.generated_at && `Built ${new Date(draft.generated_at).toLocaleString()}`}
                  {draft.cost_micro > 0 && ` · ~$${(draft.cost_micro / 1_000_000).toFixed(2)} in API`}
                </div>
                <div className="flex items-center gap-2">
                  <GhostButton onClick={generate} disabled={busy !== null}>
                    {busy === 'generate'
                      ? <CircleNotch className="w-3 h-3 animate-spin" />
                      : <ArrowsClockwise className="w-3 h-3" />}
                    {busy === 'generate' ? 'Regenerating…' : 'Regenerate'}
                  </GhostButton>
                  {draft.status !== 'approved' && (
                    <PrimaryButton onClick={approve} disabled={busy !== null}>
                      {busy === 'approve' ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                      Approve & copy for Retell
                    </PrimaryButton>
                  )}
                </div>
              </div>
            </div>
          )}

          {err && (
            <div className="mt-3 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <WarningCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-rose-200">Build failed</div>
                  <pre className="mt-1 text-[11px] font-mono text-rose-300 whitespace-pre-wrap break-words leading-relaxed">{err}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DraftStatusPill({ status }: { status: DraftStatus }) {
  const m: Record<DraftStatus, { tone: string; label: string }> = {
    none: { tone: 'bg-white/5 text-gray-400 border-white/10', label: 'not built' },
    generating: { tone: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20', label: 'building' },
    ready: { tone: 'bg-amber-500/10 text-amber-300 border-amber-500/20', label: 'review' },
    failed: { tone: 'bg-rose-500/10 text-rose-300 border-rose-500/20', label: 'failed' },
    approved: { tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', label: 'approved' },
  }
  const s = m[status]
  return (
    <span className={`inline-flex items-center text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${s.tone}`}>
      {s.label}
    </span>
  )
}

function ValidationCard({
  validation, costMicro,
}: {
  validation: { passed: boolean; word_count: number; checks: ValidationCheck[] }
  costMicro: number
}) {
  return (
    <div className={`rounded-lg border p-3 ${
      validation.passed
        ? 'bg-emerald-500/[0.06] border-emerald-500/20'
        : 'bg-amber-500/[0.06] border-amber-500/20'
    }`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          {validation.passed
            ? <CheckCircle className="w-4 h-4 text-emerald-400" />
            : <WarningCircle className="w-4 h-4 text-amber-400" />}
          <span className={validation.passed ? 'text-emerald-300' : 'text-amber-300'}>
            {validation.passed ? 'All critical checks passed' : 'Critical checks flagged - review before approving'}
          </span>
        </div>
        <div className="text-[10px] font-mono text-gray-500">
          {validation.word_count} words
        </div>
      </div>
      <ul className="mt-2 space-y-1">
        {validation.checks.map((c) => (
          <li key={c.name} className="flex items-start gap-2 text-[11px] leading-relaxed">
            {c.ok
              ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
              : <WarningCircle className={`w-3 h-3 shrink-0 mt-0.5 ${c.level === 'critical' ? 'text-rose-400' : 'text-amber-400'}`} />}
            <span className={c.ok ? 'text-gray-400' : c.level === 'critical' ? 'text-rose-300' : 'text-amber-300'}>
              <span className="font-mono mr-1.5">{c.name}</span>
              {c.detail}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContextDrawer({
  open, onToggle, context,
}: {
  open: boolean; onToggle: () => void; context: any
}) {
  if (!context) return null
  return (
    <div className="rounded-lg border border-white/5">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 hover:bg-white/[0.02]"
      >
        Business context document (what Claude saw)
        {open ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
      </button>
      {open && (
        <pre className="text-[10px] font-mono text-gray-400 bg-black/30 p-3 max-h-72 overflow-auto leading-relaxed">
          {JSON.stringify(stripWebsitePages(context), null, 2)}
        </pre>
      )}
    </div>
  )
}

// The full website blob can be enormous - elide it in the drawer.
function stripWebsitePages(ctx: any): any {
  if (!ctx?.sources?.website?.pages) return ctx
  const pages = ctx.sources.website.pages.map((p: any) => ({
    url: p.url,
    title: p.title,
    h1: p.h1,
    h2: p.h2,
    text_length: p.text?.length || 0,
    text_preview: typeof p.text === 'string' ? p.text.slice(0, 240) + '…' : null,
  }))
  return {
    ...ctx,
    sources: {
      ...ctx.sources,
      website: { ...ctx.sources.website, pages },
    },
  }
}
