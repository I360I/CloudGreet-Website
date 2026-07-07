'use client'

import { useEffect, useState } from 'react'
import { ShieldWarning, ArrowLeft, CircleNotch } from '@phosphor-icons/react'

/**
 * Renders a fixed top banner whenever an admin is impersonating a
 * client account. One-click "Return to admin" swaps the auth cookie
 * back to the admin's original token via /api/admin/end-impersonation.
 *
 * Auto-hides if there's no stashed impersonator_token cookie - so this
 * is a no-op for the actual client when they're signed in normally.
 */
export function ImpersonationBanner() {
  const [show, setShow] = useState(false)
  const [impersonatorRole, setImpersonatorRole] = useState<string | null>(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/me/impersonation-status', { credentials: 'include', cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        if (!cancelled && j?.impersonating) {
          setShow(true)
          setImpersonatorRole(j.impersonator_role || 'admin')
        }
      } catch { /* not impersonating, no-op */ }
    })()
    return () => { cancelled = true }
  }, [])

  if (!show) return null

  const isRep = impersonatorRole === 'sales'
  const returnLabel = isRep ? 'Return to your account' : 'Return to admin'

  const onReturn = async () => {
    setExiting(true)
    try {
      const r = await fetch('/api/admin/end-impersonation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_to: isRep ? '/sales' : '/admin/clients' }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.success) {
        window.location.href = j.redirect_url || (isRep ? '/sales' : '/admin')
      } else {
        alert(j?.error || 'Could not return')
        setExiting(false)
      }
    } catch {
      alert('Could not return')
      setExiting(false)
    }
  }

  return (
    <div className="sticky top-0 z-[60] bg-amber-500 text-amber-950 border-b border-amber-600 px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldWarning className="w-4 h-4" />
          You&apos;re signed in as a client account. Anything you do here is
          recorded as them.
        </div>
        <button
          type="button"
          onClick={onReturn}
          disabled={exiting}
          className="inline-flex items-center gap-1.5 bg-amber-950 text-amber-50 hover:bg-black rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          {exiting ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          {returnLabel}
        </button>
      </div>
    </div>
  )
}
