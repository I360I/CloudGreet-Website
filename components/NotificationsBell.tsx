'use client'

/**
 * Notifications bell + dropdown panel. Shared between admin and sales
 * shells. Caller passes the API base path so the same component can
 * fetch from /api/admin/notifications or /api/sales/notifications.
 *
 * Behavior:
 * - Polls unread count every 30s.
 * - Click opens a popover with the latest 20 notifications.
 * - Clicking an item with a `link` navigates + marks it read.
 * - "Mark all read" clears the badge in one click.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Bell, Check, X, WarningCircle, CheckCircle, Warning, Info,
} from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type Severity = 'info' | 'success' | 'warning' | 'critical'

type Notif = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  icon: string | null
  severity: Severity
  metadata: Record<string, any> | null
  read_at: string | null
  created_at: string
}

type Theme = 'light' | 'dark'

export function NotificationsBell({
  basePath,
  theme = 'light',
}: {
  /** e.g. '/api/admin/notifications' or '/api/sales/notifications' */
  basePath: string
  theme?: Theme
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const popRef = useRef<HTMLDivElement | null>(null)

  const load = async (opts: { full?: boolean } = {}) => {
    if (opts.full) setLoading(true)
    try {
      const r = await fetchWithAuth(`${basePath}?limit=20`)
      const j = await r.json().catch(() => ({}))
      if (j?.success) {
        if (opts.full) setItems(j.items || [])
        setUnread(j.unread_count || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  // Poll unread count every 30s when tab visible.
  useEffect(() => {
    void load()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 30_000)
    return () => clearInterval(id)
  }, [basePath])

  // Load full list when popover opens.
  useEffect(() => {
    if (open) void load({ full: true })
  }, [open])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const markOne = async (id: string) => {
    setItems((prev) => prev.map((n) => n.id === id && !n.read_at
      ? { ...n, read_at: new Date().toISOString() }
      : n))
    setUnread((c) => Math.max(0, c - 1))
    await fetchWithAuth(basePath, {
      method: 'PATCH',
      body: JSON.stringify({ ids: [id] }),
    })
  }

  const markAll = async () => {
    setItems((prev) => prev.map((n) => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    setUnread(0)
    await fetchWithAuth(basePath, {
      method: 'PATCH',
      body: JSON.stringify({ all: true }),
    })
  }

  // Theme variants
  const isDark = theme === 'dark'
  const buttonClass = isDark
    ? 'relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-300 hover:text-white hover:bg-white/[0.06]'
    : 'relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-black/[.04]'

  // Anchor dropdown to the LEFT of the trigger so it opens toward main
  // content. Anchoring `right-0` was clipping it offscreen when the bell
  // sits in the sidebar (which is itself flush against the viewport's
  // left edge). Width capped + internal scroll keeps long lists tidy.
  const popClass = isDark
    ? 'absolute left-0 mt-2 w-80 max-h-[70vh] overflow-hidden bg-[#0d0d10] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col z-50'
    : 'absolute left-0 mt-2 w-80 max-h-[70vh] overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col z-50'

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <Bell className="w-[18px] h-[18px]" weight={unread > 0 ? 'fill' : 'regular'} />
        {unread > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ${
              isDark ? 'ring-[#0d0d10]' : 'ring-white'
            }`}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div className={popClass}>
          <Header theme={theme} unread={unread} onMarkAll={markAll} onClose={() => setOpen(false)} />
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className={`px-4 py-12 text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Loading…</div>
            ) : items.length === 0 ? (
              <div className={`px-4 py-12 text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                No notifications.
              </div>
            ) : (
              <ul className={isDark ? 'divide-y divide-white/[0.05]' : 'divide-y divide-gray-100'}>
                {items.map((n) => (
                  <NotifItem key={n.id} n={n} theme={theme} onMarkRead={markOne} onClose={() => setOpen(false)} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Wider, full-width row variant. Use in sidebars where the bell-only
 * icon is too cramped to discover. Same dropdown behavior; the trigger
 * is just visually bigger and labeled.
 */
export function NotificationsRow({ basePath }: { basePath: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const load = async (opts: { full?: boolean } = {}) => {
    if (opts.full) setLoading(true)
    try {
      const r = await fetchWithAuth(`${basePath}?limit=20`)
      const j = await r.json().catch(() => ({}))
      if (j?.success) {
        if (opts.full) setItems(j.items || [])
        setUnread(j.unread_count || 0)
      }
    } finally { setLoading(false) }
  }
  useEffect(() => {
    void load()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 30_000)
    return () => clearInterval(id)
  }, [basePath])
  useEffect(() => {
    if (open) void load({ full: true })
  }, [open])
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const markOne = async (id: string) => {
    setItems((prev) => prev.map((n) => n.id === id && !n.read_at
      ? { ...n, read_at: new Date().toISOString() } : n))
    setUnread((c) => Math.max(0, c - 1))
    await fetchWithAuth(basePath, { method: 'PATCH', body: JSON.stringify({ ids: [id] }) })
  }
  const markAll = async () => {
    setItems((prev) => prev.map((n) => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    setUnread(0)
    await fetchWithAuth(basePath, { method: 'PATCH', body: JSON.stringify({ all: true }) })
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          unread > 0
            ? 'bg-sky-50 text-sky-900 hover:bg-sky-100 border border-sky-200'
            : 'text-gray-700 hover:bg-black/[.04] border border-transparent'
        }`}
      >
        <span className="inline-flex items-center gap-2.5">
          <Bell className="w-4 h-4" weight={unread > 0 ? 'fill' : 'regular'} />
          Notifications
        </span>
        {unread > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-rose-500 text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-[70vh] overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col">
          <Header theme="light" unread={unread} onMarkAll={markAll} onClose={() => setOpen(false)} />
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="px-4 py-12 text-center text-xs text-gray-400">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs text-gray-400">No notifications.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => (
                  <NotifItem key={n.id} n={n} theme="light" onMarkRead={markOne} onClose={() => setOpen(false)} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Header({ theme, unread, onMarkAll, onClose }: {
  theme: Theme; unread: number; onMarkAll: () => void; onClose: () => void
}) {
  const isDark = theme === 'dark'
  return (
    <div className={`px-4 py-3 flex items-center justify-between ${isDark ? 'border-b border-white/[0.06]' : 'border-b border-gray-100'}`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Notifications</span>
        {unread > 0 && (
          <span className={`text-[10px] font-mono ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>{unread} unread</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {unread > 0 && (
          <button
            onClick={onMarkAll}
            className={`text-[11px] inline-flex items-center gap-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <Check className="w-3 h-3" /> Mark all read
          </button>
        )}
        <button
          onClick={onClose}
          className={`p-1 -m-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function NotifItem({ n, theme, onMarkRead, onClose }: {
  n: Notif; theme: Theme; onMarkRead: (id: string) => void; onClose: () => void
}) {
  const isDark = theme === 'dark'
  const isUnread = !n.read_at
  const Icon = severityIcon(n.severity)
  const tone = severityTone(n.severity, isDark)

  const Wrapper: any = n.link ? Link : 'div'
  const wrapProps = n.link ? { href: n.link, onClick: () => { onMarkRead(n.id); onClose() } } : {}

  return (
    <li className={isUnread ? (isDark ? 'bg-white/[0.02]' : 'bg-sky-50/40') : ''}>
      <Wrapper {...wrapProps}>
        <div className={`px-4 py-3 flex items-start gap-3 ${n.link ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]' : ''}`}>
          <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${tone}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{n.title}</span>
              {isUnread && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? 'bg-sky-400' : 'bg-sky-500'}`} />}
            </div>
            {n.body && (
              <div className={`text-[11px] mt-0.5 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{n.body}</div>
            )}
            <div className={`text-[10px] mt-1 font-mono ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{timeAgo(n.created_at)}</div>
          </div>
          {!n.link && isUnread && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRead(n.id) }}
              className={`text-[10px] ${isDark ? 'text-gray-500 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'}`}
            >
              Mark read
            </button>
          )}
        </div>
      </Wrapper>
    </li>
  )
}

function severityIcon(s: Severity) {
  return s === 'critical' ? WarningCircle
    : s === 'warning' ? Warning
    : s === 'success' ? CheckCircle
    : Info
}

function severityTone(s: Severity, isDark: boolean): string {
  if (s === 'critical') return isDark ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-100 text-rose-700'
  if (s === 'warning') return isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700'
  if (s === 'success') return isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
  return isDark ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-100 text-sky-700'
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}
