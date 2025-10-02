"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronRight, Search, Phone, Calendar, Settings, DollarSign, Shield, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<number[]>([])

  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const faqs = [
    {
      category: "Getting Started",
      icon: <Phone className="w-5 h-5" />,
      items: [
        {
          question: "How do I set up my CloudGreet account?",
          answer: "After creating your account, you'll be guided through our onboarding wizard. This includes setting up your business profile, phone number, calendar integration, and AI greeting preferences. The entire process takes about 10 minutes."
        },
        {
          question: "What phone number will customers see?",
          answer: "You can either use your existing business phone number or we can provision a new one for you. The AI will answer calls on whichever number you choose and route qualified leads to your calendar."
        },
        {
          question: "How quickly can I start receiving calls?",
          answer: "Once your account is set up and your phone number is configured, you can start receiving calls immediately. The AI will begin answering and qualifying leads right away."
        }
      ]
    },
    {
      category: "AI & Call Handling",
      icon: <Phone className="w-5 h-5" />,
      items: [
        {
          question: "How does the AI qualify leads?",
          answer: "Our AI asks intelligent questions to understand the customer's needs, urgency, budget, and location. It gathers all the information you need to provide accurate quotes and schedule appointments effectively."
        },
        {
          question: "Can I customize the AI's responses?",
          answer: "Yes! You can customize the greeting message, tone (professional, friendly, casual), and even add specific questions for your business type. The AI adapts to your brand voice."
        },
        {
          question: "What happens if the AI can't help a customer?",
          answer: "The AI will collect the customer's information and either schedule a callback with you or transfer them to your voicemail with a promise to call back within a specific timeframe."
        }
      ]
    },
    {
      category: "Calendar & Scheduling",
      icon: <Calendar className="w-5 h-5" />,
      items: [
        {
          question: "Which calendars does CloudGreet integrate with?",
          answer: "We integrate with Google Calendar, Microsoft Outlook, and most major calendar applications. The AI can view your availability and book appointments directly into your calendar."
        },
        {
          question: "Can I set buffer times between appointments?",
          answer: "Yes! You can set buffer times, block out unavailable hours, and even set different availability for different days of the week. The AI respects all your scheduling preferences."
        },
        {
          question: "What if I need to reschedule an appointment?",
          answer: "The AI can handle rescheduling requests automatically. It will find new available times and send updated confirmation messages to customers."
        }
      ]
    },
    {
      category: "Billing & Pricing",
      icon: <DollarSign className="w-5 h-5" />,
      items: [
        {
          question: "How does the pricing work?",
          answer: "CloudGreet costs $200/month base fee plus $50 per qualified booking. You only pay for bookings that actually get scheduled - no charges for spam calls or unqualified leads."
        },
        {
          question: "What counts as a qualified booking?",
          answer: "A qualified booking is when the AI successfully schedules an appointment in your calendar with a customer who has provided their contact information and specific service needs."
        },
        {
          question: "Can I change or cancel my plan?",
          answer: "Yes, you can change or cancel your plan at any time from your dashboard. There are no long-term contracts or cancellation fees."
        }
      ]
    },
    {
      category: "Technical Support",
      icon: <Settings className="w-5 h-5" />,
      items: [
        {
          question: "What if I'm having technical issues?",
          answer: "Our support team is available 24/7 for technical issues. You can reach us through the contact form, email, or phone. Most issues are resolved within a few hours."
        },
        {
          question: "Is my data secure?",
          answer: "Yes, we use enterprise-grade security and encryption. All call recordings and customer data are stored securely and comply with industry standards for data protection."
        },
        {
          question: "Can I export my data?",
          answer: "Yes, you can export all your call logs, customer information, and appointment data at any time from your dashboard."
        }
      ]
    }
  ]

  const filteredFAQs = faqs.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0)

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

      <div className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-purple-300">
            Help Center
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Find answers to common questions and get the support you need.
          </p>
          
          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {[
            { icon: <Phone className="w-6 h-6" />, title: "Setup Guide", desc: "Get started quickly" },
            { icon: <Calendar className="w-6 h-6" />, title: "Calendar Integration", desc: "Connect your calendar" },
            { icon: <Settings className="w-6 h-6" />, title: "AI Customization", desc: "Configure your AI" },
            { icon: <DollarSign className="w-6 h-6" />, title: "Billing Help", desc: "Pricing & payments" }
          ].map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 text-center hover:border-blue-500/30 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-white">
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {filteredFAQs.map((category, categoryIndex) => (
            <motion.div
              key={categoryIndex}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: categoryIndex * 0.1 }}
              className="bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700/50 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                    {category.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-white">{category.category}</h2>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {category.items.map((item, itemIndex) => {
                    const globalIndex = categoryIndex * 100 + itemIndex
                    const isExpanded = expandedItems.includes(globalIndex)
                    
                    return (
                      <div key={itemIndex} className="border border-gray-700/30 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleExpanded(globalIndex)}
                          className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-700/20 transition-colors duration-200"
                        >
                          <span className="text-lg font-semibold text-white">{item.question}</span>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="px-4 pb-4"
                          >
                            <p className="text-gray-300 leading-relaxed">{item.answer}</p>
                          </motion.div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-lg rounded-2xl p-8 border border-blue-500/20 text-center"
        >
          <h3 className="text-2xl font-bold text-white mb-4">Still need help?</h3>
          <p className="text-gray-300 mb-6">
            Can&apos;t find what you&apos;re looking for? Our support team is here to help.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          >
            Contact Support
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
