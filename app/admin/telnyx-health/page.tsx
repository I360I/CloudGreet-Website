'use client'

/**
 * /admin/telnyx-health
 *
 * Read-only diagnostic + checklist for the Telnyx wiring. Surfaces:
 *   - Env var presence
 *   - The exact webhook URLs that should be configured in Telnyx
 *   - Recent inbound activity (opt-outs registered) - proof inbound
 *     webhooks are reaching us
 *   - Recent send activity / failures - proof outbound is working
 *
 * Built so you can walk through setup with eyes-on-glass instead of
 * juggling docs + dashboards.
 */

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, GhostButton } from '../_components/ui'

type Health = {
  success: boolean
  env: {
    TELNYX_API_KEY: boolean
    TELNYX_PUBLIC_KEY: boolean
    TELNYX_MESSAGING_PROFILE_ID: boolean
    CLOUDGREET_NOTIFICATIONS_FROM: string | null
  }
  expected_webhooks: { inbound_sms: string; voice: string }
  activity: {
    recent_opt_outs: Array<{ phone: string; opted_out_at: string; source: string }>
    recent_send_failures: Array<{
      id: string
      business_id: string
      customer_phone: string
      failure_reason: string | null
      updated_at: string
    }>
    recent_sends: Array<{
      customer_phone: string
      sent_at: string
      telnyx_message_id: string | null
    }>
  }
}

