'use client'

import { useEffect, useState } from 'react'
import { CircleNotch, CheckCircle, WarningCircle, Voicemail, LockKey, UserCircle } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { SetterShell, SetterLoadingState } from '../_components/SetterShell'
import { DEFAULT_VM_SCRIPT } from '@/lib/telnyx/vm-script'

const NAVY = '#1E3A8A'

/**
 * Setter settings: account details, password, and the voicemail-drop
 * script the dialer speaks when they hit "Drop VM" (custom_users.
 * vm_drop_script; blank = the CloudGreet default).
 */
export default function SetterSettingsPage() {
  return (
    <SetterShell activeLabel="Settings">
      <SettingsBody />
    </SetterShell>
  )
}

function SettingsBody() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [vmScript, setVmScript] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetchWithAuth('/api/me/profile')
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j?.profile) { setErr(j?.error || 'Failed to load profile'); return }
        setEmail(j.profile.email || '')
        setFirstName(j.profile.first_name || '')
        setLastName(j.profile.last_name || '')
        setPhone(j.profile.phone || '')
        setVmScript(j.profile.vm_drop_script || '')
      } catch {
        setErr('Failed to load profile')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <SetterLoadingState />

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: NAVY }}>Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Your account, password, and dialer voicemail.</p>
      </div>

      {err && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
          <WarningCircle className="w-4 h-4 mt-0.5 shrink-0" /> {err}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
      <Card icon={<UserCircle weight="duotone" className="w-5 h-5 text-blue-600" />} title="Account">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="First name" value={firstName} onChange={setFirstName} />
          <Field label="Last name" value={lastName} onChange={setLastName} />
        </div>
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="+1 555 555 5555" />
        <div>
          <FieldLabel>Email</FieldLabel>
          <input
            value={email} readOnly
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#E3EAF4] rounded-lg text-sm text-slate-500 cursor-not-allowed"
          />
          <div className="text-[11px] text-slate-400 mt-1">Email changes go through the team - ask admin.</div>
        </div>
        <SaveButton
          onSave={async () => {
            const r = await fetchWithAuth('/api/me/profile', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null }),
            })
            const j = await r.json().catch(() => ({}))
            if (!r.ok || !j?.success) throw new Error(j?.error || 'Save failed')
          }}
        />
      </Card>

      <Card icon={<Voicemail weight="duotone" className="w-5 h-5 text-blue-600" />} title="Voicemail drop">
        <p className="text-xs text-slate-500 -mt-1">
          When you hit <strong>Drop VM</strong> on a call, this script is spoken to the
          machine in a natural voice and the call hangs up for you. Leave it blank to use
          the CloudGreet default (shown greyed below).
        </p>
        <textarea
          value={vmScript}
          onChange={(e) => setVmScript(e.target.value)}
          rows={5}
          placeholder={DEFAULT_VM_SCRIPT}
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-y"
        />
        <SaveButton
          onSave={async () => {
            const r = await fetchWithAuth('/api/me/profile', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vm_drop_script: vmScript.trim() || null }),
            })
            const j = await r.json().catch(() => ({}))
            if (!r.ok || !j?.success) throw new Error(j?.error || 'Save failed')
          }}
        />
      </Card>

      <PasswordCard />
      </div>
    </div>
  )
}

function PasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  return (
    <Card icon={<LockKey weight="duotone" className="w-5 h-5 text-blue-600" />} title="Password">
      <Field label="Current password" value={current} onChange={setCurrent} type="password" />
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="New password" value={next} onChange={setNext} type="password" />
        <Field label="Confirm new password" value={confirm} onChange={setConfirm} type="password" />
      </div>
      <SaveButton
        label="Change password"
        onSave={async () => {
          if (next.length < 8) throw new Error('New password must be at least 8 characters')
          if (next !== confirm) throw new Error("New passwords don't match")
          const r = await fetchWithAuth('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: current, newPassword: next }),
          })
          const j = await r.json().catch(() => ({}))
          if (!r.ok || j?.error) throw new Error(j?.error || 'Change failed')
          setCurrent(''); setNext(''); setConfirm('')
        }}
      />
    </Card>
  )
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E3EAF4] shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-6 space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold" style={{ color: NAVY }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-slate-700 mb-1.5">{children}</label>
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm focus:outline-none focus:border-blue-500"
      />
    </div>
  )
}

function SaveButton({ onSave, label = 'Save' }: { onSave: () => Promise<void>; label?: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle')
  const [err, setErr] = useState('')

  const click = async () => {
    setState('busy'); setErr('')
    try {
      await onSave()
      setState('saved')
      setTimeout(() => setState('idle'), 2000)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
      setState('error')
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={click}
        disabled={state === 'busy'}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors duration-150"
      >
        {state === 'busy' ? <CircleNotch className="w-4 h-4 animate-spin" />
          : state === 'saved' ? <CheckCircle weight="fill" className="w-4 h-4" /> : null}
        {state === 'saved' ? 'Saved' : label}
      </button>
      {state === 'error' && <span className="text-xs text-rose-600">{err}</span>}
    </div>
  )
}
