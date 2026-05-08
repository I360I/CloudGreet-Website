'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Copy, ShoppingCart } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PrimaryButton, GhostButton, Input } from '../_components/ui'

/**
 * Buys an SMS-capable local US number on Telnyx and attaches it to the
 * messaging profile in one click. Surfaces the resulting E.164 number
 * so the operator can paste it into CLOUDGREET_NOTIFICATIONS_FROM.
 */
export default function BuySmsNumberPage() {
  const [areaCode, setAreaCode] = useState('512')
  const [profileId, setProfileId] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const submit = async () => {
    setBusy(true); setError(null); setResult(null)
    try {
      const r = await fetchWithAuth('/api/admin/telnyx/buy-sms-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area_code: areaCode.trim() || undefined,
          messaging_profile_id: profileId.trim() || undefined,
        }),
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

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { /* non-fatal */ }
  }

  return (
    <AdminShell activeLabel="Tools">
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-2xl">
        <div className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
            One-click provisioning
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white">Buy SMS number</h1>
          <p className="text-sm text-gray-400 mt-1.5">
            Searches Telnyx for an SMS-capable local number, orders it, and attaches it to the messaging profile in one call. Paste the result into <span className="font-mono text-gray-300">CLOUDGREET_NOTIFICATIONS_FROM</span> in Vercel.
          </p>
        </div>

        <Panel padding="normal">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1.5">
                Area code (preferred)
              </label>
              <Input
                placeholder="512"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                className="font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                3-digit US area code. If inventory is empty, falls back to any US local number.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1.5">
                Messaging profile ID (optional)
              </label>
              <Input
                placeholder="leave blank to use TELNYX_MESSAGING_PROFILE_ID env"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                className="font-mono"
              />
            </div>

            {!result && (
              <div className="flex items-center gap-2">
                <PrimaryButton onClick={submit} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  Buy + attach
                </PrimaryButton>
                {error && (
                  <span className="text-xs text-rose-300 inline-flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {error}
                  </span>
                )}
              </div>
            )}

            {result && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
                <div className="text-sm text-emerald-300 inline-flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  Number purchased and attached
                </div>

                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">
                  CLOUDGREET_NOTIFICATIONS_FROM
                </div>
                <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2">
                  <code className="flex-1 text-sm font-mono text-gray-200 truncate">{result.phone_number}</code>
                  <GhostButton onClick={() => copy(result.phone_number)}>
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </GhostButton>
                </div>

                {Array.isArray(result.next_steps) && (
                  <ol className="mt-4 space-y-1.5 text-xs text-gray-400 list-decimal list-inside">
                    {result.next_steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ol>
                )}

                <div className="mt-3">
                  <GhostButton onClick={() => { setResult(null); setError(null) }}>
                    Buy another
                  </GhostButton>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </AdminShell>
  )
}
