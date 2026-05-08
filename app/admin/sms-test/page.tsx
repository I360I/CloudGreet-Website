'use client'

import { useState } from 'react'
import { Loader2, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'

const DEFAULT_TEMPLATE =
  '[CloudGreet] New booking: {name}, {time}. Service: {service}. Caller: {phone}'

/**
 * Admin-only SMS tester. Lets you fire a single message to any
 * number from any sender (or the configured CLOUDGREET_NOTIFICATIONS_FROM
 * default) and see the raw Telnyx response. Use this before Aaron's
 * onboarding call to confirm the wiring end-to-end.
 */
export default function AdminSmsTestPage() {
  const [to, setTo] = useState('')
  const [from, setFrom] = useState('')
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any | null>(null)

  const send = async () => {
    if (!to.trim()) return
    setBusy(true); setResult(null)
    try {
      const r = await fetchWithAuth('/api/admin/sms-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          from: from.trim() || undefined,
          template: template.trim() || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      setResult({ ok: r.ok && j?.success, ...j })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminShell activeLabel="Overview">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
            Admin · SMS tester
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-gray-100">Booking notification test</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-prose">
            Fires one SMS via Telnyx using the same code path the live
            booking-notification flow uses. Surfaces the raw Telnyx
            response when something goes wrong (most common: the
            sender number isn&apos;t attached to the messaging profile,
            or A2P 10DLC isn&apos;t registered yet).
          </p>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Send to
            </label>
            <input
              type="tel"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+15125550100"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/30 font-mono"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              E.164 (e.g. +15125550100). Use your own cell to verify.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              From (sender number)
            </label>
            <input
              type="tel"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="leave blank to use CLOUDGREET_NOTIFICATIONS_FROM env"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/30 font-mono"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Must be on a Telnyx messaging profile. Blank = use the env default.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Template
            </label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/30 font-mono resize-y"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Variables: {'{name} {phone} {time} {service} {address} {business}'} - sample values inserted at send time.
            </p>
          </div>

          <button
            onClick={send}
            disabled={busy || !to.trim()}
            className="inline-flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send test SMS
          </button>
        </div>

        {result && (
          <div className={`rounded-2xl border p-5 ${
            result.ok
              ? 'bg-emerald-950/40 border-emerald-700/40'
              : 'bg-rose-950/40 border-rose-700/40'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {result.ok
                ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                : <AlertCircle className="w-5 h-5 text-rose-400" />}
              <h3 className={`text-sm font-medium ${result.ok ? 'text-emerald-100' : 'text-rose-100'}`}>
                {result.ok ? 'Sent' : 'Failed'}
              </h3>
            </div>
            <pre className="text-[11px] font-mono whitespace-pre-wrap break-all text-gray-300 bg-black/30 border border-white/5 rounded-lg p-3 max-h-72 overflow-auto">
{JSON.stringify(result, null, 2)}
            </pre>
            {!result.ok && result.diagnostics && (
              <div className="mt-3 text-[12px] text-rose-100 leading-relaxed">
                <strong>Likely causes:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-200/90">
                  {!result.diagnostics.TELNYX_API_KEY_set && (
                    <li><code>TELNYX_API_KEY</code> not set</li>
                  )}
                  {!result.diagnostics.CLOUDGREET_NOTIFICATIONS_FROM_set && !from.trim() && (
                    <li><code>CLOUDGREET_NOTIFICATIONS_FROM</code> not set and no <code>from</code> provided</li>
                  )}
                  {result.diagnostics.TELNYX_API_KEY_set && (
                    <>
                      <li>Sender number ({result.diagnostics.from_used}) not attached to a messaging profile in the Telnyx dashboard</li>
                      <li>A2P 10DLC not registered (carriers reject unregistered traffic)</li>
                      <li>Recipient previously replied STOP - check the opt-out list</li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 text-[12px] text-gray-400 leading-relaxed">
          <h3 className="text-sm font-medium text-gray-200 mb-2">Setup checklist (one-time)</h3>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Order one SMS-capable number in the Telnyx portal.</li>
            <li>In Telnyx → Programmable Messaging → Profiles, click your CloudGreet profile, go to Numbers, attach the new number.</li>
            <li>Set <code className="font-mono text-gray-200">TELNYX_MESSAGING_PROFILE_ID</code> and <code className="font-mono text-gray-200">CLOUDGREET_NOTIFICATIONS_FROM</code> in Vercel env, redeploy.</li>
            <li>Register A2P 10DLC: Telnyx → Messaging → 10DLC → Brand (CloudGreet LLC) + Campaign (use case: <em>Account Notifications</em>).</li>
            <li>Run a test from this page to your own cell.</li>
          </ol>
        </div>
      </div>
    </AdminShell>
  )
}
