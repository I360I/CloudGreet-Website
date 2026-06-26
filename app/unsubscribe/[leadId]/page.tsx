import { supabaseAdmin } from '@/lib/supabase'

type Props = { params: { leadId: string } }

export default async function UnsubscribePage({ params }: Props) {
  const { leadId } = params

  let success = false

  if (leadId && /^[0-9a-f-]{36}$/.test(leadId)) {
    const { error } = await supabaseAdmin
      .from('email_leads')
      .update({ status: 'unsubscribed', next_follow_up_at: null })
      .eq('id', leadId)
      .neq('status', 'unsubscribed')

    success = !error
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 max-w-sm w-full text-center">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Unsubscribed</h1>
        <p className="text-sm text-gray-500">
          {success
            ? "You've been removed from this email list. You won't receive any more emails from this campaign."
            : "You're already unsubscribed or this link has expired."}
        </p>
        <p className="text-xs text-gray-400 mt-4">CloudGreet</p>
      </div>
    </div>
  )
}
