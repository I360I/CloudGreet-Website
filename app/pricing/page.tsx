"use client"

import Link from "next/link"
import { useState } from "react"

export default function PricingPage() {
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
            <Link href="/pricing" className="text-sm font-semibold text-blue-500">Pricing</Link>
            <Link href="/demo" className="text-sm font-semibold text-gray-900 hover:text-blue-500">Demo</Link>
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

          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              One plan that scales with your business. No hidden fees, no contracts.
            </p>
            <div className="inline-flex items-center bg-green-100 px-4 py-2 rounded-full text-green-800 text-sm font-medium mb-16">
              <span className="mr-2">🎉</span>
              Free 7-day trial • No credit card required
            </div>
          </div>

          <div className="mx-auto max-w-2xl">
            <div className="bg-white p-8 border-2 border-blue-500 rounded-3xl shadow-2xl relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-medium">
                  Most Popular Plan
                </div>
              </div>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">CloudGreet Pro</h2>
                
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold text-gray-900">$200</span>
                  <span className="text-lg text-gray-600">/month</span>
                </div>
                
                <div className="mb-6">
                  <span className="text-3xl font-bold text-blue-500">+ $50</span>
                  <span className="text-lg text-gray-600"> per successful booking</span>
                </div>
                
                <p className="text-gray-600 mb-8">
                  Complete AI receptionist service for service businesses
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="text-center mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Everything included:</h3>
                </div>
                
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">✓</span>
                    <div>
                      <span className="text-gray-900 font-medium">24/7 AI receptionist</span>
                      <p className="text-sm text-gray-500">Never miss a call, even during busy work hours</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">✓</span>
                    <div>
                      <span className="text-gray-900 font-medium">Automatic Google Calendar booking</span>
                      <p className="text-sm text-gray-500">Qualified leads scheduled instantly with full details</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">✓</span>
                    <div>
                      <span className="text-gray-900 font-medium">Daily summary reports</span>
                      <p className="text-sm text-gray-500">Text and email reports with call analytics and ROI</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">✓</span>
                    <div>
                      <span className="text-gray-900 font-medium">Smart spam filtering</span>
                      <p className="text-sm text-gray-500">Only pay for real, qualified customer bookings</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">✓</span>
                    <div>
                      <span className="text-gray-900 font-medium">Brand-matched conversation</span>
                      <p className="text-sm text-gray-500">AI trained on your business voice and services</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">✓</span>
                    <div>
                      <span className="text-gray-900 font-medium">Booking capacity controls</span>
                      <p className="text-sm text-gray-500">Set daily/weekly limits to prevent overload</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">✓</span>
                    <div>
                      <span className="text-gray-900 font-medium">24-hour setup guarantee</span>
                      <p className="text-sm text-gray-500">Live and answering calls within one business day</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">✓</span>
                    <div>
                      <span className="text-gray-900 font-medium">No contracts or commitments</span>
                      <p className="text-sm text-gray-500">Cancel anytime with 30 days notice</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button 
                  onClick={() => setShowLeadForm(true)}
                  className="w                <button 
                  onClick={() => setShowLeadForm(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:from-blue-600 hover:to-blue-700 mb-3 shadow-lg"
                >
                  Start Free Trial
                </button>
                <p className="text-sm text-gray-500">
                  7-day free trial • No credit card required • Setup in 24 hours
                </p>
              </div>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="mx-auto mt-24 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why CloudGreet delivers incredible ROI</h2>
              <p className="text-lg text-gray-600">Most service businesses see a 300-500% return on investment</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-2">40%</div>
                <div className="font-semibold text-gray-900 mb-2">More Bookings</div>
                <p className="text-sm text-gray-600">Average increase in scheduled estimates when you never miss calls</p>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
                <div className="text-3xl font-bold text-blue-600 mb-2">$6,800</div>
                <div className="font-semibold text-gray-900 mb-2">Monthly Profit</div>
                <p className="text-sm text-gray-600">Typical net profit after CloudGreet fees (based on $2,500 avg job value)</p>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200">
                <div className="text-3xl font-bold text-purple-600 mb-2">24hrs</div>
                <div className="font-semibold text-gray-900 mb-2">Setup Time</div>
                <p className="text-sm text-gray-600">From signup to answering your first call - guaranteed</p>
              </div>
            </div>
          </div>

          {/* Pricing Comparison */}
          <div className="mx-auto mt-24 max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
              Compare your options
            </h2>
            
            <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Solution</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Monthly Cost</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Setup Time</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">24/7 Coverage</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Auto Booking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="bg-blue-50">
                    <td className="px-6 py-4 font-semibold text-blue-900">CloudGreet AI</td>
                    <td className="px-6 py-4 text-center text-blue-900 font-semibold">$200 + $50/booking</td>
                    <td className="px-6 py-4 text-center text-blue-900 font-semibold">24 hours</td>
                    <td className="px-6 py-4 text-center"><span className="text-green-500 text-xl">✓</span></td>
                    <td className="px-6 py-4 text-center"><span className="text-green-500 text-xl">✓</span></td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-900">Traditional Receptionist</td>
                    <td className="px-6 py-4 text-center text-gray-600">$3,000 - $5,000</td>
                    <td className="px-6 py-4 text-center text-gray-600">2-4 weeks</td>
                    <td className="px-6 py-4 text-center"><span className="text-red-500 text-xl">✗</span></td>
                    <td className="px-6 py-4 text-center"><span className="text-red-500 text-xl">✗</span></td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-900">Answering Service</td>
                    <td className="px-6 py-4 text-center text-gray-600">$200 - $800</td>
                    <td className="px-6 py-4 text-center text-gray-600">1-2 weeks</td>
                    <td className="px-6 py-4 text-center"><span className="text-green-500 text-xl">✓</span></td>
                    <td className="px-6 py-4 text-center"><span className="text-red-500 text-xl">✗</span></td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-900">Voicemail Only</td>
                    <td className="px-6 py-4 text-center text-gray-600">$20 - $50</td>
                    <td className="px-6 py-4 text-center text-gray-600">Instant</td>
                    <td className="px-6 py-4 text-center"><span className="text-red-500 text-xl">✗</span></td>
                    <td className="px-6 py-4 text-center"><span className="text-red-500 text-xl">✗</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing FAQ */}
          <div className="mx-auto mt-24 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
              Pricing questions answered
            </h2>
            <div className="space-y-8">
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What exactly counts as a booking?</h3>
                <p className="text-gray-600">A booking is when we successfully schedule an estimate or service appointment in your calendar with a qualified customer who provided contact information and job details. We do not charge for spam calls, wrong numbers, or unqualified inquiries.</p>
              </div>
              
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Are there any setup fees or hidden costs?</h3>
                <p className="text-gray-600">No setup fees, no hidden costs. You only pay the monthly base fee ($200) plus per-booking fees ($50 each). Your first month is prorated based on your start date. Cancel anytime with 30 days notice.</p>
              </div>
              
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What if I get too many bookings?</h3>
                <p className="text-gray-600">You can set daily, weekly, or monthly booking limits to ensure you are not overwhelmed. When you reach your cap, we will politely defer additional callers to your next available period or take their information for future scheduling.</p>
              </div>
              
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">How does the 7-day free trial work?</h3>
                <p className="text-gray-600">We set up CloudGreet for your business completely free. You get 7 full days to see how it performs with real calls. If you are not satisfied, simply cancel before the trial ends - no charges, no questions asked.</p>
              </div>
              
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Can I pause service during slow periods?</h3>
                <p className="text-gray-600">Yes, you can pause service anytime (for vacations, slow seasons, etc.) and resume when ready. We will prorate your monthly fee accordingly. Just give us 24 hours notice to redirect your calls properly.</p>
              </div>
              
              <div className="pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What payment methods do you accept?</h3>
                <p className="text-gray-600">We accept all major credit cards and ACH bank transfers. Payments are processed securely through Stripe. You will receive detailed invoices showing your monthly fee and per-booking charges.</p>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="mx-auto mt-24 max-w-2xl text-center">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-4">
                Ready to never miss another job?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Join 500+ service businesses using CloudGreet to capture every lead.
              </p>
              <button 
                onClick={() => setShowLeadForm(true)}
                className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 shadow-lg"
              >
                Start Free Trial
              </button>
              <p className="mt-4 text-sm text-blue-100">
                No credit card required • Live in 24 hours • Cancel anytime
              </p>
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

