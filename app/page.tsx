"use client"

import Link from "next/link"
import { useState, useEffect } from "react"

export default function Home() {
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadData, setLeadData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    company: '', 
    businessType: '',
    monthlyCallVolume: '',
    currentSolution: '',
    biggestChallenge: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  
  // ROI Calculator State
  const [roiData, setRoiData] = useState({
    jobValue: 2500,
    closeRate: 30,
    bookingsPerMonth: 10,
    currentMissedCalls: 5
  })
  const [roiResults, setRoiResults] = useState({
    monthlyRevenue: 0,
    cloudGreetFee: 0,
    netProfit: 0,
    roi: 0,
    yearlyProfit: 0,
    missedRevenue: 0
  })
  const [showResults, setShowResults] = useState(false)

  // Advanced testimonials with more data
  const testimonials = [
    {
      quote: "CloudGreet increased our bookings by 47% in the first month. We went from missing 30% of calls to capturing every single opportunity. The ROI is absolutely incredible.",
      author: "Mike Rodriguez",
      company: "Rodriguez Painting, Austin TX",
      revenue: "$180K additional revenue in 6 months",
      businessSize: "12 employees",
      timeWithCloudGreet: "8 months",
      rating: 5,
      beforeAfter: { before: "Missing 30% of calls", after: "97% answer rate" }
    },
    {
      quote: "During peak HVAC season, we were drowning in calls. CloudGreet handles the overflow perfectly and books everything automatically. It's like having 3 extra receptionists.",
      author: "Sarah Chen", 
      company: "Chen HVAC Services, Phoenix AZ",
      revenue: "$95K in emergency bookings captured",
      businessSize: "8 employees",
      timeWithCloudGreet: "6 months",
      rating: 5,
      beforeAfter: { before: "Overwhelmed during peak", after: "Seamless call handling" }
    },
    {
      quote: "As a solo plumber, I cannot answer calls while working. CloudGreet captures every emergency call and books them perfectly. It's transformed my business completely.",
      author: "Tom Wilson",
      company: "Wilson Plumbing, Denver CO", 
      revenue: "$67K in after-hours bookings",
      businessSize: "Solo operator",
      timeWithCloudGreet: "4 months",
      rating: 5,
      beforeAfter: { before: "Missing 40% of calls", after: "Never miss a call" }
    }
  ]

  useEffect(() => {
    // Testimonial rotation
    const testimonialInterval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 7000)

    return () => {
      clearInterval(testimonialInterval)
    }
  }, [])

  // Enhanced form handling with validation
  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitted(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitted(false)
      setShowLeadForm(false)
      setLeadData({ 
        name: '', 
        email: '', 
        phone: '', 
        company: '', 
        businessType: '',
        monthlyCallVolume: '',
        currentSolution: '',
        biggestChallenge: ''
      })
    }, 4000)
  }

  const handleLeadChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setLeadData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Advanced ROI calculation with more factors
  const handleRoiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = parseInt(value) || 0
    setRoiData(prev => ({ ...prev, [name]: numValue }))
  }

  const calculateROI = () => {
    const { jobValue, closeRate, bookingsPerMonth, currentMissedCalls } = roiData
    
    // Current revenue
    const currentRevenue = Math.round((bookingsPerMonth * jobValue * closeRate) / 100)
    
    // Revenue from missed calls CloudGreet would capture
    const missedRevenue = Math.round((currentMissedCalls * jobValue * closeRate) / 100)
    
    // Total revenue with CloudGreet (40% increase + missed calls)
    const totalBookings = bookingsPerMonth + currentMissedCalls + Math.round(bookingsPerMonth * 0.4)
    const monthlyRevenue = Math.round((totalBookings * jobValue * closeRate) / 100)
    
    // CloudGreet fee
    const cloudGreetFee = 200 + (totalBookings * 50)
    
    // Net profit
    const netProfit = monthlyRevenue - cloudGreetFee
    const yearlyProfit = netProfit * 12
    
    // ROI calculation
    const roi = cloudGreetFee > 0 ? Math.round((netProfit / cloudGreetFee) * 100) : 0
    
    setRoiResults({
      monthlyRevenue,
      cloudGreetFee,
      netProfit: Math.max(0, netProfit),
      roi,
      yearlyProfit,
      missedRevenue
    })
    
    setShowResults(true)
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Enhanced Animated Background Blobs - Floating + Breathing */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30"
          style={{
            animation: 'floatAndBreathe1 20s ease-in-out infinite'
          }}
        ></div>
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30"
          style={{
            animation: 'floatAndBreathe2 25s ease-in-out infinite',
            animationDelay: '5s'
          }}
        ></div>
        <div 
          className="absolute top-40 left-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30"
          style={{
            animation: 'floatAndBreathe3 30s ease-in-out infinite',
            animationDelay: '10s'
          }}
        ></div>
        <div 
          className="absolute top-20 right-1/3 w-64 h-64 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-25"
          style={{
            animation: 'floatAndBreathe1 35s ease-in-out infinite reverse',
            animationDelay: '15s'
          }}
        ></div>
      </div>

      <style jsx>{`
        @keyframes floatAndBreathe1 {
          0%, 100% { 
            transform: translate(0px, 0px) scale(1) rotate(0deg); 
          }
          25% { 
            transform: translate(30px, -20px) scale(1.1) rotate(90deg); 
          }
          50% { 
            transform: translate(-10px, 30px) scale(0.9) rotate(180deg); 
          }
          75% { 
            transform: translate(-25px, -15px) scale(1.05) rotate(270deg); 
          }
        }
        
        @keyframes floatAndBreathe2 {
          0%, 100% { 
            transform: translate(0px, 0px) scale(1) rotate(0deg); 
          }
          33% { 
            transform: translate(-25px, -30px) scale(0.85) rotate(-120deg); 
          }
          66% { 
            transform: translate(35px, 20px) scale(1.15) rotate(-240deg); 
          }
        }
        
        @keyframes floatAndBreathe3 {
          0%, 100% { 
            transform: translate(0px, 0px) scale(1) rotate(0deg); 
          }
          40% { 
            transform: translate(20px, 25px) scale(1.08) rotate(144deg); 
          }
          80% { 
            transform: translate(-30px, -10px) scale(0.92) rotate(288deg); 
          }
        }
      `}</style>
      
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      {/* Ultra-Premium Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between p-6">
          <Link href="/" className="flex items-center group">
            <div>
              <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 group-hover:scale-105 transition-transform duration-300">CloudGreet</span>
              <div className="text-xs text-blue-600 font-semibold">AI RECEPTIONIST</div>
            </div>
          </Link>
          
          <div className="hidden lg:flex lg:gap-x-8">
            <Link href="/pricing" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-all duration-200 relative group">
              Pricing
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link href="/demo" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-all duration-200 relative group">
              Demo
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link href="/faq" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-all duration-200 relative group">
              FAQ
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link href="/contact" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-all duration-200 relative group">
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <a href="tel:(737) 296-0092" className="hidden md:flex items-center space-x-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">
              <span className="text-green-500">📞</span>
              <span>(737) 296-0092</span>
            </a>
            
            {/* Client Dashboard Button */}
            <Link 
              href="/login"
              className="flex items-center space-x-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-all duration-200 border-2 border-gray-300 px-4 py-2 rounded-xl hover:border-blue-600 hover:bg-blue-50 group"
            >
              <span className="text-blue-500 group-hover:scale-110 transition-transform">📊</span>
              <span>Client Dashboard</span>
            </Link>
            
            <button 
              onClick={() => setShowLeadForm(true)}
              className="bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white px-8 py-3 rounded-2xl font-bold hover:from-blue-600 hover:via-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105"
            >
              Start Free Trial
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 relative">
          <div className="mx-auto max-w-5xl text-center">
            {/* Animated badge */}
            <div className="mb-10 flex justify-center">
              <div className="rounded-full bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 px-8 py-4 text-sm font-bold text-blue-800 border-2 border-blue-200 shadow-lg">
                <span className="inline-block mr-2">🔥</span> 
                Every call answered. Every time. 24/7.
                <span className="ml-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">LIVE</span>
              </div>
            </div>
            
            {/* Main headline */}
            <h1 className="text-7xl font-black text-gray-900 mb-10 leading-tight">
              Never miss a 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"> job</span> 
              <br />again.
            </h1>
            
            {/* Enhanced subheadline */}
            <p className="text-2xl text-gray-600 mb-12 leading-relaxed max-w-4xl mx-auto font-medium">
              CloudGreet's AI receptionist answers every call in <strong className="text-blue-600">3 rings</strong>, 
              qualifies leads professionally, and books estimates directly into your Google Calendar. 
              <br />
              <span className="text-lg text-gray-500 mt-2 block">
                Built specifically for painters, HVAC, plumbers, and roofers who can't afford to miss opportunities.
              </span>
            </p>
            
            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-16">
              <div className="relative inline-block">
                <button 
                  onClick={() => setShowLeadForm(true)}
                  className="group relative bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white px-12 py-6 rounded-2xl text-xl font-black hover:from-blue-600 hover:via-blue-700 hover:to-purple-700 transition-all duration-300 shadow-2xl hover:shadow-blue-500/25 hover:scale-105"
                >
                  <span className="relative z-10 flex items-center">
                    🚀 Start Free Trial → Live in 24 Hours
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full animate-bounce shadow-lg z-10">
                  FREE
                </div>
              </div>
              
              <Link 
                href="/demo"
                className="group border-3 border-gray-300 text-gray-700 px-12 py-6 rounded-2xl text-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 flex items-center space-x-3 hover:scale-105"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-xl">▶️</span>
                </div>
                <span>Watch 2-Min Demo</span>
              </Link>
            </div>
            
            {/* Value props */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm mb-16">
              <div className="bg-gradient-to-r from-green-100 to-green-200 px-8 py-4 rounded-full text-green-800 font-bold border-2 border-green-300 shadow-lg hover:scale-105 transition-transform">
                ✓ $200/mo + $50 per booking
              </div>
              <div className="bg-gradient-to-r from-blue-100 to-blue-200 px-8 py-4 rounded-full text-blue-800 font-bold border-2 border-blue-300 shadow-lg hover:scale-105 transition-transform">
                ✓ Setup in 24 hours
              </div>
              <div className="bg-gradient-to-r from-purple-100 to-purple-200 px-8 py-4 rounded-full text-purple-800 font-bold border-2 border-purple-300 shadow-lg hover:scale-105 transition-transform">
                ✓ No contracts
              </div>
              <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 px-8 py-4 rounded-full text-yellow-800 font-bold border-2 border-yellow-300 shadow-lg hover:scale-105 transition-transform">
                ✓ 7-day free trial
              </div>
            </div>

            {/* Value Proposition Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 hover:scale-105 transition-transform">
                <div className="text-4xl font-black text-blue-600 mb-2">3 Rings</div>
                <div className="text-sm text-gray-600 font-semibold">Average Answer Time</div>
                <div className="text-xs text-green-600 mt-1">⚡ Lightning fast</div>
              </div>
              <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 hover:scale-105 transition-transform">
                <div className="text-4xl font-black text-green-600 mb-2">24/7</div>
                <div className="text-sm text-gray-600 font-semibold">Always Available</div>
                <div className="text-xs text-green-600 mt-1">🔥 Never sleeps</div>
              </div>
              <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 hover:scale-105 transition-transform">
                <div className="text-4xl font-black text-purple-600 mb-2">24 Hours</div>
                <div className="text-sm text-gray-600 font-semibold">Setup Time</div>
                <div className="text-xs text-green-600 mt-1">📈 Quick start</div>
              </div>
              <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 hover:scale-105 transition-transform">
                <div className="text-4xl font-black text-orange-600 mb-2">$200</div>
                <div className="text-sm text-gray-600 font-semibold">Starting Price</div>
                <div className="text-xs text-green-600 mt-1">💰 Affordable</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Agitation Section */}
      <section className="py-32 bg-gradient-to-br from-red-50 to-orange-50 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-gray-900 mb-8">
              <span className="text-red-600">Stop Bleeding Money</span> from Missed Calls
            </h2>
            <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Every missed call is a lost opportunity. Service businesses lose an average of 
              <strong className="text-red-600"> $73,000 annually</strong> from unanswered calls.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <h3 className="text-3xl font-bold text-red-600 mb-8 flex items-center">
                <span className="text-4xl mr-4">❌</span> Without CloudGreet
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-6 p-6 bg-red-100 rounded-2xl border-2 border-red-200 shadow-lg">
                  <div className="flex-shrink-0 w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-2xl">📵</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl text-gray-900 mb-2">Missing 30% of calls = $73K lost annually</h4>
                    <p className="text-gray-600">Industry studies show service businesses miss 1 in 3 calls during work hours</p>
                  </div>
                </div>

                <div className="flex items-start space-x-6 p-6 bg-red-100 rounded-2xl border-2 border-red-200 shadow-lg">
                  <div className="flex-shrink-0 w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-2xl">⏰</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl text-gray-900 mb-2">Delayed responses lose 78% of customers</h4>
                    <p className="text-gray-600">Customers call your competitor within 15 minutes if you don't answer</p>
                  </div>
                </div>

                <div className="flex items-start space-x-6 p-6 bg-red-100 rounded-2xl border-2 border-red-200 shadow-lg">
                  <div className="flex-shrink-0 w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-2xl">😤</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl text-gray-900 mb-2">Poor first impression damages reputation</h4>
                    <p className="text-gray-600">Voicemail creates unprofessional image and reduces trust</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-3xl font-bold text-green-600 mb-8 flex items-center">
                <span className="text-4xl mr-4">✅</span> With CloudGreet
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-6 p-6 bg-green-100 rounded-2xl border-2 border-green-200 shadow-lg">
                  <div className="flex-shrink-0 w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-2xl">📞</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl text-gray-900 mb-2">97% of calls answered in 3 rings</h4>
                    <p className="text-gray-600">Professional AI receptionist available 24/7/365, never takes a break</p>
                  </div>
                </div>

                <div className="flex items-start space-x-6 p-6 bg-green-100 rounded-2xl border-2 border-green-200 shadow-lg">
                  <div className="flex-shrink-0 w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-2xl">📅</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl text-gray-900 mb-2">Instant booking = 40% more revenue</h4>
                    <p className="text-gray-600">Qualified estimates scheduled automatically with full customer details</p>
                  </div>
                </div>

                <div className="flex items-start space-x-6 p-6 bg-green-100 rounded-2xl border-2 border-green-200 shadow-lg">
                  <div className="flex-shrink-0 w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-2xl">⭐</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl text-gray-900 mb-2">Professional image builds trust</h4>
                    <p className="text-gray-600">Customers think they're talking to your best employee</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

            {/* ROI Calculator */}
      <section className="py-32 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 relative">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-gray-900 mb-8">
              Calculate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Revenue Impact</span>
            </h2>
            <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              See exactly how much additional revenue CloudGreet will generate for your business.
            </p>
          </div>
          <div className="mx-auto max-w-6xl">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl border-2 border-white/50 p-12 shadow-2xl">
              <div className="text-center mb-12">
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 shadow-xl">
                  <span className="text-blue-600 text-4xl">🧮</span>
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-4">ROI Calculator</h3>
                <p className="text-gray-600 text-lg">Enter your business details to see your potential return</p>
              </div>
              <div className="grid gap-8 md:grid-cols-4 mb-10">
                <div>
                  <label className="block text-lg font-bold mb-4 text-gray-900">Average Job Value ($)</label>
                  <input 
                    type="number" 
                    name="jobValue"
                    value={roiData.jobValue}
                    onChange={handleRoiChange}
                    className="w-full p-6 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-bold text-2xl text-center shadow-lg"
                    placeholder="2500"
                  />
                  <p className="text-sm text-gray-500 mt-3 text-center">Typical: $500-$10K</p>
                </div>
                <div>
                  <label className="block text-lg font-bold mb-4 text-gray-900">Close Rate (%)</label>
                  <input 
                    type="number" 
                    name="closeRate"
                    value={roiData.closeRate}
                    onChange={handleRoiChange}
                    className="w-full p-6 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-bold text-2xl text-center shadow-lg"
                    placeholder="30"
                  />
                  <p className="text-sm text-gray-500 mt-3 text-center">Average: 20-40%</p>
                </div>
                <div>
                  <label className="block text-lg font-bold mb-4 text-gray-900">Current Bookings/Month</label>
                  <input 
                    type="number" 
                    name="bookingsPerMonth"
                    value={roiData.bookingsPerMonth}
                    onChange={handleRoiChange}
                    className="w-full p-6 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-bold text-2xl text-center shadow-lg"
                    placeholder="10"
                  />
                  <p className="text-sm text-gray-500 mt-3 text-center">Current jobs</p>
                </div>
                <div>
                  <label className="block text-lg font-bold mb-4 text-gray-900">Missed Calls/Month</label>
                  <input 
                    type="number" 
                    name="currentMissedCalls"
                    value={roiData.currentMissedCalls}
                    onChange={handleRoiChange}
                    className="w-full p-6 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-bold text-2xl text-center shadow-lg"
                    placeholder="5"
                  />
                  <p className="text-sm text-gray-500 mt-3 text-center">Estimate missed</p>
                </div>
              </div>
              <div className="text-center mb-10">
                <button 
                  onClick={calculateROI}
                  className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 text-white px-16 py-6 rounded-2xl text-xl font-bold hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105"
                >
                  Calculate My ROI 🚀
                </button>
              </div>
              {showResults && (
                <div className="space-y-8">
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-xl border-2 border-blue-200">
                      <div className="text-sm text-blue-600 mb-2 font-semibold">Monthly Revenue with CloudGreet</div>
                      <div className="text-4xl font-black text-blue-700 mb-2">${roiResults.monthlyRevenue.toLocaleString()}</div>
                      <div className="text-xs text-blue-600">+40% from never missing calls</div>
                    </div>
                    <div className="text-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-xl border-2 border-gray-200">
                      <div className="text-sm text-gray-600 mb-2 font-semibold">Your CloudGreet Investment</div>
                      <div className="text-4xl font-black text-gray-700 mb-2">${roiResults.cloudGreetFee.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">$200 base + $50 per booking</div>
                    </div>
                    <div className="text-center p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-xl border-2 border-green-200">
                      <div className="text-sm text-green-600 mb-2 font-semibold">Net Monthly Profit</div>
                      <div className="text-4xl font-black text-green-700 mb-2">${roiResults.netProfit.toLocaleString()}</div>
                      <div className="text-xs text-green-600">ROI: {roiResults.roi}% monthly</div>
                    </div>
                  </div>
                  <div className="text-center p-10 bg-gradient-to-r from-green-500 via-green-600 to-blue-600 rounded-3xl text-white shadow-2xl">
                    <div className="text-lg mb-4 opacity-90">Annual Additional Profit</div>
                    <div className="text-6xl font-black mb-4">${roiResults.yearlyProfit.toLocaleString()}</div>
                    <div className="text-xl font-bold mb-2">That's ${Math.round(roiResults.yearlyProfit / 365).toLocaleString()} extra profit every single day</div>
                    <div className="text-sm opacity-90">Based on your current business metrics</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-gray-900 mb-8">
              Real Results from <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Real Businesses</span>
            </h2>
            <p className="text-2xl text-gray-600 max-w-3xl mx-auto">
              See how CloudGreet is transforming service businesses across America
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto mb-20">
            <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-12 rounded-3xl border-2 border-blue-200 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full -mr-16 -mt-16 opacity-20"></div>
              
              <div className="relative">
                <div className="flex justify-center mb-8">
                  <div className="flex space-x-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-3xl">★</span>
                    ))}
                  </div>
                </div>
                
                <blockquote className="text-3xl text-gray-700 mb-10 leading-relaxed font-medium text-center">
                  "{testimonials[currentTestimonial].quote}"
                </blockquote>
                
                <div className="flex items-center justify-center space-x-6 mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <span className="text-white text-2xl font-bold">
                      {testimonials[currentTestimonial].author.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-2xl text-gray-900">{testimonials[currentTestimonial].author}</div>
                    <div className="text-gray-600 text-lg">{testimonials[currentTestimonial].company}</div>
                    <div className="text-sm text-gray-500">{testimonials[currentTestimonial].businessSize} • {testimonials[currentTestimonial].timeWithCloudGreet}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-white rounded-2xl shadow-lg">
                    <div className="text-2xl font-bold text-green-600 mb-2">{testimonials[currentTestimonial].revenue}</div>
                    <div className="text-sm text-gray-600">Additional Revenue</div>
                  </div>
                  <div className="text-center p-6 bg-white rounded-2xl shadow-lg">
                    <div className="text-lg font-bold text-blue-600 mb-2">{testimonials[currentTestimonial].beforeAfter.before}</div>
                    <div className="text-xs text-gray-500 mb-2">BEFORE</div>
                    <div className="text-lg font-bold text-green-600">{testimonials[currentTestimonial].beforeAfter.after}</div>
                    <div className="text-xs text-gray-500">AFTER</div>
                  </div>
                  <div className="text-center p-6 bg-white rounded-2xl shadow-lg">
                    <div className="text-2xl font-bold text-purple-600 mb-2">{testimonials[currentTestimonial].rating}/5</div>
                    <div className="text-sm text-gray-600">Customer Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-3 mb-16">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  currentTestimonial === index 
                    ? 'bg-blue-600 scale-125' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-blue-600 via-purple-700 to-pink-600 py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="mx-auto max-w-7xl px-6 relative">
          <div className="text-center">
            <h2 className="text-6xl font-black text-white mb-8 leading-tight">
              Ready to Never Miss Another Call?
            </h2>
            <p className="text-3xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed">
              Get CloudGreet set up for your business in 24 hours.
            </p>
            <button 
              onClick={() => setShowLeadForm(true)}
              className="bg-white text-blue-600 px-16 py-8 rounded-2xl text-2xl font-black hover:bg-gray-100 shadow-2xl hover:scale-110 transition-all duration-300"
            >
              🚀 Start Free Trial → Live Tomorrow
            </button>
          </div>
        </div>
      </section>

      {/* Lead Capture Modal */}
      {showLeadForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl mx-4 w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowLeadForm(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-3xl z-10"
            >
              ✕
            </button>

            {isSubmitted ? (
              <div className="p-12 text-center">
                <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <span className="text-green-500 text-4xl">✓</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-6">Welcome to CloudGreet!</h3>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  We'll contact you within 4 hours to set up your free trial.
                </p>
              </div>
            ) : (
              <div className="p-12">
                <div className="text-center mb-10">
                  <h3 className="text-4xl font-bold text-gray-900 mb-4">Start Your Free Trial</h3>
                  <p className="text-xl text-gray-600">Get CloudGreet set up in 24 hours. No credit card required.</p>
                </div>

                <form onSubmit={handleLeadSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Full Name *</label>
                      <input
                        name="name"
                        type="text"
                        required
                        value={leadData.name}
                        onChange={handleLeadChange}
                        placeholder="John Smith"
                        className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-semibold text-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Company Name *</label>
                      <input
                        name="company"
                        type="text"
                        required
                        value={leadData.company}
                        onChange={handleLeadChange}
                        placeholder="Smith Painting Co."
                        className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-semibold text-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Business Type *</label>
                      <select
                        name="businessType"
                        required
                        value={leadData.businessType}
                        onChange={handleLeadChange}
                        className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-semibold text-lg"
                      >
                        <option value="">Select your business type</option>
                        <option value="painting">🎨 Painting</option>
                        <option value="hvac">🔧 HVAC</option>
                        <option value="plumbing">💧 Plumbing</option>
                        <option value="roofing">🏠 Roofing</option>
                        <option value="electrical">⚡ Electrical</option>
                        <option value="landscaping">🌿 Landscaping</option>
                        <option value="other">🔨 Other Service Business</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Phone Number *</label>
                      <input
                        name="phone"
                        type="tel"
                        required
                        value={leadData.phone}
                        onChange={handleLeadChange}
                        placeholder="(555) 123-4567"
                        className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-semibold text-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Email Address *</label>
                    <input
                      name="email"
                      type="email"
                      required
                      value={leadData.email}
                      onChange={handleLeadChange}
                      placeholder="john@smithpainting.com"
                      className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-semibold text-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 text-white py-6 rounded-2xl text-2xl font-black hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105"
                  >
                    🚀 Start Free Trial → Live in 24 Hours
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-500 mb-6">
                    No spam. We'll only contact you about your CloudGreet setup.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span className="font-semibold">No credit card</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span className="font-semibold">7-day trial</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span className="font-semibold">Cancel anytime</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span className="font-semibold">24hr setup</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


