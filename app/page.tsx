"use client"

import Link from "next/link"
import { useState } from "react"

export default function Home() {
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '', company: '' })
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  // ROI Calculator State
  const [roiData, setRoiData] = useState({
    jobValue: 2500,
    closeRate: 30,
    bookingsPerMonth: 10
  })
  const [roiResults, setRoiResults] = useState({
    monthlyRevenue: 7500,
    cloudGreetFee: 700,
    netProfit: 6800,
    roi: 971
  })

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

  const handleRoiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = parseInt(value) || 0
    setRoiData(prev => ({ ...prev, [name]: numValue }))
    
    // Auto-calculate as user types
    const updatedData = { ...roiData, [name]: numValue }
    calculateROIWithData(updatedData)
  }

  const calculateROI = () => {
    calculateROIWithData(roiData)
  }

  const calculateROIWithData = (data: typeof roiData) => {
    const { jobValue, closeRate, bookingsPerMonth } = data
    
    // Calculate monthly revenue: bookings * job value * close rate / 100
    const monthlyRevenue = Math.round((bookingsPerMonth * jobValue * closeRate) / 100)
    
    // Calculate CloudGreet fee: $200 base + $50 per booking
    const cloudGreetFee = 200 + (bookingsPerMonth * 50)
    
    // Calculate net profit
    const netProfit = monthlyRevenue - cloudGreetFee
    
    // Calculate ROI percentage
    const roi = cloudGreetFee > 0 ? Math.round((netProfit / cloudGreetFee) * 100) : 0
    
    setRoiResults({
      monthlyRevenue,
      cloudGreetFee,
      netProfit: Math.max(0, netProfit),
      roi
    })
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
            <Link href="/pricing" className="text-sm font-semibold text-gray-900 hover:text-blue-500">
              Pricing
            </Link>
            <Link href="/demo" className="text-sm font-semibold text-gray-900 hover:text-blue-500">
              Demo
            </Link>
            <Link href="/faq" className="text-sm font-semibold text-gray-900 hover:text-blue-500">
              FAQ
            </Link>
            <Link href="/contact" className="text-sm font-semibold text-gray-900 hover:text-blue-500">
              Contact
            </Link>
          </div>
          
          <button 
            onClick={() => setShowLeadForm(true)}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600"
          >
            Get Started
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800">
                ✓ Trusted by 500+ service businesses
              </div>
            </div>
            
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Never miss a job again.
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              CloudGreet answers every call and books estimates straight into your Google Calendar. 
              AI receptionist built for painters, HVAC, plumbers, and roofers. Setup in 24 hours.
            </p>
            
            <div className="flex items-center justify-center gap-6 mb-8">
              <button 
                onClick={() => setShowLeadForm(true)}
                className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 shadow-lg"
              >
                Start Free Trial
              </button>
              <Link 
                href="/demo"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50"
              >
                View Demo
              </Link>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <span className="bg-green-100 px-4 py-2 rounded-full text-green-800">
                ✓ $200/mo + $50 per booking
              </span>
              <span className="bg-blue-100 px-4 py-2 rounded-full text-blue-800">
                ✓ Setup in 24 hours
              </span>
              <span className="bg-purple-100 px-4 py-2 rounded-full text-purple-800">
                ✓ No contracts
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-white border-b">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-8">
            <p className="text-sm text-gray-500 mb-4">Trusted by leading service businesses</p>
            <div className="flex items-center justify-center space-x-8 opacity-60">
              <div className="text-2xl font-bold text-gray-400">Rodriguez Painting</div>
              <div className="text-2xl font-bold text-gray-400">Chen HVAC</div>
              <div className="text-2xl font-bold text-gray-400">Wilson Plumbing</div>
              <div className="text-2xl font-bold text-gray-400">Martinez Roofing</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-blue-500 font-semibold mb-2">How It Works</h2>
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Three simple steps to never miss a job
            </h3>
          </div>
          
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="text-center">
              <div className="h-20 w-20 bg-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-white text-3xl">📞</span>
              </div>
              <div className="mb-2">
                <span className="text-blue-500 font-semibold mr-2">Step 1</span>
                <h4 className="text-xl font-bold text-gray-900 inline">We answer calls</h4>
              </div>
              <p className="text-gray-600">AI receptionist handles every call professionally, qualifying leads and gathering job details 24/7.</p>
            </div>
            
            <div className="text-center">
              <div className="h-20 w-20 bg-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-white text-3xl">📅</span>
              </div>
              <div className="mb-2">
                <span className="text-blue-500 font-semibold mr-2">Step 2</span>
                <h4 className="text-xl font-bold text-gray-900 inline">We book estimates</h4>
              </div>
              <p className="text-gray-600">Qualified leads get scheduled directly into your Google Calendar with customer details and job requirements.</p>
            </div>
            
            <div className="text-center">
              <div className="h-20 w-20 bg-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-white text-3xl">📊</span>
              </div>
              <div className="mb-2">
                <span className="text-blue-500 font-semibold mr-2">Step 3</span>
                <h4 className="text-xl font-bold text-gray-900 inline">You get daily summaries</h4>
              </div>
              <p className="text-gray-600">Daily text/email reports show calls handled, bookings made, and revenue generated.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Calculate your ROI
            </h2>
            <p className="text-lg text-gray-600">
              See how much revenue CloudGreet could generate for your business.
            </p>
          </div>
          
          <div className="mx-auto max-w-4xl">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-blue-500 text-2xl">🧮</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">ROI Calculator</h3>
                <p className="text-gray-600 mt-2">Adjust the values below to see your potential return</p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-3 mb-8">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">Average Job Value ($)</label>
                  <input 
                    type="number" 
                    name="jobValue"
                    value={roiData.jobValue}
                    onChange={handleRoiChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    style={{ color: '#111827' }}
                    placeholder="2500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">Close Rate (%)</label>
                  <input 
                    type="number" 
                    name="closeRate"
                    value={roiData.closeRate}
                    onChange={handleRoiChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    style={{ color: '#111827' }}
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">Bookings/Month</label>
                  <input 
                    type="number" 
                    name="bookingsPerMonth"
                    value={roiData.bookingsPerMonth}
                    onChange={handleRoiChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    style={{ color: '#111827' }}
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="text-center mb-8">
                <button 
                  onClick={calculateROI}
                  className="bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 shadow-lg"
                >
                  Calculate ROI
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-600">Est. monthly revenue from CloudGreet bookings:</p>
                    <p className="text-2xl font-bold text-green-600">${roiResults.monthlyRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Your CloudGreet fee:</p>
                    <p className="text-2xl font-bold text-gray-900">${roiResults.cloudGreetFee.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Net profit:</p>
                  <p className="text-3xl font-bold text-green-600">${roiResults.netProfit.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">ROI: {roiResults.roi}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by service professionals
            </h2>
            <p className="text-lg text-gray-600">
              See what business owners are saying about CloudGreet.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="flex mb-4">
                <span className="text-yellow-400 text-xl">★★★★★</span>
              </div>
              <blockquote className="text-gray-600 mb-6">
                &quot;CloudGreet increased our bookings by 40% in the first month. We went from missing calls to never missing an opportunity. The ROI is incredible.&quot;
              </blockquote>
              <div>
                <div className="font-semibold text-gray-900">Mike Rodriguez</div>
                <div className="text-sm text-gray-500">Rodriguez Painting, Austin TX</div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="flex mb-4">
                <span className="text-yellow-400 text-xl">★★★★★</span>
              </div>
              <blockquote className="text-gray-600 mb-6">
                &quot;During peak HVAC season, we were drowning in calls. CloudGreet handles the overflow perfectly and books everything automatically.&quot;
              </blockquote>
              <div>
                <div className="font-semibold text-gray-900">Sarah Chen</div>
                <div className="text-sm text-gray-500">Chen HVAC Services, Phoenix AZ</div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="flex mb-4">
                <span className="text-yellow-400 text-xl">★★★★★</span>
              </div>
              <blockquote className="text-gray-600 mb-6">
                &quot;As a solo plumber, I cannot answer calls while working. CloudGreet captures every emergency call and books them perfectly.&quot;
              </blockquote>
              <div>
                <div className="font-semibold text-gray-900">Tom Wilson</div>
                <div className="text-sm text-gray-500">Wilson Plumbing, Denver CO</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why service businesses choose CloudGreet
            </h2>
            <p className="text-lg text-gray-600">
              Built specifically for trades who cannot afford to miss calls.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="p-8 bg-white border rounded-2xl shadow-sm">
              <div className="h-16 w-16 bg-blue-100 rounded-lg mb-6 flex items-center justify-center">
                <span className="text-2xl">📵</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Stop losing leads to voicemail</h3>
              <p className="text-gray-600">Every missed call is money lost. We answer 24/7 so you never miss an opportunity.</p>
            </div>
            
            <div className="p-8 bg-white border rounded-2xl shadow-sm">
              <div className="h-16 w-16 bg-blue-100 rounded-lg mb-6 flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Booked into Google Calendar</h3>
              <p className="text-gray-600">Qualified estimates appear automatically with details.</p>
            </div>
            
            <div className="p-8 bg-white border rounded-2xl shadow-sm">
              <div className="h-16 w-16 bg-blue-100 rounded-lg mb-6 flex items-center justify-center">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Spam filtering</h3>
              <p className="text-gray-600">We filter out spam calls so you only get real opportunities.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Focus */}
      <section className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Built for your industry
            </h2>
            <p className="text-lg text-gray-600">
              CloudGreet understands the unique needs of service businesses.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="p-8 bg-white border rounded-2xl shadow-sm">
              <div className="h-16 w-16 bg-blue-100 rounded-lg mb-6 flex items-center justify-center">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Painters</h3>
              <p className="text-lg font-medium text-blue-500 mb-3">We fill your calendar with estimates.</p>
              <p className="text-gray-600">Interior, exterior, commercial painting jobs booked automatically.</p>
            </div>
            
            <div className="p-8 bg-white border rounded-2xl shadow-sm">
              <div className="h-16 w-16 bg-blue-100 rounded-lg mb-6 flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">HVAC</h3>
              <p className="text-lg font-medium text-blue-500 mb-3">Peak season overflow? We have got it.</p>
              <p className="text-gray-600">Emergency repairs, maintenance, and installation appointments.</p>
            </div>
            
            <div className="p-8 bg-white border rounded-2xl shadow-sm">
              <div className="h-16 w-16 bg-blue-100 rounded-lg mb-6 flex items-center justify-center">
                <span className="text-2xl">💧</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Plumbers</h3>
              <p className="text-lg font-medium text-blue-500 mb-3">Never miss same-day jobs.</p>
              <p className="text-gray-600">Emergency calls, repairs, and scheduled maintenance bookings.</p>
            </div>
            
            <div className="p-8 bg-white border rounded-2xl shadow-sm">
              <div className="h-16 w-16 bg-blue-100 rounded-lg mb-6 flex items-center justify-center">
                <span className="text-2xl">🏠</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Roofers</h3>
              <p className="text-lg font-medium text-blue-500 mb-3">Every estimate is money on the table.</p>
              <p className="text-gray-600">Storm damage, repairs, and full roof replacement estimates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-blue-500 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Live by tomorrow. No Zoom calls.
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Setup takes 24 hours. Start capturing every lead immediately.
            </p>
            <button 
              onClick={() => setShowLeadForm(true)}
              className="bg-white text-blue-500 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100"
            >
              Get Started Now
            </button>
            <p className="mt-4 text-sm text-blue-100">
              $200/mo + $50 per booking • No contracts • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-white border-t">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-center space-x-8 text-gray-400">
            <div className="flex items-center space-x-2">
              <span className="text-green-500">🔒</span>
              <span className="text-sm">SSL Secured</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-500">💳</span>
              <span className="text-sm">Stripe Payments</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-purple-500">📞</span>
              <span className="text-sm">24/7 Support</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-orange-500">⚡</span>
              <span className="text-sm">99.9% Uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">CG</span>
              </div>
              <span className="text-xl font-bold text-gray-900">CloudGreet</span>
            </div>
          </div>
          <div className="flex justify-center space-x-8 mb-8">
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
            <Link href="/demo" className="text-gray-600 hover:text-gray-900">Demo</Link>
            <Link href="/faq" className="text-gray-600 hover:text-gray-900">FAQ</Link>
            <Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
          </div>
          <p className="text-center text-gray-500 text-sm">
            © 2024 CloudGreet. All rights reserved. Powered by AI.
          </p>
        </div>
      </footer>

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
                <p className="text-gray-600">We will contact you within 24 hours to set up your free trial.</p>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      style={{ color: '#111827' }}
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      style={{ color: '#111827' }}
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      style={{ color: '#111827' }}
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      style={{ color: '#111827' }}
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


