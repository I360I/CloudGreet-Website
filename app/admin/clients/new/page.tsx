'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, WarningCircle, CheckCircle, Buildings, User, Phone, Robot, CreditCard, Copy, Check } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import {
 Panel, PanelHeader, PrimaryButton, GhostButton,
} from '../../_components/ui'

const EASE = [0.22, 1, 0.36, 1] as const

const BUSINESS_TYPES = ['HVAC', 'Roofing', 'Painting', 'Plumbing', 'Electrical', 'Other'] as const

type DoneState = {
 id: string
 name: string
 email: string
 temp_password: string
 checkout_url?: string | null
 checkout_error?: string | null
}

export default function NewClientPage() {
 const router = useRouter()
 const [submitting, setSubmitting] = useState(false)
 const [error, setError] = useState('')
 const [done, setDone] = useState<DoneState | null>(null)
 const [copied, setCopied] = useState<string | null>(null)

 const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const form = e.currentTarget
  setSubmitting(true); setError('')
  const fd = new FormData(form)
  const body = Object.fromEntries(fd.entries())

  // Carve pricing out of the form data - those go to the checkout-link
  // call, not the create-client call (which doesn't accept them).
  const monthlyDollarsRaw = String(body.monthly_dollars || '').trim()
  const setupDollarsRaw = String(body.setup_dollars || '').trim()
  delete (body as any).monthly_dollars
  delete (body as any).setup_dollars

  try {
   const res = await fetchWithAuth('/api/admin/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
   })
   const data = await res.json().catch(() => ({}))
   if (!res.ok) {
    setError(data.error || data.detail || 'Failed to create client')
    return
   }
   const businessId = data.id || data.client?.id || data.business_id || data.business?.id || ''

   // If admin entered a monthly price, immediately fire the checkout-link
   // route so the success screen can hand them a URL to send. No rep_id
   // is involved here so commission/ledger stays at zero and 100% of
   // the revenue lands in the platform account.
   let checkoutUrl: string | null = null
   let checkoutError: string | null = null
   const monthlyDollars = parseFloat(monthlyDollarsRaw)
   if (businessId && monthlyDollarsRaw && Number.isFinite(monthlyDollars) && monthlyDollars >= 50) {
    const setupDollars = parseFloat(setupDollarsRaw || '0')
    try {
     const linkRes = await fetchWithAuth(`/api/admin/clients/${businessId}/checkout-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
       monthly_cents: Math.round(monthlyDollars * 100),
       setup_fee_cents: Number.isFinite(setupDollars) && setupDollars > 0
        ? Math.round(setupDollars * 100)
        : 0,
      }),
     })
     const linkJson = await linkRes.json().catch(() => ({}))
     if (linkRes.ok && linkJson?.url) {
      checkoutUrl = linkJson.url
     } else {
      checkoutError = linkJson?.error || `Checkout link failed (${linkRes.status})`
     }
    } catch (e) {
     checkoutError = e instanceof Error ? e.message : 'Checkout link request failed'
    }
   } else if (monthlyDollarsRaw && (!Number.isFinite(monthlyDollars) || monthlyDollars < 50)) {
    checkoutError = 'Monthly must be at least $50 - leaving checkout link blank.'
   }

   setDone({
    id: businessId,
    name: String(body.business_name || 'Client'),
    email: String(body.email || ''),
    temp_password: String(body.password || ''),
    checkout_url: checkoutUrl,
    checkout_error: checkoutError,
   })
  } catch (err) {
   setError(`Request failed: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
   setSubmitting(false)
  }
 }

 const copyValue = async (key: string, value: string) => {
  try {
   await navigator.clipboard?.writeText(value)
   setCopied(key)
   setTimeout(() => setCopied((c) => c === key ? null : c), 1500)
  } catch { /* clipboard failure non-fatal */ }
 }

 if (done) {
  return (
   <AdminShell activeLabel="Overview">
    <section className="px-4 lg:px-8 py-6 lg:py-10">
     <div className="max-w-2xl">
      <Link
       href="/admin"
       className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.2em] text-gray-500 hover:text-gray-300 transition-colors mb-4"
      >
       <ArrowLeft className="w-3.5 h-3.5" /> Overview
      </Link>

      <motion.div
       initial={{ opacity: 0, y: 8 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.4, ease: EASE }}
       className="space-y-3"
      >
       <Panel>
        <div className="flex items-start gap-3">
         <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
         </div>
         <div className="flex-1 min-w-0">
          <h2 className="text-xl font-medium text-white">{done.name}</h2>
          <p className="text-xs text-gray-500 mt-1">Client created. No rep attached - 100% of revenue stays on the platform account.</p>
         </div>
        </div>
       </Panel>

       <Panel>
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-3">Owner login</div>
        <CopyRow keyId="email" label="Email" value={done.email} copied={copied === 'email'} onCopy={copyValue} />
        <CopyRow keyId="password" label="Temp password" value={done.temp_password} copied={copied === 'password'} onCopy={copyValue} />
        <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
         Hand these over in person or via Signal. The owner can change the password after they log in.
        </p>
       </Panel>

       {done.checkout_url ? (
        <Panel className="border-emerald-400/20 bg-emerald-500/[0.04]">
         <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-300/80">Checkout link</div>
         </div>
         <CopyRow keyId="checkout" label="URL" value={done.checkout_url} copied={copied === 'checkout'} onCopy={copyValue} mono />
         <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
          Send this to the client. Subscription activates automatically on payment via the Stripe webhook.
         </p>
        </Panel>
       ) : done.checkout_error ? (
        <Panel className="border-amber-400/20 bg-amber-500/[0.04]">
         <div className="flex items-start gap-2 text-sm text-amber-200">
          <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
           <div className="font-medium">Couldn&apos;t generate checkout link</div>
           <div className="text-xs text-amber-300/80 mt-0.5">{done.checkout_error}</div>
           <div className="text-xs text-amber-300/60 mt-1">You can generate one manually from the client page.</div>
          </div>
         </div>
        </Panel>
       ) : null}

       <div className="flex items-center justify-end gap-2 pt-2">
        <GhostButton onClick={() => router.push('/admin')}>Back to overview</GhostButton>
        {done.id && (
         <PrimaryButton onClick={() => router.push(`/admin/clients/${done.id}`)}>
          Open client →
         </PrimaryButton>
        )}
       </div>
      </motion.div>
     </div>
    </section>
   </AdminShell>
  )
 }

 return (
  <AdminShell activeLabel="Overview">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-3xl">
     <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.2em] text-gray-500 hover:text-gray-300 transition-colors mb-4"
     >
      <ArrowLeft className="w-3.5 h-3.5" /> Overview
     </Link>

     <div className="mb-8">
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
       New client
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
       Onboard a contractor
      </h1>
      <p className="text-sm text-gray-500 mt-2">
       Creates the business + owner login. Provision the Retell number and walk them through the rest in person.
      </p>
     </div>

     <form onSubmit={onSubmit} className="space-y-3">
      <Section
       icon={Buildings}
       title="Business"
       eyebrow="01"
       description="What shows on the dashboard, and how the AI introduces itself."
      >
       <Field name="business_name" label="Business name" required placeholder="Mike's HVAC" />
       <Field
        name="business_type" label="Type" required type="select"
        options={[...BUSINESS_TYPES]}
       />
      </Section>

      <Section
       icon={User}
       title="Owner login"
       eyebrow="02"
       description="They log in with this email + temporary password. Hand them the password securely (Signal, in-person)."
      >
       <Field name="first_name" label="First name" placeholder="Mike" />
       <Field name="last_name" label="Last name" placeholder="Rodriguez" />
       <Field name="email" label="Email" type="email" required />
       <Field name="password" label="Temporary password" type="text" required placeholder="At least 8 chars" />
      </Section>

      <Section
       icon={Phone}
       title="Business phone"
       eyebrow="03"
       description="Their existing line. Used as a contact reference and for the forwarding step they'll do later."
      >
       <Field name="phone_number" label="Phone" placeholder="+1 (512) 555-1234" full />
      </Section>

      <Section
       icon={Robot}
       title="AI agent (Retell)"
       eyebrow="04"
       description="Optional now, required before they go live. Wire the Retell number you provisioned for this client."
      >
       <Field name="retell_phone_number" label="Retell phone number" placeholder="+15125551234" />
       <Field name="retell_agent_id" label="Retell agent ID" placeholder="agent_xxxx…" />
      </Section>

      <Section
       icon={CreditCard}
       title="Checkout link (optional)"
       eyebrow="05"
       description="If you know the deal price, we'll generate a Stripe Checkout URL on submit. No rep attached, so 100% of the revenue stays on the platform account. Leave blank to skip and generate later from the client page."
      >
       <Field name="monthly_dollars" label="Monthly ($)" type="number" placeholder="499" />
       <Field name="setup_dollars" label="Setup fee ($)" type="number" placeholder="0" />
      </Section>

      {error && (
       <Panel className="!p-3 border-rose-500/20 bg-rose-500/5">
        <div className="flex items-start gap-2 text-sm text-rose-200">
         <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
         <span>{error}</span>
        </div>
       </Panel>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
       <GhostButton onClick={() => router.push('/admin')}>Cancel</GhostButton>
       <PrimaryButton type="submit" loading={submitting}>
        {submitting ? 'Creating…' : 'Create client'}
       </PrimaryButton>
      </div>
     </form>
    </div>
   </section>
  </AdminShell>
 )
}

/* ---------------------------- Section + Field ---------------------------- */

function Section({
 icon: Icon, eyebrow, title, description, children,
}: {
 icon: React.ElementType
 eyebrow: string
 title: string
 description: string
 children: React.ReactNode
}) {
 return (
  <Panel>
   <div className="flex items-start gap-4 mb-4">
    <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
     <Icon className="w-4 h-4 text-sky-400" />
    </div>
    <div className="flex-1 min-w-0">
     <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">{eyebrow}</div>
     <h2 className="text-base font-medium text-white">{title}</h2>
     <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
    </div>
   </div>
   <div className="grid sm:grid-cols-2 gap-3">{children}</div>
  </Panel>
 )
}

function CopyRow({
 keyId, label, value, copied, onCopy, mono,
}: {
 keyId: string
 label: string
 value: string
 copied: boolean
 onCopy: (key: string, value: string) => void
 mono?: boolean
}) {
 return (
  <div className="flex items-center gap-3 mb-2 last:mb-0">
   <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 w-24 flex-shrink-0">{label}</div>
   <div className={`flex-1 min-w-0 text-sm text-gray-100 truncate ${mono ? 'font-mono text-xs' : ''}`}>
    {value || <span className="text-gray-600 italic">—</span>}
   </div>
   {value && (
    <button
     onClick={() => onCopy(keyId, value)}
     className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 inline-flex items-center gap-1 flex-shrink-0"
    >
     {copied ? <><Check className="w-3 h-3 text-emerald-400" /> copied</> : <><Copy className="w-3 h-3" /> copy</>}
    </button>
   )}
  </div>
 )
}

function Field({
 name, label, type = 'text', required = false, placeholder, options, full = false,
}: {
 name: string
 label: string
 type?: string
 required?: boolean
 placeholder?: string
 options?: string[]
 full?: boolean
}) {
 const id = `f-${name}`
 const colSpan = full ? 'sm:col-span-2' : ''
 return (
  <div className={colSpan}>
   <label htmlFor={id} className="text-xs font-medium text-gray-400 mb-1.5 block">
    {label}{required && <span className="text-gray-600"> *</span>}
   </label>
   {type === 'select' && options ? (
    <select
     id={id} name={name} required={required} defaultValue=""
     className="w-full px-4 py-2.5 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 focus:outline-none focus:border-sky-400/50 transition-colors text-sm"
    >
     <option value="" disabled>Select…</option>
     {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
   ) : (
    <input
     id={id} name={name} type={type} required={required} placeholder={placeholder}
     autoComplete="off"
     className="w-full px-4 py-2.5 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-400/50 transition-colors text-sm"
    />
   )}
  </div>
 )
}
