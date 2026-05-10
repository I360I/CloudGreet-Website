'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CircleNotch, CheckCircle, WarningCircle, CalendarBlank, ArrowSquareOut, Key, X, Eye, EyeSlash, Lock } from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

export default function SalesSettingsPage() {
  const [bookingUrl, setBookingUrl] = useState('')
  const [original, setOriginal] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [calKeySet, setCalKeySet] = useState(false)
  const [calKeyPreview, setCalKeyPreview] = useState('')
  const [calKeyInput, setCalKeyInput] = useState('')
  const [calSaving, setCalSaving] = useState(false)
  const [calSaved, setCalSaved] = useState(false)
  const [calErr, setCalErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/sales/profile')
        const j = await res.json().catch(() => ({}))
        if (cancelled) return
        if (j?.success) {
          setBookingUrl(j.profile.booking_url || '')
          setOriginal(j.profile.booking_url || '')
          setEmail(j.profile.email || '')
          setName(j.profile.name || '')
          setCalKeySet(!!j.profile.cal_api_key_set)
          setCalKeyPreview(j.profile.cal_api_key_preview || '')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const dirty = bookingUrl.trim() !== original.trim()

  const saveCalKey = async (value: string | null) => {
    setCalSaving(true); setCalErr(''); setCalSaved(false)
    try {
      const res = await fetchWithAuth('/api/sales/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cal_api_key: value }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCalErr(j?.error || 'Save failed')
      } else {
        setCalKeySet(value !== null && value !== '')
        setCalKeyInput('')
        setCalSaved(true)
        setTimeout(() => setCalSaved(false), 2500)
        // Refetch the masked preview
        const r = await fetchWithAuth('/api/sales/profile')
        const rj = await r.json().catch(() => ({}))
        if (rj?.success) setCalKeyPreview(rj.profile.cal_api_key_preview || '')
      }
    } finally {
      setCalSaving(false)
    }
  }

  const save = async () => {
    setSaving(true); setErr(''); setSaved(false)
    try {
      const res = await fetchWithAuth('/api/sales/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_url: bookingUrl.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(j?.error || 'Save failed')
      } else {
        setOriginal(bookingUrl.trim())
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <SalesShell activeLabel="Overview">
      <section className="max-w-2xl mx-auto px-6 py-10">
        <SalesPageHeader eyebrow="settings" title="Profile" />

        {loading ? (
          <SalesLoadingState />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-5"
          >
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">You</div>
              <div className="text-sm font-medium text-gray-900 mt-0.5">{name || email}</div>
              <div className="text-xs text-gray-500">{email}</div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <label className="block">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CalendarBlank weight="duotone" className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-medium text-gray-900">Booking link</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Your Calendly / Cal.com / Google Schedule URL. Surfaces as a
                  &quot;Book demo&quot; copy-link button on every lead detail page,
                  and gets included in the welcome email when a prospect pays.
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={bookingUrl}
                    onChange={(e) => setBookingUrl(e.target.value)}
                    placeholder="https://cal.com/your-name/15min"
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  />
                  <button
                    onClick={save}
                    disabled={!dirty || saving}
                    className="text-sm bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-800 disabled:opacity-60 inline-flex items-center gap-1.5"
                  >
                    {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                </div>
                {bookingUrl.trim() && !dirty && (
                  <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-gray-500 hover:text-gray-900"
                  >
                    Open <ArrowSquareOut className="w-3 h-3" />
                  </a>
                )}
              </label>
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                <WarningCircle weight="fill" className="w-4 h-4 mt-0.5" />
                <span>{err}</span>
              </div>
            )}
            {saved && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 flex items-start gap-2">
                <CheckCircle weight="fill" className="w-4 h-4 mt-0.5" />
                <span>Saved.</span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Key weight="duotone" className="w-4 h-4 text-sky-500" />
                <span className="text-sm font-medium text-gray-900">Cal.com integration</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Paste your Cal.com personal API key. Demos you&apos;ve scheduled
                show up automatically in your overview&apos;s call list.{' '}
                <a
                  href="https://app.cal.com/settings/developer/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-700 hover:text-gray-900 underline"
                >
                  Get a key →
                </a>
              </p>

              {calKeySet ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                    <CheckCircle weight="fill" className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-900">Connected</span>
                    <span className="text-xs font-mono text-emerald-700/80">{calKeyPreview}</span>
                  </div>
                  <button
                    onClick={() => saveCalKey(null)}
                    disabled={calSaving}
                    className="text-xs text-gray-500 hover:text-red-600 inline-flex items-center gap-1 px-2 py-1 disabled:opacity-60"
                  >
                    <X className="w-3 h-3" /> Disconnect
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={calKeyInput}
                    onChange={(e) => setCalKeyInput(e.target.value)}
                    placeholder="cal_live_..."
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-400"
                  />
                  <button
                    onClick={() => saveCalKey(calKeyInput.trim())}
                    disabled={calSaving || calKeyInput.trim().length < 10}
                    className="text-sm bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-800 disabled:opacity-60 inline-flex items-center gap-1.5"
                  >
                    {calSaving ? <CircleNotch className="w-4 h-4 animate-spin" /> : 'Connect'}
                  </button>
                </div>
              )}

              {calErr && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                  <WarningCircle weight="fill" className="w-4 h-4 mt-0.5" />
                  <span>{calErr}</span>
                </div>
              )}
              {calSaved && (
                <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 flex items-start gap-2">
                  <CheckCircle weight="fill" className="w-4 h-4 mt-0.5" />
                  <span>Saved.</span>
                </div>
              )}
            </div>

            <PasswordSection />
          </motion.div>
        )}
      </section>
    </SalesShell>
  )
}

function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm(''); setError(''); setSaved(false)
  }

  const onSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      if (next.length < 8) throw new Error('New password must be at least 8 characters')
      if (next !== confirm) throw new Error("New passwords don't match")
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json?.error || 'Failed to change password')
      setSaved(true)
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const canSave = current.length > 0 && next.length >= 8 && next === confirm

  return (
    <div className="border-t border-gray-100 pt-5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Lock weight="duotone" className="w-4 h-4 text-rose-500" />
        <span className="text-sm font-medium text-gray-900">Change password</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        You&apos;ll stay signed in on this device. Other sessions keep working until they expire.
      </p>

      <div className="space-y-2">
        <PwField
          placeholder="Current password" value={current} onChange={setCurrent}
          show={showCurrent} onToggle={() => setShowCurrent((v) => !v)}
        />
        <PwField
          placeholder="New password (min 8 chars)" value={next} onChange={setNext}
          show={showNext} onToggle={() => setShowNext((v) => !v)}
        />
        <PwField
          placeholder="Confirm new password" value={confirm} onChange={setConfirm}
          show={showNext} onToggle={() => setShowNext((v) => !v)}
          error={confirm.length > 0 && next !== confirm ? "Doesn't match" : undefined}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={!canSave || saving}
          className="text-sm bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-800 disabled:opacity-60 inline-flex items-center gap-1.5"
        >
          {saving && <CircleNotch className="w-4 h-4 animate-spin" />}
          Update password
        </button>
        {(current || next || confirm) && !saving && (
          <button
            onClick={reset}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Clear
          </button>
        )}
      </div>

      {saved && (
        <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 flex items-start gap-2">
          <CheckCircle weight="fill" className="w-4 h-4 mt-0.5" />
          <span>Password updated.</span>
        </div>
      )}
      {error && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
          <WarningCircle weight="fill" className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

function PwField({
  placeholder, value, onChange, show, onToggle, error,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  error?: string
}) {
  return (
    <div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-gray-400"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <div className="text-[11px] text-red-600 mt-1">{error}</div>}
    </div>
  )
}
