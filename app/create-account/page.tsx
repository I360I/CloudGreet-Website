'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CircleNotch, CheckCircle, WarningCircle } from '@phosphor-icons/react'

/**
 * Public self-serve account creation page. Rendered at
 *   /create-account?token=<token>
 *
 * The rep generates a token via /api/sales/leads/[id]/account-link and
 * shares the URL with the prospect (email or live during the demo).
 * The prospect picks a password, hits Create, and lands on
 * /dashboard/onboarding signed in as the new business owner.
 *
 * Wrapped in Suspense because useSearchParams suspends.
 */
export default function CreateAccountPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <CreateAccountInner />
    </Suspense>
  )
}

type InviteInfo = {
  email: string | null
  business_name: string | null
  contact_name: string | null
  rep_name: string
}

function CreateAccountInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params?.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoadError('missing_token')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/account-invite/${encodeURIComponent(token)}`, {
          credentials: 'include',
        })
        const j = await r.json().catch(() => ({}))
        if (cancelled) return
        if (!r.ok || !j?.success) {
          setLoadError(j?.error || 'invite_not_found')
        } else {
          setInvite(j.invite)
          if (j.invite?.contact_name) {
            const parts = String(j.invite.contact_name).trim().split(/\s+/)
            setFirstName(parts[0] || '')
            setLastName(parts.slice(1).join(' ') || '')
          }
        }
      } catch {
        if (!cancelled) setLoadError('network')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [token])

  const needsEmail = !invite?.email
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (needsEmail && !/^[^@]+@[^@]+\.[^@]+$/.test(emailInput.trim())) {
      setSubmitError('Enter a valid email.')
      return
    }
    if (password.length < 8) { setSubmitError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setSubmitError("Passwords don't match."); return }
    setSubmitting(true)
    try {
      // Scrub any leftover client state before becoming a new user.
      try {
        const { clearClientAuthState } = await import('@/lib/auth/session-guard')
        clearClientAuthState()
      } catch { /* non-fatal */ }
      const r = await fetch(`/api/account-invite/${encodeURIComponent(token)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          email: needsEmail ? emailInput.trim().toLowerCase() : undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setSubmitError(prettyError(j?.error) || `Sign-up failed (${r.status})`)
        return
      }
      // Hard navigate so the new cookie + session-guard fingerprint are
      // picked up cleanly on the dashboard route.
      window.location.href = j.redirect_url || '/dashboard/onboarding'
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Sign-up failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingShell />

  if (loadError || !invite) {
    return (
      <Shell>
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <WarningCircle weight="fill" className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-rose-900 mb-1">{loadHeadline(loadError)}</div>
            <p className="text-rose-800/80">{loadBody(loadError)}</p>
            <p className="text-rose-800/80 mt-2 text-xs">
              Ask your CloudGreet rep to send you a fresh link.
            </p>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-xl font-medium text-gray-900 text-center mb-1">
          Create account for {invite.business_name || 'your business'}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-5">
          {invite.rep_name} set this up for you. Pick a password and you&apos;re in.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
            {invite.email ? (
              <div className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono">
                {invite.email}
              </div>
            ) : (
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@yourbusiness.com"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900"
              />
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Robert"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Reed"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              autoFocus
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type it again"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900"
            />
          </div>

          {submitError && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800 flex items-start gap-2">
              <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || password.length < 8 || password !== confirmPassword}
            className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            {submitting ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CheckCircle weight="fill" className="w-4 h-4" />}
            {submitting ? 'Creating your account…' : 'Create my account'}
          </button>

          <p className="text-[11px] text-gray-500 text-center">
            By creating an account you agree to CloudGreet&apos;s terms and privacy policy.
          </p>
        </form>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f5f1] text-gray-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-gray-500">CloudGreet</div>
          <div className="text-xs text-gray-400 mt-0.5">AI receptionist for service businesses</div>
        </div>
        {children}
      </div>
    </main>
  )
}

function LoadingShell() {
  return (
    <Shell>
      <div className="bg-white border border-gray-200 rounded-2xl p-10 flex items-center justify-center">
        <CircleNotch className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    </Shell>
  )
}

function loadHeadline(err: string | null): string {
  switch (err) {
    case 'invite_consumed': return 'This invite was already used'
    case 'invite_expired':  return 'This invite has expired'
    case 'invite_not_found': return "We couldn't find that invite"
    case 'missing_token':   return 'Missing invite token'
    case 'network':         return "Couldn't reach the server"
    default:                return 'Something went wrong'
  }
}
function loadBody(err: string | null): string {
  switch (err) {
    case 'invite_consumed': return 'Looks like this link was already used to create an account. Try signing in at /login - or ask your CloudGreet rep to send you a fresh link.'
    case 'invite_expired':  return 'These links expire after 14 days. Ask your CloudGreet rep to send you a new one.'
    case 'invite_not_found': return 'The link might be mistyped. Double-check the URL or ask for a new one.'
    case 'missing_token':   return 'The URL needs a ?token=… parameter. Use the full link your rep sent you.'
    case 'network':         return 'Refresh in a moment. If this keeps happening, ask your rep.'
    default:                return 'Refresh and try again, or ask your rep to send a fresh link.'
  }
}
function prettyError(code: unknown): string | null {
  if (!code || typeof code !== 'string') return null
  switch (code) {
    case 'invite_consumed': return 'This invite has already been used. Try signing in.'
    case 'invite_expired':  return 'This invite has expired. Ask your rep for a fresh link.'
    case 'invite_not_found': return "We couldn't find that invite."
    default: return code.length > 80 ? code.slice(0, 80) + '…' : code
  }
}
