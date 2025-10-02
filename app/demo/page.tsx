"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneCall, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

export default function DemoPage() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [callTranscript, setCallTranscript] = useState<{speaker: string, text: string, timestamp: string}[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [businessType, setBusinessType] = useState('HVAC')

  const demoScripts = {
    HVAC: [
      { speaker: 'AI', text: 'Hello! Thank you for calling ABC HVAC Services. My name is Alex, your AI receptionist. How can I help you today?', delay: 1000 },
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
    ],
    Paint: [
      { speaker: 'AI', text: 'Hello! Thank you for calling Premier Painting Services. My name is Sarah, your AI receptionist. How can I help you today?', delay: 1000 },
      { speaker: 'Customer', text: 'Hi, I need to get my house painted. The exterior is looking pretty faded.', delay: 3000 },
      { speaker: 'AI', text: 'I\'d be happy to help you with your exterior painting project! To give you the most accurate estimate, could you tell me roughly how many square feet your home is?', delay: 2000 },
      { speaker: 'Customer', text: 'It\'s about a 2,000 square foot house, single story.', delay: 2500 },
      { speaker: 'AI', text: 'Thank you! For a 2,000 square foot home, we typically need to see the property to provide an accurate quote. Would you like me to schedule a free estimate?', delay: 2000 },
      { speaker: 'Customer', text: 'Yes, that would be great. I\'m available weekends.', delay: 2000 },
      { speaker: 'AI', text: 'Perfect! I have Saturday at 10 AM and Sunday at 1 PM available. Which works better for you?', delay: 1500 },
      { speaker: 'Customer', text: 'Saturday at 10 AM sounds good.', delay: 1500 },
      { speaker: 'AI', text: 'Wonderful! I\'ve scheduled your free estimate for Saturday at 10 AM. Our estimator will arrive with samples and provide you with a detailed quote. Is there anything else I can help you with?', delay: 2000 },
      { speaker: 'Customer', text: 'No, that\'s perfect. Thank you!', delay: 1500 },
      { speaker: 'AI', text: 'You\'re welcome! Have a great day and we\'ll see you Saturday at 10 AM.', delay: 1500 }
    ],
    Roofing: [
      { speaker: 'AI', text: 'Hello! Thank you for calling Elite Roofing Solutions. My name is Mike, your AI receptionist. How can I help you today?', delay: 1000 },
      { speaker: 'Customer', text: 'Hi, I think I have a leak in my roof. There\'s water coming through my ceiling.', delay: 3000 },
      { speaker: 'AI', text: 'I\'m sorry to hear about the leak - that\'s definitely something we need to address quickly. For emergency situations like this, we can have someone out today. Is this an emergency situation?', delay: 2000 },
      { speaker: 'Customer', text: 'Yes, it\'s pretty urgent. The water is coming through in multiple places.', delay: 2500 },
      { speaker: 'AI', text: 'I understand this is urgent. Let me get you scheduled for emergency service today. Are you available this afternoon?', delay: 2000 },
      { speaker: 'Customer', text: 'Yes, I can be home all afternoon.', delay: 2000 },
      { speaker: 'AI', text: 'Perfect! I have a crew available at 2 PM today. They\'ll assess the damage and provide emergency repairs to stop the leak immediately. Does 2 PM work for you?', delay: 1500 },
      { speaker: 'Customer', text: 'Yes, that works perfectly.', delay: 1500 },
      { speaker: 'AI', text: 'Excellent! I\'ve scheduled emergency roof repair for 2 PM today. The crew will call you 30 minutes before arrival and will prioritize stopping the leak first. Is there anything else I can help you with?', delay: 2000 },
      { speaker: 'Customer', text: 'No, that\'s all. Thank you so much!', delay: 1500 },
      { speaker: 'AI', text: 'You\'re very welcome! Stay dry and we\'ll see you at 2 PM today.', delay: 1500 }
    ]
  }

  const startDemo = () => {
    setIsCallActive(true)
    setCallTranscript([])
    setCurrentMessage('')
    
    const script = demoScripts[businessType as keyof typeof demoScripts]
    let currentIndex = 0
    
    const playNextMessage = () => {
      if (currentIndex < script.length) {
        const message = script[currentIndex]
        
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

  const endDemo = () => {
    setIsCallActive(false)
    setCallTranscript([])
    setCurrentMessage('')
    setIsTyping(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400"
          >
            AI Receptionist Demo
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-300 max-w-2xl mx-auto"
          >
            Experience how our AI handles real customer calls for your business type
          </motion.p>
        </div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-black/40 backdrop-blur-xl rounded-3xl p-8 border border-purple-500/20 mb-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4">Choose Your Business Type</h2>
              <div className="flex flex-wrap justify-center gap-4">
                {['HVAC', 'Paint', 'Roofing'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setBusinessType(type)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                      businessType === type
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center">
              {!isCallActive ? (
                <motion.button
                  onClick={startDemo}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 mx-auto transition-all"
                >
                  <Phone className="w-6 h-6" />
                  Start Demo Call
                </motion.button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-4 h-4 bg-green-500 rounded-full"
                    />
                    <span className="text-green-400 font-semibold">Call Active</span>
                  </div>
                  
                  <motion.button
                    onClick={endDemo}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto transition-all"
                  >
                    <PhoneCall className="w-5 h-5" />
                    End Call
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>

          {isCallActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl p-8 border border-purple-500/20"
            >
              <h3 className="text-xl font-bold mb-6 text-center">Live Call Transcript</h3>
              
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-12"
          >
            <p className="text-gray-400 mb-6">
              Ready to get your own AI receptionist?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register-simple"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all"
              >
                Start Free Trial
              </a>
              <a
                href="/login-simple"
                className="bg-gray-800/50 hover:bg-gray-700/50 text-white px-8 py-4 rounded-xl font-semibold transition-all"
              >
                Sign In
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
