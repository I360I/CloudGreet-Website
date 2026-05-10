'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeSlash, CheckCircle, WarningCircle } from '@phosphor-icons/react'

function ResetPasswordInner() {
  const search = useSearchParams()
  const router = useRouter()
  const token = search?.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError("Passwords don't match"); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) {
        setError(j?.error || 'Could not reset password')
      } else {
        setDone(true)
        setTimeout(() => router.replace('/login'), 1800)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <WarningCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-medium text-gray-900 mb-1">Missing reset token</h2>
        <p className="text-sm text-gray-500">
          This page needs a token from your reset email. Request a new link below.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 mt-5 text-sm text-gray-700 hover:text-gray-900"
        >
          Send a new reset link
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
        <h2 className="text-base font-medium text-gray-900 mb-1">Password updated</h2>
        <p className="text-sm text-gray-500">Taking you to sign in…</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
      <div>
        <label htmlFor="password" className="text-sm text-gray-700 mb-2 block">New password</label>
        <div className="relative">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full px-4 py-3 pr-11 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
            placeholder="At least 8 characters"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirm" className="text-sm text-gray-700 mb-2 block">Confirm new password</label>
        <input
          id="confirm"
          type={show ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          minLength={8}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || password.length < 8 || password !== confirm}
        className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {loading ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center px-4 py-16">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">CloudGreet</div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-gray-900 mt-2">Set a new password</h1>
        </div>
        <Suspense
          fallback={
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-500">
              Loading…
            </div>
          }
        >
          <ResetPasswordInner />
        </Suspense>
      </section>
    </main>
  )
}
