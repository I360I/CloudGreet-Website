'use client'

import { useEffect, useRef, useState } from 'react'
import { CircleNotch, CheckCircle, WarningCircle, Voicemail, LockKey, UserCircle, Microphone, Stop, TrashSimple, Play } from '@phosphor-icons/react'
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
  const [vmScript, setVmScript] = useState('')
  const [vmAudio, setVmAudio] = useState<{ url: string; seconds: number } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetchWithAuth('/api/me/profile')
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j?.profile) { setErr(j?.error || 'Failed to load profile'); return }
        setEmail(j.profile.email || '')
        setFirstName(j.profile.first_name || '')
        setLastName(j.profile.last_name || '')
        setVmScript(j.profile.vm_drop_script || '')
        if (j.profile.vm_drop_audio_url) {
          setVmAudio({ url: j.profile.vm_drop_audio_url, seconds: j.profile.vm_drop_audio_seconds || 0 })
        }
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
              body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim() }),
            })
            const j = await r.json().catch(() => ({}))
            if (!r.ok || !j?.success) throw new Error(j?.error || 'Save failed')
          }}
        />
      </Card>

      <Card icon={<Voicemail weight="duotone" className="w-5 h-5 text-blue-600" />} title="Voicemail drop">
        <p className="text-xs text-slate-500 -mt-1">
          When you hit <strong>Drop VM</strong> on a call, this recording plays into the
          machine in your own voice and the call hangs up for you. Keep it under ~30
          seconds: who you are, why you called, your callback number.
        </p>
        <VmRecorder vmAudio={vmAudio} onChanged={setVmAudio} />
        <details className="pt-1">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
            No recording? A typed script is spoken in an AI voice as the fallback.
          </summary>
          <div className="mt-3 space-y-3">
            <textarea
              value={vmScript}
              onChange={(e) => setVmScript(e.target.value)}
              rows={4}
              placeholder={DEFAULT_VM_SCRIPT}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-y"
            />
            <SaveButton
              label="Save script"
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
          </div>
        </details>
      </Card>

      <PasswordCard />
      </div>
    </div>
  )
}

const MAX_RECORD_SECONDS = 45

/**
 * Records the rep's voicemail-drop greeting in the browser and uploads
 * it as 16kHz mono WAV (Telnyx playback needs WAV/MP3 - browsers record
 * webm/mp4, so we re-encode via OfflineAudioContext before upload).
 */
function VmRecorder({ vmAudio, onChanged }: {
  vmAudio: { url: string; seconds: number } | null
  onChanged: (v: { url: string; seconds: number } | null) => void
}) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'processing' | 'preview' | 'uploading'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [err, setErr] = useState('')
  const [preview, setPreview] = useState<{ blob: Blob; url: string; seconds: number } | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    try { recorderRef.current?.stream.getTracks().forEach((t) => t.stop()) } catch {}
  }, [])

  const start = async () => {
    setErr('')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
    } catch {
      setErr('Microphone blocked - allow it via the lock icon in the address bar.')
      return
    }
    chunksRef.current = []
    const rec = new MediaRecorder(stream)
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      void processTake(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }))
    }
    recorderRef.current = rec
    startedAtRef.current = Date.now()
    setElapsed(0)
    setPhase('recording')
    rec.start()
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedAtRef.current) / 1000)
      setElapsed(s)
      if (s >= MAX_RECORD_SECONDS) stop()
    }, 250)
  }

  const stop = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    try { recorderRef.current?.stop() } catch {}
  }

  const processTake = async (raw: Blob) => {
    setPhase('processing')
    try {
      const wav = await blobToWav16kMono(raw)
      setPreview({ blob: wav.blob, url: URL.createObjectURL(wav.blob), seconds: wav.seconds })
      setPhase('preview')
    } catch {
      setErr("Couldn't process the recording - try again (Chrome works best).")
      setPhase('idle')
    }
  }

  const upload = async () => {
    if (!preview) return
    setPhase('uploading'); setErr('')
    try {
      const r = await fetchWithAuth(`/api/sales/dialer/vm-recording?seconds=${preview.seconds}`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: preview.blob,
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) throw new Error(j?.error || 'Upload failed')
      onChanged({ url: j.url, seconds: j.seconds })
      setPreview(null)
      setPhase('idle')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
      setPhase('preview')
    }
  }

  const removeSaved = async () => {
    if (!confirm('Remove your voicemail recording? Drop VM will fall back to the spoken script.')) return
    setErr('')
    const r = await fetchWithAuth('/api/sales/dialer/vm-recording', { method: 'DELETE' })
    if (r.ok) onChanged(null)
    else setErr('Remove failed')
  }

  return (
    <div className="space-y-3">
      {vmAudio && phase === 'idle' && !preview && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
          <PlayButton src={vmAudio.url} seconds={vmAudio.seconds} tone="emerald" />
          <span className="text-xs text-emerald-900 flex-1">Recording saved ({vmAudio.seconds}s)</span>
          <button onClick={removeSaved} className="p-1.5 text-slate-400 hover:text-rose-600" title="Remove recording" aria-label="Remove recording">
            <TrashSimple className="w-4 h-4" />
          </button>
        </div>
      )}

      {phase === 'preview' && preview ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
            <PlayButton src={preview.url} seconds={preview.seconds} tone="blue" />
            <span className="text-xs text-blue-900 flex-1">New take ({preview.seconds}s) - listen before saving</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={upload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors duration-150"
            >
              <CheckCircle weight="fill" className="w-4 h-4" /> Use this recording
            </button>
            <button
              onClick={() => { setPreview(null); setPhase('idle') }}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              Discard
            </button>
          </div>
        </div>
      ) : phase === 'recording' ? (
        <button
          onClick={stop}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors duration-150"
        >
          <Stop weight="fill" className="w-4 h-4" />
          Stop ({elapsed}s / {MAX_RECORD_SECONDS}s)
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        </button>
      ) : phase === 'processing' || phase === 'uploading' ? (
        <div className="inline-flex items-center gap-2 text-sm text-slate-500 px-1 py-2">
          <CircleNotch className="w-4 h-4 animate-spin" />
          {phase === 'processing' ? 'Processing…' : 'Saving…'}
        </div>
      ) : (
        <button
          onClick={start}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors duration-150"
        >
          <Microphone weight="fill" className="w-4 h-4" />
          {vmAudio ? 'Record a new take' : 'Record your voicemail'}
        </button>
      )}

      {err && <div className="text-xs text-rose-600">{err}</div>}
    </div>
  )
}

