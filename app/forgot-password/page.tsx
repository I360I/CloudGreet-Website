'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CheckCircle } from '@phosphor-icons/react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) {
        setError(j?.error || 'Could not send reset link')
      } else {
        setDone(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center px-4 py-16">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">CloudGreet</div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-gray-900 mt-2">Reset your password</h1>
          <p className="text-sm text-gray-500 mt-2">
            Enter your email and we&apos;ll send a link to set a new one.
          </p>
        </div>

        {done ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-base font-medium text-gray-900 mb-1">Check your inbox</h2>
            <p className="text-sm text-gray-500">
              If <span className="font-mono">{email}</span> is on file, a reset link is on its way. The link is good for 1 hour.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 mt-5 text-sm text-gray-700 hover:text-gray-900"
            >
              Back to sign in <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm text-gray-700 mb-2 block">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
                placeholder="you@business.com"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="text-center text-sm text-gray-500 pt-1">
              Remembered it?{' '}
              <Link href="/login" className="text-gray-900 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </section>
    </main>
  )
}
