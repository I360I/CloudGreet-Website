import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/dashboard/calcom/status
 *
 * Lightweight status read for the settings page. Returns whether
 * Cal.com is connected, which event type / username we have on file,
 * and whether a webhook is currently registered (cal_com_webhook_id
 * present). The settings UI uses this to decide what to show next to
 * the "Re-sync calendar" button.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('cal_com_api_key, cal_com_username, cal_com_event_type_slug, cal_com_webhook_id, calcom_connected, calcom_connected_at')
    .eq('id', auth.businessId)
    .single()

  return NextResponse.json({
    success: true,
    connected: !!biz?.cal_com_api_key && !!biz?.calcom_connected,
    username: biz?.cal_com_username || null,
    event_type_title: biz?.cal_com_event_type_slug || null,
    webhook_configured: !!biz?.cal_com_webhook_id,
    connected_at: biz?.calcom_connected_at || null,
  })
}
