'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CircleNotch, WarningCircle, CheckCircle, Eye, EyeSlash } from '@phosphor-icons/react'

// Force dynamic so Next doesn't try to prerender this - useSearchParams
// requires a request and the page is per-invite anyway.
export const dynamic = 'force-dynamic'

export default function SetterAcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center">
          <CircleNotch className="w-5 h-5 text-gray-400 animate-spin" />
        </main>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  )
}

function AcceptInviteInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params?.get('token') || ''

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = firstName.trim() && lastName.trim() && password.length >= 8 && token

  const submit = async () => {
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/setter/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }),
        credentials: 'include',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || `Failed (${res.status})`)
      try {
        localStorage.removeItem('token')
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        localStorage.removeItem('business')
      } catch { /* non-fatal */ }
      router.push('/setter')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center px-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md text-center">
          <WarningCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-medium text-gray-900 mb-2">Invalid invite link</h1>
          <p className="text-sm text-gray-500">
            The link you used didn&apos;t carry a valid token. Ask the admin to send you a new invite.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
      <section className="max-w-xl mx-auto px-6 py-16">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-2">
          CloudGreet · setter onboarding
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight mb-2">
          Set up your account
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Pick a name and password. After this you&apos;ll see your lead list, the dialer, and the scraper.
        </p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="First name" value={firstName} onChange={setFirstName} />
            <Field label="Last name" value={lastName} onChange={setLastName} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-900 pr-10"
              />
              <button
                type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                aria-label="toggle"
              >
                {showPw ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && password.length < 8 && (
              <p className="text-[11px] text-red-600 mt-1">{8 - password.length} more characters</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 flex items-start gap-2">
              <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="w-full bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all duration-300 ease-out disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {submitting ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Create account
          </button>
        </div>
      </section>
    </main>
  )
}

function Field({
  label, value, onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700 mb-1.5 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-900"
      />
    </div>
  )
}
