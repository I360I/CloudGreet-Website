"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Phone, Volume2, Brain, CheckCircle, Star } from 'lucide-react'
import Link from 'next/link'
import VoiceRealtimeOrb from '../components/VoiceRealtimeOrb'

export default function DemoPage() {
  const [selectedBusiness, setSelectedBusiness] = useState('HVAC')

  const businessConfigs = {
    HVAC: {
      name: 'ABC HVAC Services',
      type: 'HVAC',
      services: 'AC repair, heating installation, maintenance contracts',
      hours: 'Monday-Friday 8AM-6PM, Saturday 9AM-3PM'
    },
    Paint: {
      name: 'Premier Painting Services',
      type: 'Painting',
      services: 'Interior/exterior painting, cabinet refinishing, commercial painting',
      hours: 'Monday-Friday 7AM-5PM'
    },
    Roofing: {
      name: 'Elite Roofing Solutions',
      type: 'Roofing',
      services: 'Roof repairs, replacements, inspections, emergency services',
      hours: 'Monday-Friday 7AM-6PM, 24/7 emergency'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/landing" 
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
          
          <div className="flex items-center space-x-2 text-yellow-400">
            <Star className="w-5 h-5" />
            <span className="font-semibold">Live Demo</span>
          </div>
        </div>

        {/* Page Title */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Try Our AI Receptionist
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-300 max-w-2xl mx-auto"
          >
            Experience real conversation with our AI using voice recognition and speech synthesis
          </motion.p>
        </div>

        {/* Business Type Selector */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <Phone className="w-6 h-6 mr-3 text-blue-400" />
            Choose Your Business Type
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(businessConfigs).map(([type, config]) => (
              <button
                key={type}
                onClick={() => setSelectedBusiness(type)}
                className={`p-4 rounded-xl border transition-all ${
                  selectedBusiness === type
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg font-semibold mb-1">{type}</div>
                  <div className="text-sm opacity-75">{config.name}</div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Voice Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12"
        >
          <VoiceRealtimeOrb 
            businessName={businessConfigs[selectedBusiness as keyof typeof businessConfigs].name}
            businessType={businessConfigs[selectedBusiness as keyof typeof businessConfigs].type}
            services={businessConfigs[selectedBusiness as keyof typeof businessConfigs].services}
            hours={businessConfigs[selectedBusiness as keyof typeof businessConfigs].hours}
          />
        </motion.div>

        {/* Features */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
            <div className="bg-blue-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Volume2 className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Real Voice Interaction</h3>
            <p className="text-gray-400 text-sm">Speak naturally and hear AI responses with realistic speech synthesis</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
            <div className="bg-purple-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Smart Understanding</h3>
            <p className="text-gray-400 text-sm">AI understands context and provides relevant, helpful responses for your business</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
            <div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Professional Service</h3>
            <p className="text-gray-400 text-sm">Handles appointments, quotes, and customer service like a real receptionist</p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Experience the power of AI receptionist for your business. Never miss a call, always provide professional service.
            </p>
            <Link
              href="/start"
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-105"
            >
              Get Started Now
              <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
            </Link>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <h4 className="text-lg font-semibold text-white mb-4">How to Use This Demo:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <p className="font-medium text-white mb-2">1. Start the Demo Call</p>
              <p>Click "Start Demo Call" to begin the conversation with the AI receptionist.</p>
            </div>
            <div>
              <p className="font-medium text-white mb-2">2. Use Your Voice</p>
              <p>Click the microphone button and speak naturally. The AI will understand and respond.</p>
            </div>
            <div>
              <p className="font-medium text-white mb-2">3. Try Different Scenarios</p>
              <p>Ask about services, scheduling, pricing, or emergencies. The AI adapts to your needs.</p>
            </div>
            <div>
              <p className="font-medium text-white mb-2">4. Experience Real AI</p>
              <p>This is actual speech recognition and text-to-speech, not a simulation.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}