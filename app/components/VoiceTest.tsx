'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react'

interface VoiceTestProps {
  agentId: string
  businessName: string
  onVoiceChange?: (voiceId: string) => void
  onGenderChange?: (gender: string) => void
}

export default function VoiceTest({ agentId, businessName, onVoiceChange, onGenderChange }: VoiceTestProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle')
  const [selectedVoice, setSelectedVoice] = useState('11labs_anna')
  const [selectedGender, setSelectedGender] = useState('female')
  const [showMicPermissionAlert, setShowMicPermissionAlert] = useState(false)
  const [micPermissionGranted, setMicPermissionGranted] = useState(false)
  
  const websocketRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)


  const voiceOptions = [
    { id: '11labs_anna', name: 'Anna', gender: 'female', description: 'Professional, friendly' },
    { id: '11labs_sarah', name: 'Sarah', gender: 'female', description: 'Warm, approachable' },
    { id: '11labs_emma', name: 'Emma', gender: 'female', description: 'Clear, confident' },
    { id: '11labs_james', name: 'James', gender: 'male', description: 'Professional, authoritative' },
    { id: '11labs_michael', name: 'Michael', gender: 'male', description: 'Friendly, trustworthy' },
    { id: '11labs_david', name: 'David', gender: 'male', description: 'Clear, professional' }
  ]

  const startCall = async () => {
    console.log('=== START CALL CLICKED ===')
    alert('Button clicked! Check console for microphone permission request.')
    setIsLoading(true)
    setError(null)
    setCallStatus('connecting')

    try {
      // Check if agent ID is valid
      if (!agentId || agentId === 'loading') {
        throw new Error('Agent not ready. Please wait a moment and try again.')
      }

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone access. Please use Chrome, Firefox, or Safari.')
      }

      console.log('=== REQUESTING MICROPHONE PERMISSION ===')
      console.log('Navigator available:', !!navigator)
      console.log('MediaDevices available:', !!navigator.mediaDevices)
      console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia)
      console.log('About to call getUserMedia...')
      
      // Request microphone permission - this should trigger the browser popup
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true
      })
      
      console.log('=== MICROPHONE PERMISSION GRANTED ===')
      console.log('Stream obtained:', !!stream)
      console.log('Stream tracks:', stream.getTracks().length)
      mediaStreamRef.current = stream
      setMicPermissionGranted(true)

      // Simulate successful connection
      setTimeout(() => {
        setIsConnected(true)
        setCallStatus('connected')
        setIsLoading(false)
        console.log('Call simulation started with agent:', agentId)
      }, 1500)

    } catch (err: any) {
      console.error('=== ERROR STARTING CALL ===')
      console.error('Error name:', err.name)
      console.error('Error message:', err.message)
      console.error('Full error:', err)
      
      let errorMessage = 'Failed to start call. '
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access and try again.'
        setShowMicPermissionAlert(true)
        console.log('=== PERMISSION DENIED - SHOWING ALERT ===')
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.'
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Microphone not supported. Please use a different browser.'
      } else if (err.message) {
        errorMessage += err.message
      } else {
        errorMessage += 'Please check your microphone and try again.'
      }
      
      setError(errorMessage)
      setIsLoading(false)
      setCallStatus('idle')
    }
  }

  const endCall = () => {
    if (websocketRef.current) {
      websocketRef.current.close()
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
    }
    setIsConnected(false)
    setCallStatus('ended')
  }

  const playAudio = (audioData: string) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${audioData}`)
      audio.play()
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Test Your AI Receptionist
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Have a live conversation with your AI receptionist for {businessName}
        </p>
      </div>

      <div className="space-y-6">
        {/* Voice Customization */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Customize Voice</h4>
          
          {/* Gender Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Gender
            </label>
            <div className="flex space-x-3">
              {['female', 'male'].map((gender) => (
                <button
                  key={gender}
                  onClick={() => {
                    setSelectedGender(gender)
                    onGenderChange?.(gender)
                    // Auto-select first voice of selected gender
                    const firstVoice = voiceOptions.find(v => v.gender === gender)
                    if (firstVoice) {
                      setSelectedVoice(firstVoice.id)
                      onVoiceChange?.(firstVoice.id)
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedGender === gender
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-500'
                  }`}
                >
                  {gender === 'female' ? '👩 Female' : '👨 Male'}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Voice
            </label>
            <div className="grid grid-cols-2 gap-3">
              {voiceOptions
                .filter(voice => voice.gender === selectedGender)
                .map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      setSelectedVoice(voice.id)
                      onVoiceChange?.(voice.id)
                    }}
                    className={`p-3 rounded-lg text-left transition-colors ${
                      selectedVoice === voice.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-500'
                    }`}
                  >
                    <div className="font-medium">{voice.name}</div>
                    <div className="text-xs opacity-75">{voice.description}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Agent Status */}
        <div className="text-center">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-2 ${
            agentId === 'loading' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
            agentId && agentId !== 'loading' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
            'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
          }`}>
            {agentId === 'loading' && 'Creating AI agent...'}
            {agentId && agentId !== 'loading' && 'AI agent ready!'}
            {!agentId && 'Agent not ready'}
          </div>
        </div>

        {/* Call Status */}
        <div className="text-center">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            callStatus === 'idle' ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' :
            callStatus === 'connecting' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
            callStatus === 'connected' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
            'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
          }`}>
            {callStatus === 'idle' && 'Ready to test'}
            {callStatus === 'connecting' && 'Connecting...'}
            {callStatus === 'connected' && 'Connected - Speak now!'}
            {callStatus === 'ended' && 'Call ended'}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Microphone Permission Alert */}
        {showMicPermissionAlert && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Mic className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                  Microphone Access Required
                </h3>
                <p className="text-amber-700 dark:text-amber-300 text-sm mb-4">
                  To test the AI voice agent, we need access to your microphone. Please follow these steps:
                </p>
                <ol className="list-decimal list-inside text-amber-700 dark:text-amber-300 text-sm space-y-2 mb-4">
                  <li>Look for the microphone permission popup in your browser (usually top-left corner)</li>
                  <li>Click "Allow" or "Yes" to grant microphone access</li>
                  <li>If you missed the popup, click the microphone icon in your browser's address bar</li>
                  <li>Click "Start Test Call" again to retry</li>
                </ol>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowMicPermissionAlert(false)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Got it, try again
                  </button>
                  <button
                    onClick={() => {
                      setShowMicPermissionAlert(false)
                      setError(null)
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Use demo mode instead
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Call Controls */}
        <div className="flex justify-center space-x-4">
          {!isConnected ? (
            <div className="flex flex-col space-y-3">
              <button
                onClick={startCall}
                disabled={isLoading || agentId === 'loading' || !agentId}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <Phone className="w-6 h-6" />
                <span>
                  {isLoading ? 'Requesting Microphone Access...' : 
                   agentId === 'loading' ? 'Creating Agent...' :
                   !agentId ? 'Agent Not Ready' :
                   'Start Test Call'}
                </span>
              </button>
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-md mx-auto">
                <strong>Click "Start Test Call" to trigger the browser's microphone permission popup.</strong> You'll see a notification asking to allow microphone access for this site.
              </p>
              
              <button
                onClick={() => {
                  setIsConnected(true)
                  setCallStatus('connected')
                  console.log('Demo mode started')
                }}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <Volume2 className="w-5 h-5" />
                <span>Demo Mode (No Mic Required)</span>
              </button>
            </div>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={toggleMute}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isMuted 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-slate-600 hover:bg-slate-700 text-white'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
              
              <button
                onClick={endCall}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-medium transition-colors"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Call</span>
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to test:</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Wait for "AI agent ready!" status before starting</li>
            <li>• Click "Start Test Call" and allow microphone access when prompted</li>
            <li>• Or use "Demo Mode" if you don't want to use your microphone</li>
            <li>• Speak naturally - ask about services, pricing, or scheduling</li>
            <li>• The AI will respond with your business information</li>
            <li>• Try different voices to see which one you prefer</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
