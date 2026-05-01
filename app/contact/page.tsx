"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Phone, Mail, MapPin, Check } from 'lucide-react'

const DEMO_NUMBER = '+1 (737) 937-0084'
const DEMO_TEL = 'tel:+17379370084'
const SUPPORT_EMAIL = 'hello@cloudgreet.ai'

export default function ContactPage() {
 const [isLoading, setIsLoading] = useState(false)
 const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
 const [errorMsg, setErrorMsg] = useState('')

 const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  setIsLoading(true)
  setErrorMsg('')
  setStatus('idle')
  try {
   const fd = new FormData(e.currentTarget)
   const data = Object.fromEntries(fd.entries()) as Record<string, string>
   const apiData = {
    subject: 'Demo request',
    message: data.message || `Demo request from ${data.firstName} ${data.lastName}. Phone: ${data.phone}. Service: ${data.service}.`,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    businessName: data.businessName,
   }
   const res = await fetch('/api/contact/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiData),
   })
   if (!res.ok) throw new Error('Failed')
   setStatus('success')
   e.currentTarget.reset()
  } catch (err) {
   setStatus('error')
   setErrorMsg('Something went wrong. Try the phone number on the right instead.')
  } finally {
   setIsLoading(false)
  }
 }

 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
   {/* Nav */}
   <nav className="sticky top-0 z-50 bg-[#f6f5f1]/80 backdrop-blur-md border-b border-black/5">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
     <Link href="/" className="flex items-center" aria-label="CloudGreet">
      <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={160} height={48} priority className="h-9 w-auto" />
     </Link>
     <Link
      href="/"
      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
     >
      ← Back home
     </Link>
    </div>
   </nav>

   {/* Header */}
   <section className="px-6 pt-20 md:pt-28 pb-12 md:pb-16 text-center">
    <h1 className="font-display font-medium tracking-tight leading-[1.05] text-[40px] md:text-[64px] mb-6 text-gray-900">
     Book a <span className="text-gray-400">15-minute demo.</span>
    </h1>
    <p className="text-base md:text-lg text-gray-500 max-w-md mx-auto">
     Tell us about your business. We&apos;ll show you exactly how CloudGreet handles your calls.
    </p>
   </section>

   {/* Form + side panel */}
   <section className="px-6 pb-32">
    <div className="max-w-5xl mx-auto grid md:grid-cols-5 gap-6 relative">
     <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />

     {/* Form */}
     <div className="relative md:col-span-3 bg-white border border-gray-200 rounded-[28px] p-6 md:p-10">
      <form onSubmit={onSubmit} className="space-y-5">
       <div className="grid sm:grid-cols-2 gap-4">
        <Field name="firstName" label="First name" required />
        <Field name="lastName" label="Last name" required />
       </div>
       <Field name="email" label="Email" type="email" required />
       <Field name="phone" label="Phone" type="tel" required />
       <Field name="businessName" label="Business name" required />
       <div>
        <label className="text-sm text-gray-700 mb-2 block">Service type</label>
        <select
         name="service"
         required
         className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
        >
         <option value="">Select your service</option>
         <option value="HVAC">HVAC</option>
         <option value="Roofing">Roofing</option>
         <option value="Painting">Painting</option>
         <option value="Plumbing">Plumbing</option>
         <option value="Electrical">Electrical</option>
         <option value="Other">Other</option>
        </select>
       </div>
       <div>
        <label className="text-sm text-gray-700 mb-2 block">Anything we should know? <span className="text-gray-400">(optional)</span></label>
        <textarea
         name="message"
         rows={3}
         className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors resize-none"
         placeholder="How many calls a day, biggest pain point, etc."
        />
       </div>

       {status === 'success' && (
        <div className="bg-sky-50 border border-sky-200 text-sky-900 rounded-xl p-4 text-sm">
         Got it. We&apos;ll reach out within 24 hours to set up your demo.
        </div>
       )}
       {status === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-4 text-sm">
         {errorMsg}
        </div>
       )}

       <button
        type="submit"
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
       >
        {isLoading ? 'Sending…' : (
         <>
          Request Demo
          <ArrowUpRight className="w-4 h-4" />
         </>
        )}
       </button>
      </form>
     </div>

     {/* Side panel */}
     <div className="relative md:col-span-2 space-y-4">
      <div className="bg-white border border-gray-200 rounded-[28px] p-6 md:p-8">
       <p className="text-sm text-gray-500 mb-2">Want to skip the form?</p>
       <p className="font-display text-2xl font-medium text-gray-900 mb-1">Call our AI yourself.</p>
       <p className="text-sm text-gray-500 mb-5">Hear how it sounds — pretend you&apos;re a customer with an HVAC problem.</p>
       <a
        href={DEMO_TEL}
        className="inline-flex items-center gap-2 bg-white text-gray-900 px-5 py-3 rounded-2xl text-sm font-medium border border-gray-200 hover:border-gray-300 transition-all shadow-[0_0_60px_-10px_rgba(56,189,248,0.45)] w-full justify-center"
       >
        <Phone className="w-4 h-4" />
        {DEMO_NUMBER}
       </a>
      </div>

      <div className="bg-white border border-gray-200 rounded-[28px] p-6 md:p-8">
       <p className="font-display text-lg font-medium text-gray-900 mb-4">What you&apos;ll get on the call:</p>
       <ul className="space-y-3 text-sm text-gray-700">
        <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />A demo of the AI handling a sample call for your business</li>
        <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />Setup walkthrough — we wire it up for you, no DIY</li>
        <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />Pricing, plan options, and a clear ROI for your numbers</li>
       </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-[28px] p-6 md:p-8 space-y-3 text-sm">
       <div className="flex items-center gap-2 text-gray-600">
        <Mail className="w-4 h-4" />
        <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-gray-900">{SUPPORT_EMAIL}</a>
       </div>
       <div className="flex items-center gap-2 text-gray-600">
        <MapPin className="w-4 h-4" />
        <span>Built in Austin, TX</span>
       </div>
      </div>
     </div>
    </div>
   </section>
  </main>
 )
}

function Field({
 name, label, type = 'text', required = false,
}: { name: string; label: string; type?: string; required?: boolean }) {
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
    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
   />
  </div>
 )
}
