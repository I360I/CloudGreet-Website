"use client"

import Link from "next/link"
import { useState } from "react"

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<number[]>([0])
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '', company: '' })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitted(true)
    setTimeout(() => {
      setIsSubmitted(false)
      setShowLeadForm(false)
      setLeadData({ name: '', email: '', phone: '', company: '' })
    }, 3000)
  }

  const handleLeadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLeadData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const faqCategories = [
    {
      title: "Getting Started",
      faqs: [
        {
          question: "How quickly can CloudGreet be set up for my business?",
          answer: "Most customers are live within 24 hours. We handle the technical setup, Google Calendar integration, and AI training for your specific business."
        },
        {
          question: "What information do I need to provide during setup?",
          answer: "We need your business details, access to your Google Calendar, your current phone number for call forwarding, and any specific scripts you want the AI to use."
        },
        {
          question: "Do I need any special equipment or software?",
          answer: "No special equipment needed. CloudGreet works with your existing phone number and Google Calendar. We handle all the technical integration."
        }
      ]
    },
    {
      title: "Pricing & Billing",
      faqs: [
        {
          question: "What exactly counts as a booking?",
          answer: "A booking is when we successfully schedule an estimate or service appointment in your calendar with a qualified customer who provided their contact information and job details."
        },
        {
          question: "Are there any setup fees or hidden costs?",
          answer: "No setup fees, no hidden costs, no contracts. You only pay the monthly base fee ($200) plus per-booking fees ($50 each). Cancel anytime with 30 days notice."
        },
        {
          question: "How does billing work for partial months?",
          answer: "Your first month is prorated based on when you start. Booking fees are charged as they occur. You receive detailed invoices showing all charges."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit cards and ACH bank transfers. Payments are processed securely through Stripe."
        }
      ]
    },
    {
      title: "How CloudGreet Works",
      faqs: [
        {
          question: "How does the AI know about my business and services?",
          answer: "During setup, we train the AI on your specific business details including services offered, pricing ranges, scheduling preferences, and your brand voice."
        },
        {
          question: "What happens if the AI cannot handle a call?",
          answer: "If the AI encounters a complex situation, it will politely take the caller information and let them know you will call back within a specified timeframe."
        },
        {
          question: "Can I customize what the AI says to callers?",
          answer: "Yes, during setup we configure the AI to match your brand voice and specific business needs. You can specify greeting scripts and responses."
        },
        {
          question: "Does CloudGreet integrate with my existing tools?",
          answer: "CloudGreet integrates directly with Google Calendar for scheduling. We can also connect to most CRM systems and scheduling tools."
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between p-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <span className="text-white font-bold">CG</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">CloudGreet</span>
          </Link>
          
          <div className="hidden lg:flex lg:gap-x-8">
            <Link href="/pricing" className="text-sm font-semibold text-gray-900 hover:text-blue-500">Pricing</Link>
            <Link href="/demo" className="text-sm font-semibold text-gray-900 hover:text-blue-500">Demo</Link>
            <Link href="/faq" className="text-sm font-semibold text-blue-500">FAQ</Link>
            <Link href="/contact" className="text-sm font-semibold text-gray-900 hover:text-blue-500">Contact</Link>
          </div>
          
          <button 
            onClick={() => setShowLeadForm(true)}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600"
          >
            Get Started
          </button>
        </nav>
      </header>

      <div className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8">
            <Link href="/" className="text-blue-500 hover:text-blue-600">
              ← Back to Home
            </Link>
          </div>

          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-gray-600 mb-16">
              Everything you need to know about CloudGreet AI receptionist service.
            </p>
          </div>

          <div className="mx-auto max-w-4xl">
            {faqCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
                  {category.title}
                </h2>
                
                <div className="space-y-4">
                  {category.faqs.map((faq, faqIndex) => {
                    const globalIndex = categoryIndex * 10 + faqIndex
                    const isOpen = openItems.includes(globalIndex)
                    
                    return (
                      <div key={globalIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleItem(globalIndex)}
                          className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                          <span className={`text-blue-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-4">
                            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-24 max-w-2xl text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Still have questions?
            </h2>
            <p className="text-gray-600 mb-6">
              Contact us and we will get back to you within 4 hours.
            </p>
            <Link 
              href="/contact"
              className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      {/* Lead Capture Modal */}
      {showLeadForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md mx-4 w-full">
            <button
              onClick={() => setShowLeadForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            {isSubmitted ? (
              <div className="p-8 text-center">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-500 text-2xl">✓</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h3>
                <p className="text-gray-600">We will contact you within 4 hours to set up your free trial.</p>
              </div>
            ) : (
              <div className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Your Free Trial</h3>
                  <p className="text-gray-600">Get CloudGreet set up in 24 hours. No credit card required.</p>
                </div>

                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <input
                      name="name"
                      type="text"
                      required
                      value={leadData.name}
                      onChange={handleLeadChange}
                      placeholder="Your full name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      name="company"
                      type="text"
                      required
                      value={leadData.company}
                      onChange={handleLeadChange}
                      placeholder="Company name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      name="phone"
                      type="tel"
                      required
                      value={leadData.phone}
                      onChange={handleLeadChange}
                      placeholder="Phone number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      name="email"
                      type="email"
                      required
                      value={leadData.email}
                      onChange={handleLeadChange}
                      placeholder="Email address"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600"
                  >
                    Start Free Trial
                  </button>
                </form>

                <p className="text-xs text-gray-500 text-center mt-4">
                  No spam. We will only contact you about your CloudGreet setup.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

