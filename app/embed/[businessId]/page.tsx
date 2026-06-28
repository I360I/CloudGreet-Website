import { supabaseAdmin } from '@/lib/supabase'
import EmbedChat from './EmbedChat'

export const dynamic = 'force-dynamic'

// Standalone chat surface loaded inside the website widget's iframe
// (public/widget.js). No site chrome - just the chat card filling the frame.
export default async function EmbedChatPage({ params }: { params: { businessId: string } }) {
  const raw = params.businessId || ''
  // Tolerate trailing slashes / whitespace / accidental link wrapping by
  // pulling the UUID out of whatever arrived.
  let id = raw
  try { id = decodeURIComponent(raw) } catch { /* keep raw */ }
  const m = id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  const businessId = (m ? m[0] : id).trim()

  const { data: biz, error } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, auto_open')
    .eq('id', businessId)
    .maybeSingle()

  if (!biz) {
    // Logged so we can tell a bad/garbled id apart from a real query failure.
    console.error('[embed] business not found', { raw, businessId, error: error?.message || null })
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#6b7280', fontSize: 14, padding: 24, textAlign: 'center', gap: 6 }}>
        <div>Chat isn&apos;t set up for this site yet.</div>
        <div style={{ fontSize: 11, color: '#b4bac3' }}>ref: {businessId.slice(0, 8) || 'none'}{error ? ' / lookup error' : ''}</div>
      </div>
    )
  }

  return <EmbedChat businessId={(biz as any).id} name={(biz as any).business_name || 'us'} autoOpen={!!(biz as any).auto_open} />
}
