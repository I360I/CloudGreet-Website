'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
 ArrowLeft, AlertCircle, CheckCircle2, Building2, User, Phone, Bot,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import {
 Panel, PanelHeader, PrimaryButton, GhostButton,
} from '../../_components/ui'

const EASE = [0.22, 1, 0.36, 1] as const

const BUSINESS_TYPES = ['HVAC', 'Roofing', 'Painting', 'Plumbing', 'Electrical', 'Other'] as const

export default function NewClientPage() {
 const router = useRouter()
 const [submitting, setSubmitting] = useState(false)
 const [error, setError] = useState('')
 const [done, setDone] = useState<{ id: string; name: string } | null>(null)

 const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const form = e.currentTarget
  setSubmitting(true); setError('')
  const fd = new FormData(form)
  const body = Object.fromEntries(fd.entries())

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
   setDone({
    id: data.id || data.client?.id || data.business_id || '',
    name: String(body.business_name || 'Client'),
   })
  } catch (err) {
   setError(`Request failed: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
   setSubmitting(false)
  }
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
      <Panel className="text-center">
       <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="flex flex-col items-center"
       >
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center mb-4">
         <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-medium text-white">Client created.</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">
         <span className="font-medium text-gray-300">{done.name}</span> is in. Send them their login and walk them through forwarding setup.
        </p>
        <div className="flex items-center gap-2 mt-6">
         <GhostButton onClick={() => router.push('/admin')}>Back to overview</GhostButton>
         {done.id && (
          <PrimaryButton onClick={() => router.push(`/admin/clients/${done.id}`)}>
           Open client →
          </PrimaryButton>
         )}
        </div>
       </motion.div>
      </Panel>
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
       icon={Building2}
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
       icon={Bot}
       title="AI agent (Retell)"
       eyebrow="04"
       description="Optional now, required before they go live. Wire the Retell number you provisioned for this client."
      >
       <Field name="retell_phone_number" label="Retell phone number" placeholder="+15125551234" />
       <Field name="retell_agent_id" label="Retell agent ID" placeholder="agent_xxxx…" />
      </Section>

      {error && (
       <Panel className="!p-3 border-rose-500/20 bg-rose-500/5">
        <div className="flex items-start gap-2 text-sm text-rose-200">
         <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
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
     <Icon className="w-4 h-4 text-sky-400" strokeWidth={1.75} />
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
