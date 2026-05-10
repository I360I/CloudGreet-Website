/**
 * Shared query helpers for notification endpoints.
 *
 * Both /api/admin/notifications and /api/sales/notifications need the
 * same fetch + mark-read logic, just with different audience scoping.
 * Centralized here so the two endpoints stay in lockstep.
 */

import { supabaseAdmin } from '@/lib/supabase'

export type NotificationRow = {
  id: string
  audience_type: 'admin' | 'rep' | 'business'
  audience_id: string | null
  type: string
  title: string
  body: string | null
  link: string | null
  icon: string | null
  severity: 'info' | 'success' | 'warning' | 'critical'
  metadata: Record<string, any> | null
  read_at: string | null
  created_at: string
}

export type AudienceQuery =
  | { audience_type: 'admin' }
  | { audience_type: 'rep'; audience_id: string }
  | { audience_type: 'business'; audience_id: string }

export async function listNotifications(
  audience: AudienceQuery,
  opts: { limit?: number; unreadOnly?: boolean } = {},
): Promise<{ items: NotificationRow[]; unread_count: number }> {
  const limit = Math.min(opts.limit ?? 50, 200)

  let q = supabaseAdmin
    .from('notifications')
    .select('id, audience_type, audience_id, type, title, body, link, icon, severity, metadata, read_at, created_at')
    .eq('audience_type', audience.audience_type)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (audience.audience_type !== 'admin') {
    q = q.eq('audience_id', audience.audience_id)
  }
  if (opts.unreadOnly) {
    q = q.is('read_at', null)
  }

  const { data: rows, error } = await q
  if (error) throw new Error(error.message)

  // Unread count - separate cheap query so the bell badge can render
  // before the dropdown content does.
  let unreadQ = supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('audience_type', audience.audience_type)
    .is('read_at', null)
  if (audience.audience_type !== 'admin') {
    unreadQ = unreadQ.eq('audience_id', audience.audience_id)
  }
  const { count } = await unreadQ

  return {
    items: (rows || []) as NotificationRow[],
    unread_count: count || 0,
  }
}

/**
 * Mark notifications as read. Either pass specific ids OR { all: true }.
 * Always scoped to the audience to prevent cross-tenant marking.
 */
export async function markRead(
  audience: AudienceQuery,
  args: { ids?: string[]; all?: boolean },
): Promise<{ marked: number }> {
  const nowIso = new Date().toISOString()
  let q = supabaseAdmin
    .from('notifications')
    .update({ read_at: nowIso })
    .eq('audience_type', audience.audience_type)
    .is('read_at', null)
  if (audience.audience_type !== 'admin') {
    q = q.eq('audience_id', audience.audience_id)
  }
  if (!args.all) {
    if (!args.ids || args.ids.length === 0) return { marked: 0 }
    q = q.in('id', args.ids)
  }
  const { data, error } = await q.select('id')
  if (error) throw new Error(error.message)
  return { marked: data?.length || 0 }
}
