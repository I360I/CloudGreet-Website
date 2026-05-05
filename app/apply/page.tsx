'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

type FormState = {
  first_name: string
  last_name: string
  email: string
  phone: string
  city: string
  state: string
  linkedin_url: string

  years_sales_experience: string
  previous_role: string
  industries_sold: string
  biggest_deal: string
  prior_commission_only: boolean
  prior_b2b: boolean

  why_commission_only: string
  why_cloudgreet: string

  monthly_goal_deals: string
  why_can_hit_goal: string

  earliest_start_date: string
  hours_per_week: string
  has_workspace: boolean

  resume_url: string
  video_url: string
}

const INITIAL: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  linkedin_url: '',
  years_sales_experience: '',
  previous_role: '',
  industries_sold: '',
  biggest_deal: '',
  prior_commission_only: false,
  prior_b2b: false,
  why_commission_only: '',
  why_cloudgreet: '',
  monthly_goal_deals: '',
  why_can_hit_goal: '',
  earliest_start_date: '',
  hours_per_week: '',
  has_workspace: false,
  resume_url: '',
  video_url: '',
}

export default function ApplyPage() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j?.error || `Failed (${res.status})`)
        setSubmitting(false)
      } else {
        setDone(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#f6f5f1] text-gray-900 flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="bg-white border border-gray-200 max-w-xl w-full p-10"
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-2">
            CloudGreet
          </div>
          <h1 className="font-display text-3xl font-medium tracking-tight mb-3">
            Application received.
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">
            Thanks, {form.first_name || 'and'}. I read every application personally and
            respond within a few business days. If we move forward, you&apos;ll get an
            email with a Calendly link to book the interview.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            — Anthony Edwards, Founder
          </p>
          <Link
            href="/"
            className="inline-block mt-6 text-xs font-mono uppercase tracking-wider text-gray-500 hover:text-gray-900"
          >
            ← cloudgreet.com
          </Link>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
      <header className="border-b border-black/5 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">CloudGreet</div>
          </Link>
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-900">← Back</Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mb-10"
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-3">
            Sales rep · commission-only · remote
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-4">
            Apply to sell <span className="text-gray-400">CloudGreet.</span>
          </h1>
          <p className="text-base text-gray-600 leading-relaxed max-w-xl">
            We&apos;re hiring contractors to sell CloudGreet — an AI receptionist for service
            businesses. 50% of every paid invoice is yours, every week, paid via Stripe.
            No quotas, no clawbacks, no caps. Apply below.
          </p>
        </motion.div>

        <form onSubmit={submit} className="space-y-10">

          {/* About you */}
          <Section title="About you" eyebrow="01">
            <Row>
              <Field label="First name" required>
                <input
                  required
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Last name" required>
                <input
                  required
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Email" required>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Phone" required>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Row>
            <Row>
              <Field label="City">
                <input
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="State">
                <input
                  value={form.state}
                  onChange={(e) => set('state', e.target.value)}
                  className={inputCls}
                  placeholder="TX"
                  maxLength={2}
                />
              </Field>
            </Row>
            <Field label="LinkedIn URL (optional)">
              <input
                value={form.linkedin_url}
                onChange={(e) => set('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className={inputCls}
              />
            </Field>
          </Section>

          {/* Experience */}
          <Section title="Sales experience" eyebrow="02">
            <Row>
              <Field label="Years of sales experience">
                <input
                  type="number" min={0} max={60}
                  value={form.years_sales_experience}
                  onChange={(e) => set('years_sales_experience', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Most recent sales role">
                <input
                  value={form.previous_role}
                  onChange={(e) => set('previous_role', e.target.value)}
                  placeholder="e.g. Account Executive at SoftwareCo"
                  className={inputCls}
                />
              </Field>
            </Row>
            <Field label="Industries you've sold into">
              <input
                value={form.industries_sold}
                onChange={(e) => set('industries_sold', e.target.value)}
                placeholder="e.g. Home services, B2B SaaS, financial services"
                className={inputCls}
              />
            </Field>
            <Field label="Biggest deal you've closed (single deal value)">
              <input
                value={form.biggest_deal}
                onChange={(e) => set('biggest_deal', e.target.value)}
                placeholder="e.g. $25,000 or 25k"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Checkbox
                checked={form.prior_commission_only}
                onChange={(v) => set('prior_commission_only', v)}
                label="I've worked commission-only before"
              />
              <Checkbox
                checked={form.prior_b2b}
                onChange={(v) => set('prior_b2b', v)}
                label="I've sold to small business owners directly"
              />
            </div>
          </Section>

          {/* Why */}
          <Section title="Why this role" eyebrow="03">
            <Field
              label="Why does commission-only sales appeal to you?"
              required
              hint="Be honest — most people fail at commission-only. We want people who understand why."
            >
              <textarea
                required
                rows={4}
                value={form.why_commission_only}
                onChange={(e) => set('why_commission_only', e.target.value)}
                className={`${inputCls} resize-none`}
                maxLength={2000}
              />
            </Field>
            <Field
              label="Why CloudGreet specifically?"
              required
              hint="What about the product or the deal structure makes you want to sell it?"
            >
              <textarea
                required
                rows={4}
                value={form.why_cloudgreet}
                onChange={(e) => set('why_cloudgreet', e.target.value)}
                className={`${inputCls} resize-none`}
                maxLength={2000}
              />
            </Field>
          </Section>

          {/* Goals */}
          <Section title="Goals + setup" eyebrow="04">
            <Row>
              <Field label="Deals/month you aim to close">
                <input
                  type="number" min={0} max={1000}
                  value={form.monthly_goal_deals}
                  onChange={(e) => set('monthly_goal_deals', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Hours/week available">
                <input
                  type="number" min={0} max={80}
                  value={form.hours_per_week}
                  onChange={(e) => set('hours_per_week', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Row>
            <Field label="Why do you think you can hit that goal?">
              <textarea
                rows={3}
                value={form.why_can_hit_goal}
                onChange={(e) => set('why_can_hit_goal', e.target.value)}
                className={`${inputCls} resize-none`}
                maxLength={2000}
              />
            </Field>
            <Row>
              <Field label="Earliest start date">
                <input
                  type="date"
                  value={form.earliest_start_date}
                  onChange={(e) => set('earliest_start_date', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <div />
            </Row>
            <Checkbox
              checked={form.has_workspace}
              onChange={(v) => set('has_workspace', v)}
              label="I have a quiet workspace, reliable phone, and a laptop"
            />
          </Section>

          {/* Submissions */}
          <Section
            title="Resume + 90-second intro"
            eyebrow="05"
            hint="Include at least one. Both is better. The intro video is more important than a polished resume — we want to hear how you talk."
          >
            <Field
              label="Resume link"
              hint="Google Drive, Dropbox, LinkedIn PDF export, or any public URL. Make sure it's set to anyone-with-the-link can view."
            >
              <input
                type="url"
                value={form.resume_url}
                onChange={(e) => set('resume_url', e.target.value)}
                placeholder="https://drive.google.com/..."
                className={inputCls}
              />
            </Field>
            <Field
              label="90-second intro video link"
              hint="Loom is easiest (free, takes 30 seconds to record). YouTube unlisted, Google Drive, or Vimeo also work."
            >
              <input
                type="url"
                value={form.video_url}
                onChange={(e) => set('video_url', e.target.value)}
                placeholder="https://www.loom.com/..."
                className={inputCls}
              />
            </Field>
            <p className="text-xs text-gray-500 leading-relaxed">
              In the video, tell me: who you are, the toughest deal you ever closed and how, and
              why you&apos;d crush this. One take, no script.
            </p>
          </Section>

          {error && (
            <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-gray-500 max-w-md">
              Submitting this application means you agree to be contacted at the email
              and phone above. CloudGreet doesn&apos;t share applicant data.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-medium px-6 py-3 hover:bg-gray-800 active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {submitting ? 'Submitting…' : 'Submit application →'}
            </button>
          </div>
        </form>
      </section>

      <footer className="max-w-3xl mx-auto px-6 py-12 border-t border-black/5 mt-16">
        <p className="text-xs text-gray-400">
          Questions? Email <a className="underline hover:text-gray-700" href="mailto:anthony@cloudgreet.com">anthony@cloudgreet.com</a>.
        </p>
      </footer>
    </main>
  )
}

const inputCls =
  'w-full bg-white border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors'

function Section({
  title, eyebrow, hint, children,
}: {
  title: string
  eyebrow: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.35, ease: EASE }}
      className="bg-white border border-gray-200 p-6 md:p-8"
    >
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">{eyebrow}</span>
      </div>
      {hint && <p className="text-xs text-gray-500 mb-5 -mt-2">{hint}</p>}
      <div className="space-y-4">{children}</div>
    </motion.section>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
}

function Field({
  label, required, hint, children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="text-[11px] font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-gray-400"> · required</span>}
      </div>
      {children}
      {hint && <div className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{hint}</div>}
    </label>
  )
}

function Checkbox({
  checked, onChange, label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>{label}</span>
    </label>
  )
}
