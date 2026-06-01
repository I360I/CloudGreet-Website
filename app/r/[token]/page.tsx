import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Public, login-free read-only transcript of a text-to-book SMS
 * conversation. Reached via the unguessable report_token in the "view full
 * report" link texted to the admin. Anyone with the link can read that one
 * thread; nothing else is exposed.
 */

function fmtPhone(p: string): string {
  const d = (p || '').replace(/\D/g, '')
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
  if (ten.length === 10) return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
  return p
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  } catch { return '' }
}

export default async function ReportPage({ params }: { params: { token: string } }) {
  const token = params.token

  const { data: convo } = await supabaseAdmin
    .from('sms_conversations')
    .select('id, business_id, customer_phone, created_at')
    .eq('report_token', token)
    .maybeSingle()

  if (!convo) {
    return (
      <div className="min-h-screen bg-[#f6f5f1] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-sm font-mono uppercase tracking-[0.2em] text-gray-400 mb-2">CloudGreet</div>
          <div className="text-gray-700">This report link is invalid or has expired.</div>
        </div>
      </div>
    )
  }

  const [{ data: biz }, { data: msgs }] = await Promise.all([
    supabaseAdmin.from('businesses').select('business_name').eq('id', (convo as any).business_id).maybeSingle(),
    supabaseAdmin
      .from('sms_agent_messages')
      .select('direction, body, created_at, tool_calls')
      .eq('conversation_id', (convo as any).id)
      .order('created_at', { ascending: true }),
  ])

  const businessName = (biz as any)?.business_name || 'Client'
  const messages = (msgs || []) as Array<{ direction: string; body: string; created_at: string; tool_calls: any }>

  return (
    <div className="min-h-screen bg-[#f6f5f1] text-gray-900 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-gray-400 mb-1">
            CloudGreet · text-to-book report
          </div>
          <h1 className="text-xl font-semibold">{businessName}</h1>
          <div className="text-sm text-gray-500 mt-0.5">
            Conversation with {fmtPhone((convo as any).customer_phone)} · started {fmtTime((convo as any).created_at)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-8">No messages in this conversation.</div>
          )}
          {messages.map((m, i) => {
            const inbound = m.direction === 'inbound'
            const toolNames: string[] = Array.isArray(m.tool_calls)
              ? m.tool_calls.map((t: any) => t?.name).filter(Boolean)
              : []
            return (
              <div key={i} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] ${inbound ? 'items-start' : 'items-end'} flex flex-col`}>
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-[15px] whitespace-pre-wrap break-words ${
                      inbound
                        ? 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        : 'bg-sky-500 text-white rounded-br-sm'
                    }`}
                  >
                    {m.body}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 px-1">
                    {inbound ? fmtPhone((convo as any).customer_phone) : 'Agent'} · {fmtTime(m.created_at)}
                    {toolNames.length > 0 && (
                      <span className="ml-1 text-gray-400">· ran {toolNames.join(', ')}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-[11px] text-gray-400 text-center mt-6">
          Read-only report · {messages.length} messages
        </div>
      </div>
    </div>
  )
}
