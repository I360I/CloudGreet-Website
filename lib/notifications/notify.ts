/**
 * Notifications fanout.
 *
 * Three audiences:
 *   - notifyAdmin:    every admin sees it (audience_type='admin', audience_id=null)
 *   - notifyRep:      one rep sees it (audience_type='rep', audience_id=rep's user_id)
 *   - notifyBusiness: one business owner sees it (audience_type='business', audience_id=business_id)
 *
 * All helpers are best-effort. They log on failure and never throw -
 * a notification dropping shouldn't break the underlying flow that
 * triggered it.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export type NotifySeverity = 'info' | 'success' | 'warning' | 'critical'

export type NotifyInput = {
  type: string
  title: string
  body?: string
  link?: string
  icon?: string
  severity?: NotifySeverity
  metadata?: Record<string, unknown>
}

async function insert(args: {
  audience_type: 'admin' | 'rep' | 'business'
  audience_id: string | null
} & NotifyInput): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('notifications').insert({
      audience_type: args.audience_type,
      audience_id: args.audience_id,
      type: args.type,
      title: args.title.slice(0, 280),
      body: args.body ? args.body.slice(0, 2000) : null,
      link: args.link || null,
      icon: args.icon || null,
      severity: args.severity || 'info',
      metadata: args.metadata || null,
    })
    if (error) {
      logger.warn('notification insert failed', {
        type: args.type,
        audience: args.audience_type,
        error: error.message,
      })
    }
  } catch (e) {
    logger.warn('notification insert threw', {
      type: args.type,
      audience: args.audience_type,
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }
}

export async function notifyAdmin(input: NotifyInput): Promise<void> {
  return insert({ audience_type: 'admin', audience_id: null, ...input })
}

export async function notifyRep(repUserId: string, input: NotifyInput): Promise<void> {
  if (!repUserId) return
  return insert({ audience_type: 'rep', audience_id: repUserId, ...input })
}

export async function notifyBusiness(businessId: string, input: NotifyInput): Promise<void> {
  if (!businessId) return
  return insert({ audience_type: 'business', audience_id: businessId, ...input })
}
