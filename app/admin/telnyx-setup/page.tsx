'use client'

import { useState } from 'react'
import { CircleNotch, CheckCircle, WarningCircle, Copy } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PrimaryButton, GhostButton, Input } from '../_components/ui'

/**
 * One-page admin tool to create the Telnyx Telephony Credential needed
 * for the in-browser dialer. Telnyx's portal buries this resource
 * deep enough that screenshotting through the menus took longer than
 * just calling their API directly - which is what this page does.
 */

export default function TelnyxSetupPage() {
  const [connectionId, setConnectionId] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ id: string; name: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const submit = async () => {
    if (!connectionId.trim()) {
      setError('Paste the Connection ID first.')
      return
    }
    setBusy(true); setError(null); setResult(null)
    try {
      const r = await fetchWithAuth('/api/admin/telnyx/create-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setError(j?.detail || j?.error || `Failed (${r.status})`)
      } else {
        setResult({ id: j.id, name: j.name })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const copyId = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.id)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { /* non-fatal */ }
  }

  return (
    <AdminShell activeLabel="Tools">
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-2xl">
        <div className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
            One-time setup
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white">Telnyx dialer credential</h1>
          <p className="text-sm text-gray-400 mt-1.5">
            Creates a Telephony Credential bound to your SIP Connection so the in-browser dialer can mint WebRTC tokens. One-time. The returned ID goes into the <span className="font-mono text-gray-300">TELNYX_TELEPHONY_CREDENTIAL_ID</span> env var.
          </p>
        </div>

        <Panel padding="normal">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1.5">
                SIP Connection ID
              </label>
              <Input
                placeholder="2954146270983227127"
                value={connectionId}
                onChange={(e) => setConnectionId(e.target.value)}
                className="font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                In the Telnyx portal: <span className="font-mono">Voice → SIP Trunking</span> → click your connection (e.g. "CloudGreet Dialer") → copy the long number labelled "Connection ID" at the top of the page.
              </p>
            </div>

            {!result && (
              <div className="flex items-center gap-2">
                <PrimaryButton onClick={submit} disabled={busy || !connectionId.trim()}>
                  {busy && <CircleNotch className="w-4 h-4 animate-spin" />}
                  Create credential
                </PrimaryButton>
                {error && (
                  <span className="text-xs text-rose-300 inline-flex items-center gap-1">
                    <WarningCircle className="w-3.5 h-3.5" /> {error}
                  </span>
                )}
              </div>
            )}

            {result && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
                <div className="text-sm text-emerald-300 inline-flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4" />
                  Credential created
                  {result.name && <span className="text-gray-400 font-mono text-[11px]">· {result.name}</span>}
                </div>

                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">
                  TELNYX_TELEPHONY_CREDENTIAL_ID
                </div>
                <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2">
                  <code className="flex-1 text-sm font-mono text-gray-200 truncate">{result.id}</code>
                  <GhostButton onClick={copyId}>
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </GhostButton>
                </div>

                <ol className="mt-4 space-y-1.5 text-xs text-gray-400 list-decimal list-inside">
                  <li>Paste that ID into Vercel → Settings → Environment Variables as <span className="font-mono text-gray-300">TELNYX_TELEPHONY_CREDENTIAL_ID</span>.</li>
                  <li>Make sure <span className="font-mono text-gray-300">TELNYX_OUTBOUND_FROM_NUMBER</span> is set too (your bought number, E.164 format).</li>
                  <li>Redeploy. The dialer launcher in the rep portal flips to a green "ready" dot.</li>
                </ol>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </AdminShell>
  )
}
