'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'

const AGREEMENT_TEXT = `
INDEPENDENT CONTRACTOR AGREEMENT (summary)

1. You're a 1099 contractor, not an employee. You set your own hours,
   tools, and approach.
2. Compensation: 50% of every paid invoice from clients you sign,
   for as long as the client stays subscribed. If a client cancels,
   commission stops at the last paid invoice — no clawbacks on past
   payments.
3. Setup fees you negotiate get the same 50/50 split.
4. Payouts every Friday via Stripe Connect direct deposit.
5. CloudGreet owns all client relationships. If you leave or are
   removed, you keep what you've earned through that point but stop
   accruing on those clients going forward.
6. CloudGreet handles product, onboarding, support, prompt tuning,
   and infrastructure. You handle prospecting, calling, demoing,
   and closing.
7. CloudGreet auto-files your 1099-NEC at year-end via Stripe.
8. You agree not to misrepresent the product to prospects, share
   client data outside CloudGreet, or solicit clients on behalf of
   competitors during your engagement.
`.trim()

export default function AcceptInvitePage() {
 const router = useRouter()
 const params = useSearchParams()
 const token = params?.get('token') || ''

 const [firstName, setFirstName] = useState('')
 const [lastName, setLastName] = useState('')
 const [password, setPassword] = useState('')
 const [showPw, setShowPw] = useState(false)
 const [streetAddress, setStreetAddress] = useState('')
 const [city, setCity] = useState('')
 const [state, setState] = useState('')
 const [zipCode, setZipCode] = useState('')
 const [agreementAccepted, setAgreementAccepted] = useState(false)
 const [submitting, setSubmitting] = useState(false)
 const [error, setError] = useState('')

 const canSubmit =
  firstName.trim() && lastName.trim() && password.length >= 8 && agreementAccepted && token

 const submit = async () => {
  setSubmitting(true); setError('')
  try {
   const res = await fetch('/api/sales/accept-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     token,
     password,
     first_name: firstName.trim(),
     last_name: lastName.trim(),
     legal_name: `${firstName.trim()} ${lastName.trim()}`,
     street_address: streetAddress.trim() || null,
     city: city.trim() || null,
     state: state.trim() || null,
     zip_code: zipCode.trim() || null,
     agreement_accepted: true,
    }),
    credentials: 'include',
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || `Failed (${res.status})`)
   // Account created, JWT cookie set. Send them to the Connect onboarding step.
   router.push('/sales/onboarding')
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed')
  } finally {
   setSubmitting(false)
  }
 }

 if (!token) {
  return (
   <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center px-6">
    <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md text-center">
     <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
     <h1 className="text-lg font-medium text-gray-900 mb-2">Invalid invite link</h1>
     <p className="text-sm text-gray-500">
      The link you used didn&apos;t carry a valid token. Ask the admin to send you a new invite.
     </p>
    </div>
   </main>
  )
 }

 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
   <section className="max-w-xl mx-auto px-6 py-16">
    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-2">
     CloudGreet · sales rep onboarding
    </div>
    <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight mb-2">
     Set up your account
    </h1>
    <p className="text-sm text-gray-600 mb-8">
     Three short steps: account, agreement, bank. After this you&apos;ll see your lead
     list, close-submission form, and weekly earnings.
    </p>

    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
     <div className="grid sm:grid-cols-2 gap-3">
      <Field label="First name" value={firstName} onChange={setFirstName} />
      <Field label="Last name" value={lastName} onChange={setLastName} />
     </div>
     <div>
      <label className="text-xs font-medium text-gray-700 mb-1.5 block">Password</label>
      <div className="relative">
       <input
        type={showPw ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-900 pr-10"
       />
       <button
        type="button" onClick={() => setShowPw((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
        aria-label="toggle"
       >
        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
       </button>
      </div>
      {password.length > 0 && password.length < 8 && (
       <p className="text-[11px] text-red-600 mt-1">{8 - password.length} more characters</p>
      )}
     </div>

     <div className="border-t border-gray-100 pt-4">
      <div className="text-xs font-medium text-gray-700 mb-2">
       Mailing address (used on your 1099 at year-end)
      </div>
      <div className="space-y-3">
       <Field label="Street" value={streetAddress} onChange={setStreetAddress} />
       <div className="grid grid-cols-3 gap-3">
        <Field label="City" value={city} onChange={setCity} />
        <Field label="State" value={state} onChange={setState} maxLength={2} upper />
        <Field label="ZIP" value={zipCode} onChange={setZipCode} mono />
       </div>
      </div>
     </div>

     <div className="border-t border-gray-100 pt-4">
      <div className="text-xs font-medium text-gray-700 mb-2">
       Contractor agreement
      </div>
      <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-gray-700 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto font-sans">
       {AGREEMENT_TEXT}
      </pre>
      <label className="flex items-start gap-2 mt-3 cursor-pointer">
       <input
        type="checkbox"
        checked={agreementAccepted}
        onChange={(e) => setAgreementAccepted(e.target.checked)}
        className="mt-0.5 accent-gray-900"
       />
       <span className="text-xs text-gray-700">
        I&apos;ve read and agree to the contractor terms above.
       </span>
      </label>
     </div>

     {error && (
      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 flex items-start gap-2">
       <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
       <span>{error}</span>
      </div>
     )}

     <button
      onClick={submit}
      disabled={!canSubmit || submitting}
      className="w-full bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all duration-300 ease-out disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
     >
      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
      Create account & continue to bank setup
     </button>
    </div>
   </section>
  </main>
 )
}

function Field({
 label, value, onChange, mono, upper, maxLength,
}: {
 label: string
 value: string
 onChange: (v: string) => void
 mono?: boolean
 upper?: boolean
 maxLength?: number
}) {
 return (
  <div>
   <label className="text-xs font-medium text-gray-700 mb-1.5 block">{label}</label>
   <input
    type="text"
    value={value}
    onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
    maxLength={maxLength}
    className={`w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-900 ${mono ? 'font-mono' : ''}`}
   />
  </div>
 )
}
