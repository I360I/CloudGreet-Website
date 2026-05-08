import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/sales/[id]/slack-id
 *
 * Helper for the rep detail page's Slack section. Looks up the rep's
 * email, optionally hits Slack's users.lookupByEmail (if SLACK_BOT_TOKEN
 * is configured with users:read.email scope), and assembles the env
 * value the admin should paste into Vercel for
 * SLACK_AGENT_COMPLETE_MENTIONS so this person gets @-pinged on every
 * agent-complete event.
 *
 * Returns:
 *   email                  the rep's email on file
 *   slack_user_id          UXXXXXXX if found, else null
 *   mention_tag            "<@UXXXXXXX>" ready to paste, else null
 *   current_env            current value of SLACK_AGENT_COMPLETE_MENTIONS
 *   suggested_env          current_env merged with mention_tag (deduped)
 *   already_included       true if mention_tag is already in current_env
 *   bot_token_configured   so the UI can switch to "manual paste" if not
 *   invite_url             SLACK_INVITE_URL if set, so the UI can offer
 *                          "send Aaron an invite"
 *   lookup_error           short string if Slack returned an error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rep } = await supabaseAdmin
    .from('custom_users')
    .select('id, email')
    .eq('id', params.id)
    .maybeSingle()
  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })

  const email = (rep as any).email || null
  const botToken = process.env.SLACK_BOT_TOKEN || ''
  const currentEnv = process.env.SLACK_AGENT_COMPLETE_MENTIONS || ''
  const inviteUrl = process.env.SLACK_INVITE_URL || null

  let slackUserId: string | null = null
  let mentionTag: string | null = null
  let lookupError: string | null = null

  if (email && botToken) {
    try {
      const r = await fetch(
        `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${botToken}` } },
      )
      const j = await r.json().catch(() => ({}))
      if (j?.ok && j?.user?.id) {
        slackUserId = j.user.id
        mentionTag = `<@${slackUserId}>`
      } else {
        lookupError = j?.error || `lookup failed (${r.status})`
      }
    } catch (e) {
      lookupError = e instanceof Error ? e.message : 'lookup failed'
    }
  }

  // Merge mention into current env value, dedupe by token.
  const tokens = new Set(currentEnv.split(/\s+/).map((s) => s.trim()).filter(Boolean))
  const alreadyIncluded = !!mentionTag && tokens.has(mentionTag)
  if (mentionTag) tokens.add(mentionTag)
  const suggestedEnv = Array.from(tokens).join(' ')

  return NextResponse.json({
    success: true,
    email,
    slack_user_id: slackUserId,
    mention_tag: mentionTag,
    current_env: currentEnv,
    suggested_env: suggestedEnv,
    already_included: alreadyIncluded,
    bot_token_configured: !!botToken,
    invite_url: inviteUrl,
    lookup_error: lookupError,
  })
}
