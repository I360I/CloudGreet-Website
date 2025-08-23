"use client"

import Link from "next/link"
import { useState } from "react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    message: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '', company: '' })
  const [isLeadSubmitted, setIsLeadSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitted(true)
    setTimeout(() => {
      setIsSubmitted(false)
      setFormData({ name: '', company: '', phone: '', email: '', message: '' })
    }, 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLeadSubmitted(true)
    setTimeout(() => {
      setIsLeadSubmitted(false)
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
            <Link href="/demo" className="text-sm font-semibold text-gray-900 hover:text-blue-500">Demo</Link>
            <Link href="/faq" className="text-sm font-semibold text-gray-900 hover:text-blue-500">FAQ</Link>
            <Link href="/contact" className="text-sm font-semibold text-blue-500">Contact</Link>
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
              Contact CloudGreet
            </h1>
            <p className="text-lg text-gray-600 mb-16">
              Have questions about our AI receptionist service? We would love to hear from you.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-16 lg:grid-cols-2">
            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Get in touch</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <span className="text-blue-500 text-xl">📧</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Email Support</h3>
                    <p className="text-gray-600">support@cloudgreet.com</p>
                    <p className="text-sm text-gray-500">We respond within 4 hours during business hours</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <span className="text-blue-500 text-xl">📞</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Phone Support</h3>
                    <p className="text-gray-600">(737) 296-0092</p>
                    <p className="text-sm text-gray-500">Mon-Fri 9am-6pm CST</p>
                    <p className="text-xs text-blue-600 mt-1">Calls handled by CloudGreet AI for demo purposes</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <span className="text-blue-500 text-xl">⚡</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Emergency Setup</h3>
                    <p className="text-gray-600">Need CloudGreet live today?</p>
                    <p className="text-sm text-gray-500">Call us for same-day setup (additional fees may apply)</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3">Ready to get started?</h3>
                <p className="text-gray-600 mb-4">Skip the form and start your free trial now. CloudGreet can be live and answering your calls in 24 hours.</p>
                <button 
                  onClick={() => setShowLeadForm(true)}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 shadow-lg"
                >
                  Start Free Trial
                </button>
                <p className="text-xs text-gray-500 mt-2">No credit card required • 24-hour setup guarantee</p>
              </div>

              {/* Trust Indicators */}
              <div className="mt-8 p-6 bg-gray-50 rounded-2xl">
                <h3 className="font-semibold text-gray-900 mb-4">Why businesses trust CloudGreet</h3>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>500+ service businesses using CloudGreet</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>99.9% uptime guarantee</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>SOC 2 compliant data security</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Average 40% increase in bookings</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h2>
              
              {isSubmitted ? (
                <div className="text-center py-8">
                  <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-green-500 text-2xl">✓</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Message sent successfully!</h3>
                  <p className="text-gray-600">We will get back to you within 4 hours during business hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                        Full Name *
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Smith"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-900 mb-2">
                        Business Name *
                      </label>
                      <input
                        id="company"
                        name="company"
                        type="text"
                        required
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Smith Painting Co."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">
                        Phone Number *
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="(555) 123-4567"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                        Email Address *
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@smithpainting.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
                      How can we help? *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      required
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us about your business and what you need help with. For example: 'We're a painting company that gets 20-30 calls per day but miss about 30% because we're on job sites...'"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-blue-500 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                  >
                    Send Message
                  </button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    By submitting this form, you agree to receive communications from CloudGreet. 
                    We respect your privacy and will never share your information.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* FAQ Preview */}
          <div className="mx-auto mt-24 max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
              Common questions
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="p-6 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-3">How quickly can CloudGreet be set up?</h3>
                <p className="text-gray-600 text-sm">Most customers are live within 24 hours. We handle the technical setup, Google Calendar integration, and AI training for your specific business.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-3">What if I get too many bookings?</h3>
                <p className="text-gray-600 text-sm">You can set daily, weekly, or monthly booking caps. When reached, we politely defer callers to your next available period.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-3">Do you integrate with my existing tools?</h3>
                <p className="text-gray-600 text-sm">Yes! We integrate with Google Calendar, and can connect to most CRM systems, scheduling tools, and payment processors.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-3">What happens during the trial?</h3>
                <p className="text-gray-600 text-sm">We set up CloudGreet for your business, train the AI on your services, and you get 7 days to see how it performs with real calls.</p>
              </div>
            </div>
            <div className="text-center mt-8">
              <Link href="/faq" className="text-blue-500 font-semibold hover:text-blue-600">
                View all frequently asked questions →
              </Link>
            </div>
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

            {isLeadSubmitted ? (
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