export default function TelnyxHealthPage() {
  const [data, setData] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetchWithAuth('/api/admin/telnyx/health')
      const j = await r.json().catch(() => ({}))
      if (j?.success) setData(j)
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500) } catch { /* */ }
  }

  if (loading || !data) {
    return (
      <AdminShell activeLabel="Tools">
        <div className="px-5 sm:px-8 py-6 sm:py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      </AdminShell>
    )
  }

  const allEnvOk = data.env.TELNYX_API_KEY && data.env.TELNYX_PUBLIC_KEY && data.env.CLOUDGREET_NOTIFICATIONS_FROM
  const anyInbound = data.activity.recent_opt_outs.length > 0
  const anySends = data.activity.recent_sends.length > 0

  return (
    <AdminShell activeLabel="Tools">
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">Operations</div>
            <h1 className="text-2xl font-medium tracking-tight text-white">Telnyx health</h1>
            <p className="text-sm text-gray-400 mt-1.5">
              Diagnostic for the Telnyx wiring. Use this when setting up a new number, or when SMS isn&apos;t flowing.
            </p>
          </div>
          <GhostButton onClick={load}><RefreshCw className="w-3 h-3" /> Refresh</GhostButton>
        </div>

        {/* 1. Env vars */}
        <Panel>
          <PanelHeader title="1. Environment variables" eyebrow={allEnvOk ? 'all set' : 'incomplete'} />
          <ul className="space-y-2 text-sm">
            <EnvRow name="TELNYX_API_KEY" set={data.env.TELNYX_API_KEY} hint="From Telnyx → Account → API Keys" />
            <EnvRow name="TELNYX_PUBLIC_KEY" set={data.env.TELNYX_PUBLIC_KEY} hint="From Telnyx → Account → Public Keys. Required - webhooks reject without it." />
            <EnvRow name="TELNYX_MESSAGING_PROFILE_ID" set={data.env.TELNYX_MESSAGING_PROFILE_ID} hint="From Telnyx → Messaging → Messaging Profiles" />
            <EnvRow
              name="CLOUDGREET_NOTIFICATIONS_FROM"
              set={!!data.env.CLOUDGREET_NOTIFICATIONS_FROM}
              hint={data.env.CLOUDGREET_NOTIFICATIONS_FROM ? `Currently: ${data.env.CLOUDGREET_NOTIFICATIONS_FROM}` : 'The +1XXX phone number outbound SMS comes from'}
            />
          </ul>
        </Panel>

        {/* 2. Webhook URLs */}
        <div className="mt-4">
          <Panel>
            <PanelHeader title="2. Webhook URLs to configure in Telnyx" eyebrow="copy + paste" />
            <p className="text-xs text-gray-400 mb-3">
              In Telnyx: <span className="text-gray-200">Messaging → Messaging Profiles → your profile → Inbound Settings → Webhook URL</span>. Paste this:
            </p>
            <CopyRow label="Inbound SMS" value={data.expected_webhooks.inbound_sms} copied={copied === 'in_sms'} onCopy={() => copy(data.expected_webhooks.inbound_sms, 'in_sms')} />
            <p className="text-xs text-gray-400 mt-4 mb-3">
              And for voice (if used): <span className="text-gray-200">Voice → SIP Connections → your connection → Webhook URL</span>:
            </p>
            <CopyRow label="Voice" value={data.expected_webhooks.voice} copied={copied === 'voice'} onCopy={() => copy(data.expected_webhooks.voice, 'voice')} />
            <a
              href="https://portal.telnyx.com/#/app/messaging"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 mt-4"
            >
              Open Telnyx messaging portal <ExternalLink className="w-3 h-3" />
            </a>
          </Panel>
        </div>

        {/* 3. Live verification */}
        <div className="mt-4">
          <Panel>
            <PanelHeader title="3. Live verification" eyebrow="proof of life" />
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-medium text-gray-200 mb-1">Inbound webhook reachable?</div>
                {anyInbound ? (
                  <div className="text-emerald-300 inline-flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Yes - {data.activity.recent_opt_outs.length} recent opt-outs received
                  </div>
                ) : (
                  <div className="text-amber-300 text-xs">
                    <div className="inline-flex items-center gap-2 mb-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Unverified
                    </div>
                    <div className="text-gray-400 leading-relaxed">
                      Text <span className="font-mono text-gray-200">STOP</span> from your phone to{' '}
                      <span className="font-mono text-gray-200">{data.env.CLOUDGREET_NOTIFICATIONS_FROM || '(your CloudGreet number)'}</span>,
                      then click <em>Refresh</em>. If a row appears below, your inbound webhook is wired correctly. If not, the webhook URL in Telnyx isn&apos;t set or doesn&apos;t match.
                    </div>
                  </div>
                )}
                {data.activity.recent_opt_outs.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[11px] font-mono">
                    {data.activity.recent_opt_outs.slice(0, 5).map((o, i) => (
                      <li key={i} className="text-gray-400">
                        <span className="text-gray-200">+{o.phone}</span> · {new Date(o.opted_out_at).toLocaleString()} · {o.source}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="font-medium text-gray-200 mb-1">Outbound (recent sends)</div>
                {anySends ? (
                  <ul className="space-y-1 text-[11px] font-mono text-gray-400">
                    {data.activity.recent_sends.slice(0, 5).map((s, i) => (
                      <li key={i}>
                        <span className="text-gray-200">+{s.customer_phone}</span> · {new Date(s.sent_at).toLocaleString()} · msg <span className="text-gray-500">{s.telnyx_message_id?.slice(0, 12) || '(no id)'}…</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 text-xs">No review SMS sent yet (expected if no client has live appointments).</div>
                )}
              </div>

              {data.activity.recent_send_failures.length > 0 && (
                <div>
                  <div className="font-medium text-rose-200 mb-1">Recent send failures</div>
                  <ul className="space-y-1 text-[11px] font-mono">
                    {data.activity.recent_send_failures.slice(0, 5).map((f, i) => (
                      <li key={i} className="text-rose-300">
                        +{f.customer_phone} · {new Date(f.updated_at).toLocaleString()} · {f.failure_reason?.slice(0, 100) || '(no detail)'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* 4. Setup checklist */}
        <div className="mt-4">
          <Panel>
            <PanelHeader title="4. Setup checklist" eyebrow="if anything above is red" />
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside leading-relaxed">
              <li>In Telnyx: Messaging → Messaging Profiles → your profile → Inbound Settings → Webhook URL = <span className="font-mono text-gray-200">{data.expected_webhooks.inbound_sms}</span> (Webhook API Version: <span className="font-mono">2</span>)</li>
              <li>Same profile → Inbound Settings → Webhook Failover URL: leave empty</li>
              <li>Same profile → Make sure your toll-free / 10DLC number is assigned to this profile.</li>
              <li>Vercel env: <span className="font-mono text-gray-200">TELNYX_PUBLIC_KEY</span> = the multi-line PEM block from Telnyx → Account → Public Keys (paste the full <span className="font-mono">-----BEGIN PUBLIC KEY-----</span>… block).</li>
              <li>Vercel env: <span className="font-mono text-gray-200">CLOUDGREET_NOTIFICATIONS_FROM</span> = your verified toll-free / local number in <span className="font-mono">+1XXXXXXXXXX</span> format.</li>
              <li>After setting envs, redeploy on Vercel.</li>
              <li>Come back here, click Refresh, verify everything is green.</li>
              <li>Final test: text STOP from your phone to your CloudGreet number → row should appear above within ~5 seconds.</li>
            </ol>
          </Panel>
        </div>
      </div>
    </AdminShell>
  )
}

function EnvRow({ name, set, hint }: { name: string; set: boolean; hint: string }) {
  return (
    <li className="flex items-start gap-2">
      {set ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
      <div>
        <div className="font-mono text-xs text-gray-200">{name}</div>
        <div className="text-[11px] text-gray-500">{hint}</div>
      </div>
    </li>
  )
}

function CopyRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 w-20 shrink-0">{label}</div>
      <code className="flex-1 font-mono text-[11px] text-gray-200 bg-black/40 border border-white/10 rounded px-2 py-1.5 break-all">{value}</code>
      <GhostButton onClick={onCopy}>
        {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        {copied ? 'Copied' : 'Copy'}
      </GhostButton>
    </div>
  )
}
