"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, Download, Clock, Phone, User } from 'lucide-react'

interface CallPlayerProps {
  recordingUrl: string
  callId: string
  callerName?: string
  callerPhone?: string
  duration?: number
  timestamp?: string
  transcript?: string
}

export default function CallPlayer({ 
  recordingUrl, 
  callId, 
  callerName, 
  callerPhone, 
  duration, 
  timestamp,
  transcript 
}: CallPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration || 0)
  const [volume, setVolume] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setTotalDuration(audio.duration || 0)
    const handleEnd = () => setIsPlaying(false)
    const handleError = () => setError('Failed to load audio recording')

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnd)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnd)
      audio.removeEventListener('error', handleError)
    }
  }, [])

  const togglePlayPause = async () => {
    const audio = audioRef.current
    if (!audio) return

    setIsLoading(true)
    setError(null)

    try {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        await audio.play()
        setIsPlaying(true)
      }
    } catch (err) {
      setError('Failed to play audio')
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !progressRef.current) return

    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * totalDuration
    
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const downloadRecording = () => {
    const link = document.createElement('a')
    link.href = recordingUrl
    link.download = `call-${callId}-recording.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
      {/* Call Info Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Phone className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">
              {callerName || 'Unknown Caller'}
            </h3>
            <p className="text-gray-400 text-sm">
              {callerPhone || 'Unknown Number'} • {timestamp || 'Unknown Time'}
            </p>
          </div>
        </div>
        <button
          onClick={downloadRecording}
          className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-gray-300 hover:text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>

      {/* Audio Player */}
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div
            ref={progressRef}
            onClick={handleSeek}
            className="w-full h-2 bg-gray-700/50 rounded-full cursor-pointer hover:bg-gray-600/50 transition-colors"
          >
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-100"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlayPause}
            disabled={isLoading || !!error}
            className="flex items-center justify-center w-12 h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full text-white transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          <div className="flex items-center gap-2 flex-1">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-gray-700/50 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-400 w-8">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="mt-6">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Call Transcript
            </h4>
            <div className="bg-gray-800/50 rounded-lg p-4 max-h-40 overflow-y-auto">
              <p className="text-gray-300 text-sm leading-relaxed">
                {transcript}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={recordingUrl}
        preload="metadata"
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />
    </div>
  )
}
