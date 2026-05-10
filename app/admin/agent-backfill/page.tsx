'use client'

import { useState } from 'react'
import { CircleNotch, CheckCircle, WarningCircle, ArrowsClockwise } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PrimaryButton } from '../_components/ui'

/**
 * One-click backfill for the returning-caller prompt block. Walks every
 * business with a Retell agent, fetches its current prompt, and splices
 * in the returning-caller handling block. Idempotent.
 */
export default function AgentBackfillPage() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setBusy(true); setError(null); setResult(null)
    try {
      const r = await fetchWithAuth('/api/admin/agents/backfill-returning-caller', {
        method: 'POST',
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setError(j?.error || `Failed (${r.status})`)
      } else {
        setResult(j)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminShell activeLabel="Tools">
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <div className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
            One-time backfill
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white">Returning-caller backfill</h1>
          <p className="text-sm text-gray-400 mt-1.5">
            Pushes the returning-caller prompt block into every existing Retell agent so contractors who already onboarded get the new behavior. Idempotent - re-running it is safe.
          </p>
        </div>

        <Panel padding="normal">
          <div className="space-y-4">
            <div className="text-xs text-gray-400 leading-relaxed">
              <p>For each business with a <span className="font-mono text-gray-300">retell_agent_id</span>:</p>
              <ol className="list-decimal list-inside mt-1.5 space-y-0.5 ml-2">
                <li>Fetch its current Retell LLM prompt</li>
                <li>Splice in the returning-caller block (sentinel-bracketed)</li>
                <li>PATCH the LLM with the new prompt</li>
              </ol>
            </div>

            <div className="flex items-center gap-2">
              <PrimaryButton onClick={run} disabled={busy}>
                {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <ArrowsClockwise className="w-4 h-4" />}
                Run backfill
              </PrimaryButton>
              {error && (
                <span className="text-xs text-rose-300 inline-flex items-center gap-1">
                  <WarningCircle className="w-3.5 h-3.5" /> {error}
                </span>
              )}
            </div>

            {result && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 space-y-3">
                <div className="text-sm text-emerald-300 inline-flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Done
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <Stat label="Total" value={result.summary?.total} />
                  <Stat label="Updated" value={result.summary?.updated} accent="emerald" />
                  <Stat label="Already in" value={result.summary?.already_present} accent="gray" />
                  <Stat label="Errors" value={result.summary?.errors} accent={result.summary?.errors > 0 ? 'rose' : 'gray'} />
                </div>

                {Array.isArray(result.results) && result.results.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-200">Per-business results</summary>
                    <pre className="mt-2 font-mono whitespace-pre-wrap break-all text-gray-400 bg-black/30 border border-white/5 rounded-lg p-3 max-h-72 overflow-auto">
{JSON.stringify(result.results, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </AdminShell>
  )
}

function Stat({ label, value, accent = 'gray' }: {
  label: string; value: number | undefined; accent?: 'emerald' | 'rose' | 'gray'
}) {
  const v = typeof value === 'number' ? value : 0
  const color =
    accent === 'emerald' ? 'text-emerald-300' :
    accent === 'rose' ? 'text-rose-300' : 'text-gray-200'
  return (
    <div className="bg-black/30 border border-white/5 rounded-lg py-3">
      <div className={`text-2xl font-medium font-mono ${color}`}>{v}</div>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