/**
 * One-button audio player with a countdown while playing. Replaces the
 * native <audio controls>, which collapsed to an unusable sliver inside
 * the flex row and confused everyone with a decorative icon next to it.
 */
function PlayButton({ src, seconds, tone }: { src: string; seconds: number; tone: 'blue' | 'emerald' }) {
  const [playing, setPlaying] = useState(false)
  const [remaining, setRemaining] = useState(seconds)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current)
    try { audioRef.current?.pause() } catch {}
    audioRef.current = null
  }, [])

  const stopTicking = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }

  const toggle = async () => {
    setErr(false)
    if (playing) {
      try { audioRef.current?.pause() } catch {}
      audioRef.current = null
      stopTicking()
      setPlaying(false)
      setRemaining(seconds)
      return
    }
    const a = new Audio(src)
    audioRef.current = a
    a.onended = () => { stopTicking(); setPlaying(false); setRemaining(seconds) }
    a.onerror = () => { stopTicking(); setPlaying(false); setErr(true) }
    try {
      await a.play()
    } catch {
      setErr(true)
      return
    }
    setPlaying(true)
    setRemaining(seconds)
    tickRef.current = setInterval(() => {
      if (audioRef.current) setRemaining(Math.max(0, Math.ceil(seconds - audioRef.current.currentTime)))
    }, 250)
  }

  const colors = tone === 'blue'
    ? 'bg-blue-600 hover:bg-blue-700'
    : 'bg-emerald-600 hover:bg-emerald-700'

  return (
    <span className="inline-flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => void toggle()}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-white transition-colors duration-150 ${colors}`}
        aria-label={playing ? 'Stop playback' : 'Play recording'}
        title={playing ? 'Stop' : 'Listen'}
      >
        {playing ? <Stop weight="fill" className="w-4 h-4" /> : <Play weight="fill" className="w-4 h-4" />}
      </button>
      {playing && <span className="text-[11px] tabular-nums text-slate-500">{remaining}s</span>}
      {err && <span className="text-[11px] text-rose-600">Playback failed - hard-refresh (Cmd+Shift+R)</span>}
    </span>
  )
}

/** Decode any browser recording and re-encode as 16kHz mono PCM WAV. */
async function blobToWav16kMono(blob: Blob): Promise<{ blob: Blob; seconds: number }> {
  const raw = await blob.arrayBuffer()
  const AC: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext
  const ctx = new AC()
  const decoded = await ctx.decodeAudioData(raw)
  void ctx.close()

  const rate = 16000
  const frames = Math.ceil(decoded.duration * rate)
  const off = new OfflineAudioContext(1, frames, rate)
  const src = off.createBufferSource()
  src.buffer = decoded
  src.connect(off.destination)
  src.start()
  const rendered = await off.startRendering()
  const samples = rendered.getChannelData(0)

  // PCM16 WAV header + data.
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buf)
  const writeStr = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)) }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)          // PCM
  view.setUint16(22, 1, true)          // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)   // byte rate
  view.setUint16(32, 2, true)          // block align
  view.setUint16(34, 16, true)         // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let o = 44
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return {
    blob: new Blob([buf], { type: 'audio/wav' }),
    seconds: Math.max(1, Math.round(decoded.duration)),
  }
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
