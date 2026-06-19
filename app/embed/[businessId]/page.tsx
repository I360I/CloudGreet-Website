import { supabaseAdmin } from '@/lib/supabase'
import EmbedChat from './EmbedChat'

export const dynamic = 'force-dynamic'

// Standalone chat surface loaded inside the website widget's iframe
// (public/widget.js). No site chrome - just the chat card filling the frame.
export default async function EmbedChatPage({ params }: { params: { businessId: string } }) {
  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name')
    .eq('id', params.businessId)
    .maybeSingle()

  if (!biz) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#6b7280', fontSize: 14, padding: 24, textAlign: 'center' }}>
        Chat isn&apos;t set up for this site yet.
      </div>
    )
  }

  return <EmbedChat businessId={(biz as any).id} name={(biz as any).business_name || 'us'} />
}
