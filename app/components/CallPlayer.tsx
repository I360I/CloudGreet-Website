'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, Download, Volume2, Clock, MessageSquare, Star, Bookmark } from 'lucide-react'
import { Card } from './ui/Card'
import { logger } from '@/lib/monitoring'

interface CallRecording {
  id: string
  callId: string
  recordingUrl: string
  transcript: string
  duration: number,
  sentiment: 'positive' | 'neutral' | 'negative',
  summary: string,
  createdAt: string
  callerName?: string,
  callerPhone: string
}

interface CallPlayerProps {
  callId: string
  businessId: string
  className?: string
}

export default function CallPlayer({ callId, businessId, className = '' }: CallPlayerProps) {
  const [recording, setRecording] = useState<CallRecording | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [bookmarks, setBookmarks] = useState<number[]>([])
  const [showTranscript, setShowTranscript] = useState(true)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    loadCallRecording()
  }, [callId])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate)
      audioRef.current.addEventListener('ended', handleEnded)
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)
      
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
          audioRef.current.removeEventListener('ended', handleEnded)
          audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata)
        }
      }
    }
  }, [recording])

  const loadCallRecording = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/calls/recording?callId=${callId}&businessId=${businessId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRecording(data.recording)
      }
    } catch (error) {
      console.error('Error loading recording:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
      audioRef.current.volume = volume
    }
  }

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const addBookmark = () => {
    if (!bookmarks.includes(Math.floor(currentTime))) {
      setBookmarks([...bookmarks, Math.floor(currentTime)].sort((a, b) => a - b))
    }
  }

  const jumpToBookmark = (time: number) => {
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400 bg-green-500/20'
      case 'negative': return 'text-red-400 bg-red-500/20'
  default: return 'text-yellow-400 bg-yellow-500/20'
    }
  }

  const downloadTranscript = () => {
    if (recording?.transcript) {
      const blob = new Blob([recording.transcript], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `call-transcript-${callId}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700/50 rounded w-48 mb-4"></div>
          <div className="h-32 bg-gray-700/50 rounded mb-4"></div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-700/50 rounded w-20"></div>
            <div className="h-10 bg-gray-700/50 rounded w-20"></div>
            <div className="h-10 bg-gray-700/50 rounded w-20"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (!recording) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-500" />
        <h3 className="text-lg font-semibold text-white mb-2">No Recording Available</h3>
        <p className="text-gray-400">This call doesn't have a recording or transcript</p>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Call Recording
          </h3>
          <p className="text-sm text-gray-400">
            {recording.callerName || 'Unknown'} • {recording.callerPhone}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getSentimentColor(recording.sentiment)}`}>
            {recording.sentiment}
          </span>
          <button
            onClick={downloadTranscript}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Download Transcript"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audio Player */}
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="relative">
          <input
            type="range"
            min="0"
            max={recording.duration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          
          {/* Bookmarks */}
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark}
              className="absolute top-0 w-1 h-2 bg-yellow-400 rounded-full cursor-pointer"
              style={{ left: `${(bookmark / recording.duration) * 100}%` }}
              onClick={() => jumpToBookmark(bookmark)}
              title={`Bookmark at ${formatTime(bookmark)}`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => jumpToBookmark(Math.max(0, currentTime - 10))}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Skip back 10s"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={togglePlayPause}
              className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => jumpToBookmark(Math.min(recording.duration, currentTime + 10))}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Skip forward 10s"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            
            <button
              onClick={addBookmark}
              className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
              title="Add bookmark"
            >
              <Bookmark className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {formatTime(currentTime)} / {formatTime(recording.duration)}
            </span>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Speed:</span>
              {[0.5, 1, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-1 rounded text-xs ${
                    playbackSpeed === speed
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={recording.recordingUrl}
          preload="metadata"
        />
      </div>

      {/* Transcript */}
      {showTranscript && recording.transcript && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-white">Transcript</h4>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-sm text-gray-400 hover:text-white"
            >
              Hide
            </button>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
              {recording.transcript}
            </pre>
          </div>
        </div>
      )}

      {/* Summary */}
      {recording.summary && (
        <div className="mt-4">
          <h4 className="text-md font-semibold text-white mb-2">Call Summary</h4>
          <p className="text-sm text-gray-300 bg-gray-800/30 rounded-lg p-3">
            {recording.summary}
          </p>
        </div>
      )}

      {/* Bookmarks List */}
      {bookmarks.length > 0 && (
        <div className="mt-4">
          <h4 className="text-md font-semibold text-white mb-2">Bookmarks</h4>
          <div className="space-y-2">
            {bookmarks.map((bookmark, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-800/30 rounded-lg p-2"
              >
                <span className="text-sm text-gray-300">
                  Bookmark {index + 1} at {formatTime(bookmark)}
                </span>
                <button
                  onClick={() => jumpToBookmark(bookmark)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Jump to
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}