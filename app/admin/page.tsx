'use client'

import React, { useEffect, useState } from 'react'
import { Plus, ArrowUpRight, Loader2 } from "lucide-react"
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type Client = {
 id: string
 business_name: string
 email: string
 phone_number?: string | null
 business_type?: string | null
 subscription_status?: string | null
 account_status?: string | null
 created_at?: string
}

export default function AdminHome() {
 const [clients, setClients] = useState<Client[]>([])
 const [loading, setLoading] = useState(true)
 const [showForm, setShowForm] = useState(false)

 const loadClients = async () => {
  setLoading(true)
  try {
   const res = await fetchWithAuth('/api/admin/clients')
   const data = await res.json()
   setClients(data.clients || data.data || [])
  } catch {
   setClients([])
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { loadClients() }, [])

 return (
  <main className="px-6 pt-12 md:pt-16 pb-32">
   <div className="max-w-6xl mx-auto">
    <div className="flex items-end justify-between mb-10">
     <div>
      <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-gray-900">
       Clients <span className="text-gray-400">/ {clients.length}</span>
      </h1>
      <p className="text-sm text-gray-500 mt-2">Onboard a contractor or manage existing accounts.</p>
     </div>
     <button
      onClick={() => setShowForm(!showForm)}
      className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors"
     >
      <Plus className="w-4 h-4" />
      {showForm ? 'Close' : 'New client'}
     </button>
    </div>

    {showForm && (
     <NewClientForm
      onCreated={() => { setShowForm(false); loadClients() }}
     />
    )}

    <div className="bg-white border border-gray-200 rounded-[28px] overflow-hidden">
     {loading ? (
      <div className="p-12 flex items-center justify-center text-gray-400">
       <Loader2 className="w-5 h-5 animate-spin" />
      </div>
     ) : clients.length === 0 ? (
      <div className="p-12 text-center text-gray-500 text-sm">
       No clients yet. Click <strong>New client</strong> to onboard your first one.
      </div>
     ) : (
      <table className="w-full text-sm">
       <thead className="bg-gray-50 border-b border-gray-200">
        <tr className="text-left text-gray-500">
         <th className="px-5 py-3 font-medium">Business</th>
         <th className="px-5 py-3 font-medium">Email</th>
         <th className="px-5 py-3 font-medium">Type</th>
         <th className="px-5 py-3 font-medium">Status</th>
         <th className="px-5 py-3"></th>
        </tr>
       </thead>
       <tbody>
        {clients.map((c) => (
         <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
          <td className="px-5 py-4 font-medium text-gray-900">{c.business_name}</td>
          <td className="px-5 py-4 text-gray-600">{c.email}</td>
          <td className="px-5 py-4 text-gray-600">{c.business_type || '—'}</td>
          <td className="px-5 py-4">
           <span className={`text-xs px-2 py-1 rounded-full ${c.subscription_status === 'active' ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-600'}`}>
            {c.subscription_status || c.account_status || 'pending'}
           </span>
          </td>
          <td className="px-5 py-4 text-right">
           <a href={`/admin/clients/${c.id}`} className="text-gray-400 hover:text-gray-900">
            <ArrowUpRight className="w-4 h-4 inline" />
           </a>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     )}
    </div>
   </div>
  </main>
 )
}

function NewClientForm({ onCreated }: { onCreated: () => void }) {
 const [submitting, setSubmitting] = useState(false)
 const [error, setError] = useState('')

 const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const form = e.currentTarget // capture before any await — React reuses synthetic events
  setSubmitting(true)
  setError('')
  const fd = new FormData(form)
  const body = Object.fromEntries(fd.entries())
  try {
   const res = await fetchWithAuth('/api/admin/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
   })
   const data = await res.json()
   if (!res.ok) {
    setError(data.error || data.detail || 'Failed to create client')
    return
   }
   form.reset()
   onCreated()
  } catch (err) {
   setError(`Request failed: ${err instanceof Error ? err.message : String(err)}`)
   console.error('Create client error:', err)
  } finally {
   setSubmitting(false)
  }
 }

 return (
  <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-[28px] p-6 md:p-8 mb-6 grid sm:grid-cols-2 gap-4">
   <Field name="business_name" label="Business name" required />
   <div>
    <label htmlFor="business_type" className="text-sm text-gray-700 mb-2 block">
     Business type<span className="text-gray-400"> *</span>
    </label>
    <select
     id="business_type" name="business_type" required
     className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
    >
     <option value="">Select type…</option>
     <option value="HVAC">HVAC</option>
     <option value="Roofing">Roofing</option>
     <option value="Painting">Painting</option>
     <option value="Plumbing">Plumbing</option>
     <option value="Electrical">Electrical</option>
     <option value="Other">Other</option>
    </select>
   </div>
   <Field name="first_name" label="Owner first name" placeholder="Mike" />
   <Field name="last_name" label="Owner last name" placeholder="Rodriguez" />
   <Field name="email" label="Owner email" type="email" required />
   <Field name="password" label="Temporary password" type="text" required />
   <Field name="phone_number" label="Business phone" placeholder="+1 (512) 555-1234" />
   <div />
   <Field name="retell_phone_number" label="Retell phone number" placeholder="+15125551234" />
   <Field name="retell_agent_id" label="Retell agent ID" placeholder="agent_xxxx…" />

   {error && (
    <div className="sm:col-span-2 bg-red-50 border border-red-200 text-red-900 rounded-xl p-3 text-sm">
     {error}
    </div>
   )}

   <div className="sm:col-span-2 flex justify-end">
    <button
     type="submit"
     disabled={submitting}
     className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
    >
     {submitting ? 'Creating…' : 'Create client'}
    </button>
   </div>
  </form>
 )
}

function Field({
 name, label, type = 'text', required = false, placeholder,
}: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
 return (
  <div>
   <label htmlFor={name} className="text-sm text-gray-700 mb-2 block">
    {label}{required && <span className="text-gray-400"> *</span>}
   </label>
   <input
    id={name}
    name={name}
    type={type}
    required={required}
    placeholder={placeholder}
    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
   />
  </div>
 )
}
