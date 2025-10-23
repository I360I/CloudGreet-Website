"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, Download, Copy } from 'lucide-react'

interface CallPlayerProps {
  recordingUrl?: string
  transcript?: string
  callId: string
  className?: string
}

export default function CallPlayer({ recordingUrl, transcript, callId, className = '' }: CallPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', () => setIsPlaying(false))

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', () => setIsPlaying(false))
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = parseFloat(e.target.value)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = parseFloat(e.target.value)
    audio.volume = newVolume
    setVolume(newVolume)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const copyTranscript = () => {
    if (transcript) {
      navigator.clipboard.writeText(transcript)
    }
  }

  const downloadRecording = () => {
    if (recordingUrl) {
      const link = document.createElement('a')
      link.href = recordingUrl
      link.download = `call-${callId}.mp3`
      link.click()
    }
  }

  if (!recordingUrl && !transcript) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 text-center text-gray-500 ${className}`}>
        No recording or transcript available
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Call Recording</h3>
        <div className="flex space-x-2">
          {recordingUrl && (
            <button
              onClick={downloadRecording}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              title="Download recording"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {transcript && (
            <button
              onClick={copyTranscript}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              title="Copy transcript"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {recordingUrl && (
        <div className="mb-4">
          <audio ref={audioRef} src={recordingUrl} preload="metadata" />
          
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={togglePlay}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-600">{formatTime(duration)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-gray-600" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {transcript && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Transcript</h4>
          <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{transcript}</p>
          </div>
        </div>
      )}
    </div>
  )
}
