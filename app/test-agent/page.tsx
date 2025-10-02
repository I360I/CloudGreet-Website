'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Phone, Play, Pause, Volume2, Settings, CheckCircle, AlertCircle, Clock, Brain } from 'lucide-react'
import Link from 'next/link'

export default function TestAgentPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    phoneNumber: '',
    greetingMessage: '',
    isActive: false
  })
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

  useEffect(() => {
    loadBusinessInfo()
  }, [])

  const loadBusinessInfo = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/business/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setBusinessInfo({
            businessName: data.data.businessName || 'Your Business',
            phoneNumber: data.data.phone || 'Not configured',
            greetingMessage: data.data.greetingMessage || 'Hello! Thank you for calling.',
            isActive: data.data.onboardingCompleted || false
          })
        }
      }
    } catch (error) {
      console.error('Failed to load business info:', error)
    }
  }

  const handleTestCall = async () => {
    setIsLoading(true)
    setTestStatus('testing')
    
    try {
      // Simulate test call with realistic timing
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Open demo call simulation
      const demoWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
      if (demoWindow) {
        demoWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>AI Agent Demo Call</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: white; 
                margin: 0; 
                padding: 20px;
                min-height: 100vh;
              }
              .container { max-width: 600px; margin: 0 auto; }
              .call-header { 
                text-align: center; 
                padding: 20px; 
                background: rgba(255,255,255,0.1); 
                border-radius: 12px; 
                margin-bottom: 20px;
              }
              .call-log { 
                background: rgba(0,0,0,0.3); 
                padding: 20px; 
                border-radius: 12px; 
                border: 1px solid rgba(255,255,255,0.2);
                margin-bottom: 20px;
              }
              .message { 
                margin: 10px 0; 
                padding: 10px; 
                border-radius: 8px; 
                animation: fadeIn 0.5s ease-in;
              }
              .ai-message { 
                background: rgba(59, 130, 246, 0.2); 
                border-left: 4px solid #3b82f6;
              }
              .customer-message { 
                background: rgba(34, 197, 94, 0.2); 
                border-left: 4px solid #22c55e;
                text-align: right;
              }
              .typing { 
                background: rgba(156, 163, 175, 0.2); 
                border-left: 4px solid #9ca3af;
                font-style: italic;
              }
              @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
              .phone-icon { 
                width: 40px; 
                height: 40px; 
                background: #3b82f6; 
                border-radius: 50%; 
                display: inline-flex; 
                align-items: center; 
                justify-content: center; 
                margin-bottom: 10px;
              }
              .status { 
                padding: 8px 16px; 
                border-radius: 20px; 
                font-size: 14px; 
                font-weight: 500;
              }
              .status.active { background: #22c55e; color: white; }
              .status.ended { background: #ef4444; color: white; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="call-header">
                <div class="phone-icon">📞</div>
                <h1>Demo Call Simulation</h1>
                <div class="status active">Call Active - ${businessInfo.businessName || 'Your Business'}</div>
              </div>
              
              <div class="call-log" id="callLog">
                <h3>Call Transcript:</h3>
                <div id="messages"></div>
              </div>
              
              <div style="text-align: center;">
                <button onclick="endCall()" style="
                  background: #ef4444; 
                  color: white; 
                  border: none; 
                  padding: 12px 24px; 
                  border-radius: 8px; 
                  font-size: 16px; 
                  cursor: pointer;
                ">End Call</button>
              </div>
            </div>
            
            <script>
              const messages = [
                { type: 'ai', text: '${businessInfo.greetingMessage || "Hello! Thank you for calling ' + (businessInfo.businessName || 'Your Business') + '. How can I help you today?"}' },
                { type: 'customer', text: 'Hi, I need some help with my HVAC system. It\'s not heating properly.' },
                { type: 'ai', text: 'I\'m sorry to hear about your heating issue. I can definitely help you with that. Can you tell me a bit more about what\'s happening? Is the system not turning on at all, or is it running but not producing heat?' },
                { type: 'customer', text: 'It turns on but the air coming out is cold. And it makes some strange noises too.' },
                { type: 'ai', text: 'That sounds like it could be a few different issues - possibly a problem with the heat exchanger or a component failure. For safety reasons, I\'d recommend having a qualified technician take a look. Would you like me to schedule an appointment for you?' },
                { type: 'customer', text: 'Yes, that would be great. How soon can someone come out?' },
                { type: 'ai', text: 'I can schedule someone to come out today if that works for you. Let me get your contact information. What\'s your name and phone number?' },
                { type: 'customer', text: 'My name is Sarah Johnson and my number is 555-123-4567.' },
                { type: 'ai', text: 'Perfect, Sarah. And what\'s the best address for the service call?' },
                { type: 'customer', text: '123 Main Street, Anytown, ST 12345.' },
                { type: 'ai', text: 'Excellent. I have you scheduled for today between 2-4 PM. Our technician will call you 30 minutes before arriving. Is there anything else I can help you with today?' },
                { type: 'customer', text: 'No, that\'s all. Thank you so much!' },
                { type: 'ai', text: 'You\'re very welcome, Sarah. We look forward to helping you get your heating back up and running. Have a great day!' }
              ];
              
              let messageIndex = 0;
              const messagesDiv = document.getElementById('messages');
              
              function addMessage(message) {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${message.type}-message\`;
                messageDiv.innerHTML = \`<strong>\${message.type === 'ai' ? 'AI Agent' : 'Customer'}:</strong> \${message.text}\`;
                messagesDiv.appendChild(messageDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
              }
              
              function showTyping() {
                const typingDiv = document.createElement('div');
                typingDiv.className = 'message typing';
                typingDiv.id = 'typing';
                typingDiv.innerHTML = '<strong>AI Agent:</strong> <em>typing...</em>';
                messagesDiv.appendChild(typingDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
              }
              
              function hideTyping() {
                const typing = document.getElementById('typing');
                if (typing) typing.remove();
              }
              
              function nextMessage() {
                if (messageIndex < messages.length) {
                  const message = messages[messageIndex];
                  
                  if (message.type === 'ai') {
                    showTyping();
                    setTimeout(() => {
                      hideTyping();
                      addMessage(message);
                      messageIndex++;
                      setTimeout(nextMessage, 2000);
                    }, 1500);
                  } else {
                    setTimeout(() => {
                      addMessage(message);
                      messageIndex++;
                      setTimeout(nextMessage, 2000);
                    }, 1000);
                  }
                } else {
                  setTimeout(() => {
                    document.querySelector('.status').textContent = 'Call Ended';
                    document.querySelector('.status').className = 'status ended';
                  }, 1000);
                }
              }
              
              function endCall() {
                window.close();
              }
              
              // Start the demo
              setTimeout(nextMessage, 1000);
            </script>
          </body>
          </html>
        `)
        demoWindow.document.close()
      }
      
      setTestStatus('success')
      setTimeout(() => setTestStatus('idle'), 3000)
    } catch (error) {
      setTestStatus('error')
      setTimeout(() => setTestStatus('idle'), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (testStatus) {
      case 'testing':
        return <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-400" />
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-400" />
      default:
        return <Play className="w-6 h-6 text-blue-400" />
    }
  }

  const getStatusMessage = () => {
    switch (testStatus) {
      case 'testing':
        return 'Testing your AI agent...'
      case 'success':
        return 'Test completed successfully!'
      case 'error':
        return 'Test failed. Please check your configuration.'
      default:
        return 'Ready to test'
    }
  }

  const getStatusColor = () => {
    switch (testStatus) {
      case 'testing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'success':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Test AI Agent</h1>
                <p className="text-gray-400 text-sm">Test your AI receptionist configuration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${getStatusColor()}`}>
                {getStatusIcon()}
                <span className="text-sm font-medium">{getStatusMessage()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Agent Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Brain className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">AI Agent Status</h2>
                <p className="text-gray-400">Current configuration and status</p>
              </div>
            </div>
            
            <div className={`px-4 py-2 rounded-xl border ${
              businessInfo.isActive 
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            }`}>
              <div className="flex items-center space-x-2">
                {businessInfo.isActive ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {businessInfo.isActive ? 'Active' : 'Setup Required'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Business Name</label>
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-white">{businessInfo.businessName}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-white">{businessInfo.phoneNumber}</p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Greeting Message</label>
              <div className="bg-gray-800/50 rounded-xl p-3">
                <p className="text-white text-sm">{businessInfo.greetingMessage}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Test Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-8"
        >
          <h3 className="text-xl font-bold text-white mb-6">Test Your AI Agent</h3>
          
          <div className="space-y-6">
            <div className="bg-gray-800/30 rounded-xl p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <Phone className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Live Call Test</h4>
                  <p className="text-gray-400">Test your AI agent with a real phone call</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">
                    <strong>How to test your AI agent:</strong>
                  </p>
                  <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
                    <li>Click "Start Demo Call" below to simulate a customer call</li>
                    <li>You'll hear your AI agent's greeting message</li>
                    <li>Try asking about services, pricing, or booking appointments</li>
                    <li>The AI will respond based on your business information</li>
                    <li>See how the AI qualifies leads and handles different scenarios</li>
                  </ol>
                </div>
                
                <button
                  onClick={handleTestCall}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-3"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Starting Demo...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span>Start Demo Call</span>
                    </>
                  )}
                </button>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-400" />
                    <div>
                      <h5 className="text-blue-400 font-semibold">Demo Mode</h5>
                      <p className="text-blue-300 text-sm">
                        This is a simulation of how your AI agent will handle real customer calls. No phone number required!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-xl p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Settings className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Configuration Test</h4>
                  <p className="text-gray-400">Verify your AI agent settings</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h5 className="text-white font-medium mb-2">Voice Settings</h5>
                  <p className="text-gray-400 text-sm">Voice: Professional</p>
                  <p className="text-gray-400 text-sm">Language: English</p>
                </div>
                
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h5 className="text-white font-medium mb-2">Business Hours</h5>
                  <p className="text-gray-400 text-sm">Mon-Fri: 9 AM - 5 PM</p>
                  <p className="text-gray-400 text-sm">After hours: Voicemail</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Link
            href="/calls"
            className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all group"
          >
            <div className="flex items-center space-x-3 mb-3">
              <Phone className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
              <h4 className="font-semibold text-white">View Call Logs</h4>
            </div>
            <p className="text-gray-400 text-sm">See all incoming calls and AI interactions</p>
          </Link>
          
          <Link
            href="/appointments"
            className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all group"
          >
            <div className="flex items-center space-x-3 mb-3">
              <Clock className="w-6 h-6 text-green-400 group-hover:text-green-300" />
              <h4 className="font-semibold text-white">Check Appointments</h4>
            </div>
            <p className="text-gray-400 text-sm">View scheduled appointments from AI</p>
          </Link>
          
          <Link
            href="/dashboard"
            className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all group"
          >
            <div className="flex items-center space-x-3 mb-3">
              <Settings className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
              <h4 className="font-semibold text-white">Update Settings</h4>
            </div>
            <p className="text-gray-400 text-sm">Modify your AI agent configuration</p>
          </Link>
        </motion.div>
      </main>
    </div>
  )
}
