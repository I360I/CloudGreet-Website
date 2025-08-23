"use client"

import Link from "next/link"
import { useState } from "react"

export default function DemoPage() {
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '', company: '' })
  const [isSubmitted, setIsSubmitted] = useState(false)

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
            <Link href="/demo" className="text-sm font-semibold text-blue-500">Demo</Link>
            <Link href="/faq" className="text-sm font-semibold text-gray-900 hover:text-blue-500">FAQ</Link>
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
              See CloudGreet in Action
            </h1>
            <p className="text-lg text-gray-600 mb-16">
              Experience how CloudGreet handles real customer calls and books estimates automatically.
            </p>
          </div>

          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
              How CloudGreet works for your business
            </h2>
            
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
              <div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl border border-blue-200">
                  <div className="flex items-center mb-6">
                    <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                      <span className="text-white text-xl">📞</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Live Call Handling</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">C</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">&quot;Hi, I need someone to paint my living room...&quot;</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-500 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-500">AI</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white">&quot;Great! I can help you schedule an estimate. What is the square footage?&quot;</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">C</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">&quot;About 300 square feet. When can someone come out?&quot;</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-500 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-500">AI</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white">&quot;I have availability tomorrow at 2 PM or Thursday at 10 AM. Which works better?&quot;</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl border border-green-200">
                  <div className="flex items-center mb-6">
                    <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                      <span className="text-white text-xl">📅</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Automatic Booking</h3>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="border-l-4 border-green-500 pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">Painting Estimate</h4>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Confirmed</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Tomorrow, 2:00 PM - 3:00 PM</p>
                      <div className="space-y-1 text-xs text-gray-500">
                        <p><strong>Customer:</strong> Sarah Johnson</p>
                        <p><strong>Phone:</strong> (555) 123-4567</p>
                        <p><strong>Address:</strong> 123 Main St, Austin TX</p>
                        <p><strong>Project:</strong> Living room painting (300 sq ft)</p>
                        <p><strong>Notes:</strong> Interior paint, neutral colors preferred</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <span className="text-sm text-green-700 font-medium">✓ Automatically added to Google Calendar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-24 max-w-2xl">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white text-center">
              <h2 className="text-3xl font-bold mb-4">
                Want to see CloudGreet handle YOUR calls?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                We can set up a live demo with your actual business information.
              </p>
              <button 
                onClick={() => setShowLeadForm(true)}
                className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 shadow-lg"
              >
                Schedule Live Demo
              </button>
              <p className="mt-4 text-sm text-blue-100">
                15-minute setup call • See real calls handled • No commitment required
              </p>
            </div>
          </div>

          <div className="mx-auto mt-24 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to never miss another call?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Join 500+ service businesses using CloudGreet to capture every lead.
            </p>
            <button 
              onClick={() => setShowLeadForm(true)}
              className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 shadow-lg"
            >
              Start Free Trial
            </button>
            <p className="mt-4 text-sm text-gray-500">
              Setup in 24 hours • No credit card required • Cancel anytime
            </p>
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
                <p className="text-gray-600">We will contact you within 4 hours to set up your demo.</p>
              </div>
            ) : (
              <div className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Schedule Your Demo</h3>
                  <p className="text-gray-600">See CloudGreet handle calls for your specific business.</p>
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
                    Schedule Demo
                  </button>
                </form>

                <p className="text-xs text-gray-500 text-center mt-4">
                  15-minute call to see CloudGreet in action with your business.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

