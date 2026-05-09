'use client'

/**
 * Support flow accessible from the dashboard sidebar (above Sign Out)
 * and from any "tap support" prompt elsewhere in the app. Exposes:
 *
 *   1. "Request a detailed change" - structured ticket so the team can
 *      execute (e.g., agent prompt tweak, hours change, voice swap).
 *   2. Direct contact - email + phone fallback for anything urgent.
 *
 * Submissions go to /api/dashboard/support which writes a row to
 * support_requests and pings Slack. Admin sees them in /admin/support-requests.
 */

import { useState } from 'react'
import { LifeBuoy, Mail, Phone, X, Loader2, CheckCircle2 } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+1 (737) 937-0084'
const SUPPORT_PHONE_DIAL = SUPPORT_PHONE.replace(/[^0-9+]/g, '')
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'anthony@cloudgreet.com'

type Kind = 'change_request' | 'message'

export function SupportButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ||
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-black/[.04] transition-all duration-300 ease-out'
        }
        type="button"
      >
        <LifeBuoy className="w-4 h-4" strokeWidth={1.75} /> Support
      </button>
      {open && <SupportModal onClose={() => setOpen(false)} />}
    </>
  )
}

function SupportModal({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<Kind>('change_request')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async () => {
    setError(null); setBusy(true)
    try {
      const r = await fetchWithAuth('/api/dashboard/support', {
        method: 'POST',
        body: JSON.stringify({ kind, subject: subject.trim(), body: body.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setError(j?.error || `Failed (${r.status})`)
      } else {
        setDone(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-sky-600" strokeWidth={1.75} />
            <h3 className="text-base font-medium text-gray-900">Support</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 -m-1" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-medium text-gray-900 mb-1">Got it.</h4>
            <p className="text-sm text-gray-600 max-w-xs mx-auto">
              We&apos;ll reach back out shortly. For urgent issues, the contact
              options below still work.
            </p>
            <button
              onClick={onClose}
              className="mt-5 inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm rounded-lg px-4 py-2"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 pt-4">
              <div className="flex gap-2 mb-4">
                <KindButton active={kind === 'change_request'} onClick={() => setKind('change_request')}>
                  Request a detailed change
                </KindButton>
                <KindButton active={kind === 'message'} onClick={() => setKind('message')}>
                  Send a message
                </KindButton>
              </div>

              <p className="text-[12px] text-gray-500 mb-3 leading-relaxed">
                {kind === 'change_request'
                  ? 'Tell us exactly what you want changed (agent script tweak, hours update, voice swap, pricing edit, etc.). The team picks it up the next morning - usually faster.'
                  : 'Anything else - questions, feedback, weird call, technical issue. We get a ping right away.'}
              </p>

              <label className="block">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Subject</span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  placeholder={kind === 'change_request' ? 'e.g. Add weekend hours to the agent' : 'e.g. Question about my Cal.com setup'}
                  className="mt-1 w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </label>

              <label className="block mt-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Details</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder={kind === 'change_request' ? 'What should change, and ideally why. The more specific, the faster we ship it.' : 'What\'s going on?'}
                  className="mt-1 w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-y"
                />
                <div className="text-[10px] text-gray-400 text-right mt-0.5">{body.length}/4000</div>
              </label>

              {error && (
                <div className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">{error}</div>
              )}
            </div>

            <div className="px-5 pt-2 pb-4 flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={submit}
                disabled={busy || !subject.trim() || !body.trim()}
                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm rounded-lg px-4 py-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {kind === 'change_request' ? 'Submit change request' : 'Send message'}
              </button>
              <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-900">Cancel</button>
            </div>

            <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/40">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1.5">
                Need to reach us directly
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-1.5 text-sky-700 hover:text-sky-900"
                >
                  <Mail className="w-3.5 h-3.5" /> {SUPPORT_EMAIL}
                </a>
                <a
                  href={`tel:${SUPPORT_PHONE_DIAL}`}
                  className="inline-flex items-center gap-1.5 text-sky-700 hover:text-sky-900"
                >
                  <Phone className="w-3.5 h-3.5" /> {SUPPORT_PHONE}
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function KindButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-xs font-medium rounded-lg border px-3 py-2 transition-colors ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
      }`}
    >
      {children}
    </button>
  )
}
