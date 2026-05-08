'use client'

import { useEffect, useState } from 'react'
import { Loader2, Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, GhostButton } from '../_components/ui'

const TYPES = ['HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Painting', 'Cleaning', 'Pest Control', 'Landscaping', 'Handyman']

/**
 * Read-only preview of the universal prompt template. Pick an industry,
 * see exactly what a fresh agent would get. Copy it into Claude to
 * iterate, then paste edits back into lib/smart-ai-prompts.ts.
 */
export default function AgentPromptPreviewPage() {
  const [businessType, setBusinessType] = useState('HVAC')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = async (type: string) => {
    setBusy(true); setError(null)
    try {
      const r = await fetchWithAuth(`/api/admin/agent-prompt-preview?businessType=${encodeURIComponent(type)}`)
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setError(j?.error || `Failed (${r.status})`)
      } else {
        setPrompt(j.prompt || '')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { load(businessType) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [businessType])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { /* non-fatal */ }
  }

  return (
    <AdminShell activeLabel="Tools">
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
            Prompt template preview
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white">Universal agent prompt</h1>
          <p className="text-sm text-gray-400 mt-1.5">
            Renders the global template with placeholder business data so you can review what every new agent starts with. To iterate: copy the prompt, paste into Claude or any tool, edit, then update the template in <span className="font-mono text-gray-300">lib/smart-ai-prompts.ts</span> and run the backfill.
          </p>
        </div>

        <Panel padding="normal">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setBusinessType(t)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      businessType === t
                        ? 'bg-white text-gray-900 border-white'
                        : 'bg-transparent text-gray-300 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <GhostButton onClick={copy} disabled={!prompt}>
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </GhostButton>
            </div>

            {busy && (
              <div className="text-xs text-gray-400 inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
              </div>
            )}
            {error && (
              <div className="text-xs text-rose-300 inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </div>
            )}

            {prompt && (
              <pre className="text-[12px] font-mono whitespace-pre-wrap break-words text-gray-300 bg-black/30 border border-white/5 rounded-lg p-4 max-h-[70vh] overflow-auto">
{prompt}
              </pre>
            )}
          </div>
        </Panel>
      </div>
    </AdminShell>
  )
}
