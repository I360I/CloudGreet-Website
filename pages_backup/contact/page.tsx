"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Mail, Phone, MapPin, Clock, Send } from 'lucide-react'
import Link from 'next/link'

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    try {
      const formData = new FormData(event.currentTarget)
      const data = Object.fromEntries(formData.entries())
      
      // Convert to the expected API format
      const apiData = {,
  subject: data.topic || 'General Question',
        message: data.message || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        businessName: data.businessName || ''
      }

    
    catch (error) {

    
      console.error('Error:', error);

    
      throw error;

    
    }
      
      // Submit contact form
      const response = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      setMessage('Thank you for your message! We\'ll get back to you within 24 hours.')
      event.currentTarget.reset()
    } catch (error) {
      setMessage('Sorry, there was an error sending your message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="border-b border-gray-800/50 backdrop-blur-md bg-black/20 sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/landing" className="flex items-center">
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">CloudGreet</span>
            </Link>
            <Link
              href="/landing"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </motion.nav>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-purple-300">
            Contact Us
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Have questions? Need support? We&apos;re here to help you succeed with CloudGreet.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
              <h2 className="text-2xl font-bold mb-6 text-white">Send us a message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    required
                    className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30"
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    required
                    className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30"
                  />
                </div>
                
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  required
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <input
                  type="text"
                  name="business"
                  placeholder="Business Name"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <select
                  name="subject"
                  required
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a topic</option>
                  <option value="general">General Question</option>
                  <option value="support">Technical Support</option>
                  <option value="billing">Billing Question</option>
                  <option value="partnership">Partnership Inquiry</option>
                  <option value="feature">Feature Request</option>
                </select>
                
                <textarea
                  name="message"
                  placeholder="Your message..."
                  rows={5}
                  required
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 resize-none"
                />
                
                {message && (
                  <div className={`p-4 rounded-lg ${message.includes('Thank you') ? 'bg-green-900/20 border border-green-500/30 text-green-300' : 'bg-red-900/20 border border-red-500/30 text-red-300'}`}>
                    {message}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-white/10 backdrop-blur-xl border border-white/20 text-white py-4 rounded-lg font-semibold hover:bg-white/20 hover:border-white/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-3" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-8"
          >
            <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
              <h2 className="text-2xl font-bold mb-6 text-white">Get in touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Email</h3>
                    <p className="text-gray-400">support@cloudgreet.ai</p>
                    <p className="text-sm text-gray-500">We respond within 24 hours</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Phone</h3>
                    <p className="text-gray-400">1-800-CLOUDGREET</p>
                    <p className="text-sm text-gray-500">Mon-Fri 9AM-6PM EST</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Office</h3>
                    <p className="text-gray-400">San Francisco, CA</p>
                    <p className="text-sm text-gray-500">Remote-first company</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Response Time</h3>
                    <p className="text-gray-400">24 hours or less</p>
                    <p className="text-sm text-gray-500">Priority support for customers</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-lg rounded-2xl p-8 border border-blue-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Need immediate help?</h3>
              <p className="text-gray-300 mb-6">
                For urgent technical issues or billing questions, call us directly or use our live chat.
              </p>
              <Link
                href="/help"
                className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
              >
                Visit Help Center
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
