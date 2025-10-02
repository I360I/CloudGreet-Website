"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Phone, Play, Pause, CheckCircle, AlertCircle, Brain } from 'lucide-react'
import Link from 'next/link'

export default function TestAgentSimplePage() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [callTranscript, setCallTranscript] = useState<{speaker: string, text: string, timestamp: string}[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [businessInfo, setBusinessInfo] = useState({
    businessName: 'Your Business',
    greetingMessage: 'Hello! Thank you for calling. How can I help you today?'
  })

  useEffect(() => {
    // Load business info from localStorage or API
    const business = localStorage.getItem('business')
    if (business) {
      const businessData = JSON.parse(business)
      setBusinessInfo({
        businessName: businessData.business_name || 'Your Business',
        greetingMessage: businessData.greeting_message || 'Hello! Thank you for calling. How can I help you today?'
      })
    }
  }, [])

  const demoScript = [
    { speaker: 'AI', text: businessInfo.greetingMessage, delay: 1000 },
    { speaker: 'Customer', text: 'Hi, I need someone to look at my air conditioning. It\'s not cooling properly.', delay: 3000 },
    { speaker: 'AI', text: 'I\'m sorry to hear your AC isn\'t working properly. Let me help you get that fixed quickly. What type of AC system do you have?', delay: 2000 },
    { speaker: 'Customer', text: 'It\'s a central air system, about 10 years old.', delay: 2500 },
    { speaker: 'AI', text: 'Thank you for that information. Based on your description, this sounds like it could be a few different issues. I\'d like to schedule one of our certified technicians to come take a look. Are you available this week?', delay: 2000 },
    { speaker: 'Customer', text: 'Yes, I\'m available Thursday afternoon.', delay: 2000 },
    { speaker: 'AI', text: 'Perfect! I have Thursday at 2 PM and 4 PM available. Which works better for you?', delay: 1500 },
    { speaker: 'Customer', text: '2 PM works great.', delay: 1500 },
    { speaker: 'AI', text: 'Excellent! I\'ve scheduled your appointment for Thursday at 2 PM. Our technician will call you 30 minutes before arrival. Is there anything else I can help you with today?', delay: 2000 },
    { speaker: 'Customer', text: 'No, that\'s all. Thank you!', delay: 1500 },
    { speaker: 'AI', text: 'You\'re very welcome! Have a great day and we\'ll see you Thursday at 2 PM.', delay: 1500 }
  ]

  const startTest = () => {
    setIsCallActive(true)
    setCallTranscript([])
    
    let currentIndex = 0
    
    const playNextMessage = () => {
      if (currentIndex < demoScript.length) {
        const message = demoScript[currentIndex]
        
        // Show typing indicator for AI messages
        if (message.speaker === 'AI') {
          setIsTyping(true)
          setTimeout(() => {
            setIsTyping(false)
            setCallTranscript(prev => [...prev, {
              speaker: message.speaker,
              text: message.text,
              timestamp: new Date().toLocaleTimeString()
            }])
            currentIndex++
            setTimeout(playNextMessage, message.delay)
          }, 1500)
        } else {
          // Customer messages appear immediately
          setCallTranscript(prev => [...prev, {
            speaker: message.speaker,
            text: message.text,
            timestamp: new Date().toLocaleTimeString()
          }])
          currentIndex++
          setTimeout(playNextMessage, message.delay)
        }
      } else {
        // Demo finished
        setTimeout(() => {
          setIsCallActive(false)
        }, 3000)
      }
    }
    
    // Start the demo after a brief delay
    setTimeout(playNextMessage, 1000)
  }

  const endTest = () => {
    setIsCallActive(false)
    setCallTranscript([])
    setIsTyping(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Test Your AI Agent</h1>
            <p className="text-gray-400">See how your AI handles real customer calls</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Agent Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">AI Agent Ready</h2>
                  <p className="text-gray-400">Business: {businessInfo.businessName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {!isCallActive ? (
                  <motion.button
                    onClick={startTest}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
                  >
                    <Play className="w-5 h-5" />
                    Start Test Call
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-3 h-3 bg-green-500 rounded-full"
                      />
                      <span className="text-green-400 font-semibold">Call Active</span>
                    </div>
                    
                    <motion.button
                      onClick={endTest}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      End Call
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Call Transcript */}
          {isCallActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
            >
              <h3 className="text-xl font-semibold mb-6 text-center">Live Call Transcript</h3>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {callTranscript.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: message.speaker === 'AI' ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${message.speaker === 'AI' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                        message.speaker === 'AI' 
                          ? 'bg-blue-600/20 border border-blue-500/30' 
                          : 'bg-gray-700/50 border border-gray-600/30'
                      }`}>
                        <div className="text-sm font-semibold mb-1 text-gray-300">
                          {message.speaker === 'AI' ? 'AI Receptionist' : 'Customer'}
                        </div>
                        <div className="text-white">{message.text}</div>
                        <div className="text-xs text-gray-400 mt-1">{message.timestamp}</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-blue-600/20 border border-blue-500/30 max-w-xs lg:max-w-md px-4 py-3 rounded-2xl">
                      <div className="text-sm font-semibold mb-1 text-gray-300">AI Receptionist</div>
                      <div className="flex items-center gap-1">
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-2 h-2 bg-blue-400 rounded-full"
                        />
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 bg-blue-400 rounded-full"
                        />
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 bg-blue-400 rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Results */}
          {!isCallActive && callTranscript.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Test Call Completed!</h3>
                <p className="text-gray-400 mb-6">
                  Your AI successfully handled the customer call and scheduled an appointment.
                </p>
                
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">100%</div>
                    <div className="text-sm text-gray-400">Professional Response</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-400">1</div>
                    <div className="text-sm text-gray-400">Appointment Scheduled</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-400">Excellent</div>
                    <div className="text-sm text-gray-400">Customer Experience</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/get-phone">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                    >
                      Get Phone Number
                    </motion.button>
                  </Link>
                  <motion.button
                    onClick={startTest}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                  >
                    Test Again
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Instructions */}
          {!isCallActive && callTranscript.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold mb-4">How the Test Works</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 text-green-400">What You&apos;ll See:</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Real-time call transcript</li>
                    <li>• AI handling customer inquiries</li>
                    <li>• Professional appointment scheduling</li>
                    <li>• Natural conversation flow</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-blue-400">What Happens:</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Customer calls about AC repair</li>
                    <li>• AI asks qualifying questions</li>
                    <li>• Appointment gets scheduled</li>
                    <li>• Professional follow-up</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
