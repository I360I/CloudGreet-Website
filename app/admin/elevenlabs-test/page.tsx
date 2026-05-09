'use client'

/**
 * /admin/elevenlabs-test
 *
 * Pre-migration sanity check. Three buttons:
 *   1. Ping ElevenLabs - confirm API key works, list voices.
 *   2. Create test agent - spins up a throwaway receptionist agent.
 *   3. Talk to it - opens an in-browser conversation via the EL SDK.
 *
 * If voice quality + interruption handling feel meaningfully better
 * than Retell here, we commit to the migration. If not, abort - prod
 * stays on Retell, branch gets shelved.
 */

import { useState, useRef } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Mic, MicOff, Phone, Trash2, RefreshCw } from 'lucide-react'
import { useConversation } from '@elevenlabs/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, PrimaryButton, GhostButton, DangerButton } from '../_components/ui'

type Voice = {
  voice_id: string
  name: string
  category?: string
  preview_url?: string
  labels?: Record<string, string>
}

type PingResult = {
  success: boolean
  voice_count?: number
  voices?: Voice[]
  env?: Record<string, any>
  error?: string
}

type TestAgent = {
  agent_id: string
  signed_url: string
  voice_id: string
  llm: string
}

export default function ElevenLabsTestPage() {
  const [ping, setPing] = useState<PingResult | null>(null)
  const [pingBusy, setPingBusy] = useState(false)

  const [voiceId, setVoiceId] = useState<string>('')
  const [llm, setLlm] = useState<string>('gpt-4o-mini')
  const [agent, setAgent] = useState<TestAgent | null>(null)
  const [agentBusy, setAgentBusy] = useState(false)
  const [agentErr, setAgentErr] = useState<string | null>(null)

  const [transcript, setTranscript] = useState<Array<{ source: string; message: string }>>([])
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null)

  const conversation = useConversation({
    onConnect: () => setTranscript((t) => [...t, { source: 'system', message: 'Connected.' }]),
    onDisconnect: () => setTranscript((t) => [...t, { source: 'system', message: 'Disconnected.' }]),
    onMessage: (m: any) => {
      if (!m?.message) return
      setTranscript((t) => {
        const next = [...t, { source: m.source || 'agent', message: String(m.message) }]
        queueMicrotask(() => transcriptScrollRef.current?.scrollTo({ top: 9e9 }))
        return next
      })
    },
    onError: (e: any) => {
      setTranscript((t) => [...t, { source: 'error', message: typeof e === 'string' ? e : (e?.message || 'unknown error') }])
    },
  })

  const runPing = async () => {
    setPingBusy(true); setPing(null)
    try {
      const r = await fetchWithAuth('/api/admin/elevenlabs/ping')
      const j = await r.json().catch(() => ({}))
      setPing(j)
      if (j?.voices?.length && !voiceId) setVoiceId(j.voices[0].voice_id)
    } finally {
      setPingBusy(false)
    }
  }

  const createAgent = async () => {
    setAgentBusy(true); setAgentErr(null)
    try {
      const r = await fetchWithAuth('/api/admin/elevenlabs/test-agent', {
        method: 'POST',
        body: JSON.stringify({ voice_id: voiceId || undefined, llm }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setAgentErr(j?.error || `Failed (${r.status})`)
      } else {
        setAgent(j as TestAgent)
        setTranscript([])
      }
    } finally {
      setAgentBusy(false)
    }
  }

  const tearDown = async () => {
    if (!agent) return
    try { await conversation.endSession() } catch { /* ok */ }
    try {
      await fetchWithAuth(`/api/admin/elevenlabs/test-agent?agent_id=${encodeURIComponent(agent.agent_id)}`, {
        method: 'DELETE',
      })
    } catch { /* non-fatal */ }
    setAgent(null)
    setTranscript([])
  }

  const startCall = async () => {
    if (!agent) return
    setTranscript([{ source: 'system', message: 'Requesting microphone…' }])
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setTranscript([{ source: 'error', message: 'Microphone permission denied.' }])
      return
    }
    await conversation.startSession({ signedUrl: agent.signed_url })
  }
  const endCall = () => conversation.endSession()

  const status = conversation.status
  const isSpeaking = conversation.isSpeaking

  return (
    <AdminShell activeLabel="Tools">
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-fuchsia-300 mb-1">
            ElevenLabs migration
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white">Sanity check</h1>
          <p className="text-sm text-gray-400 mt-1.5 max-w-2xl">
            Pre-migration test. Confirm the API key works, spin up a throwaway
            receptionist agent, and talk to it in the browser. If voice quality
            + turn-taking feel materially better than Retell here, we proceed
            with the migration. If not, abort and stay on Retell.
          </p>
        </div>

        <Panel>
          <PanelHeader title="1. Ping ElevenLabs" eyebrow="api key check" />
          <div className="flex items-center gap-3 flex-wrap">
            <PrimaryButton onClick={runPing} disabled={pingBusy}>
              {pingBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Ping
            </PrimaryButton>
            {ping && (
              <span className={`text-xs inline-flex items-center gap-1.5 ${ping.success ? 'text-emerald-300' : 'text-rose-300'}`}>
                {ping.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {ping.success ? `OK · ${ping.voice_count} voices available` : ping.error}
              </span>
            )}
          </div>
          {ping?.env && (
            <div className="mt-3 text-[11px] font-mono grid grid-cols-1 sm:grid-cols-2 gap-1">
              {Object.entries(ping.env).map(([k, v]) => (
                <div key={k} className="text-gray-500">
                  <span className="text-gray-400">{k}</span>:{' '}
                  <span className={v === false ? 'text-rose-300' : 'text-emerald-300'}>
                    {typeof v === 'boolean' ? (v ? 'set' : 'MISSING') : String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="mt-4">
          <Panel>
            <PanelHeader title="2. Pick voice + create test agent" eyebrow="receptionist sample" />
            {ping?.voices && ping.voices.length > 0 ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Voice</span>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                  >
                    {ping.voices.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.name}{v.category ? ` · ${v.category}` : ''}{v.labels?.gender ? ` · ${v.labels.gender}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">LLM</span>
                  <select
                    value={llm}
                    onChange={(e) => setLlm(e.target.value)}
                    className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (cheap)</option>
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="claude-3-5-sonnet">claude-3-5-sonnet (smartest)</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  </select>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {!agent ? (
                    <PrimaryButton onClick={createAgent} disabled={agentBusy}>
                      {agentBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                      Create test agent
                    </PrimaryButton>
                  ) : (
                    <>
                      <span className="text-xs font-mono text-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> agent {agent.agent_id.slice(0, 12)}…
                      </span>
                      <DangerButton onClick={tearDown}>
                        <Trash2 className="w-3 h-3" /> Tear down
                      </DangerButton>
                    </>
                  )}
                  {agentErr && (
                    <span className="text-xs text-rose-300 inline-flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {agentErr}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Run the ping first to load voices.</p>
            )}
          </Panel>
        </div>

        {agent && (
          <div className="mt-4">
            <Panel>
              <PanelHeader title="3. Talk to it" eyebrow="in-browser webrtc" />
              <div className="flex items-center gap-3 flex-wrap mb-3">
                {status === 'connected' ? (
                  <DangerButton onClick={endCall}>
                    <MicOff className="w-4 h-4" /> End call
                  </DangerButton>
                ) : (
                  <PrimaryButton onClick={startCall}>
                    <Phone className="w-4 h-4" /> Start call
                  </PrimaryButton>
                )}
                <span className="text-xs font-mono text-gray-400">
                  status: <span className="text-gray-200">{status}</span>
                  {' · '}
                  agent: <span className={isSpeaking ? 'text-fuchsia-300' : 'text-gray-200'}>{isSpeaking ? 'speaking' : 'listening'}</span>
                </span>
              </div>
              <div
                ref={transcriptScrollRef}
                className="bg-black/30 border border-white/10 rounded-lg p-3 max-h-72 overflow-auto space-y-2 text-sm font-mono"
              >
                {transcript.length === 0 ? (
                  <div className="text-gray-500 text-xs">Click <em>Start call</em> and start speaking. The agent should say hello first.</div>
                ) : (
                  transcript.map((t, i) => (
                    <div key={i} className={
                      t.source === 'agent' ? 'text-emerald-200' :
                      t.source === 'user' ? 'text-sky-200' :
                      t.source === 'error' ? 'text-rose-300' :
                      'text-gray-500'
                    }>
                      <span className="text-[10px] uppercase tracking-wider mr-2">{t.source}</span>
                      {t.message}
                    </div>
                  ))
                )}
              </div>
              <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
                Things to listen for: how natural the voice sounds, how
                quickly the agent picks up after you stop talking, what
                happens when you interrupt mid-sentence. If turn-taking feels
                off or the voice cracks, that&apos;s a real signal to abort.
              </p>
            </Panel>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
