"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
// import { useSession } from 'next-auth/react'
// import { useRouter } from 'next/navigation'
import { 
  Zap, Phone, MessageSquare, Calendar, Users, Shield, 
  CheckCircle, ArrowRight, Play, Star, TrendingUp,
  BarChart3, Clock, Globe, Award, ChevronRight,
  Sparkles, Target, Rocket, Heart, ThumbsUp,
  ArrowUpRight, Download, ExternalLink, Menu, X,
  Brain, Bot, Mic, Headphones, Smartphone, Laptop,
  DollarSign, Percent, Timer, Volume2, Wifi, Lock,
  Eye, Settings, Server, Cpu,
  Activity, BarChart, PieChart, LineChart, TrendingDown,
  AlertTriangle, CheckCircle2, XCircle, Info, Lightbulb,
  Gift, Crown, Flame, Zap as Lightning, Moon, Sun
} from 'lucide-react'

export default function LandingPage() {
  // Removed session logic to fix event handlers error
  // const router = useRouter()
  const [activeTab, setActiveTab] = useState('features')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  
  // ROI Calculator state
  const [roiInputs, setRoiInputs] = useState({
    monthlyCalls: 200,
    averageJobPrice: 500,
    closingRate: 25,
    missedCalls: 30
  })

  const [roiResults, setRoiResults] = useState({
    currentCost: 0,
    missedRevenue: 0,
    cloudgreetTotalCost: 0,
    monthlySavings: 0,
    annualSavings: 0,
    roiPercentage: 0
  })

  // Show landing page immediately
  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Animation effects - removed since we're not using session

  // ROI Calculator function
  const updateROI = React.useCallback(() => {
    const { monthlyCalls, averageJobPrice, closingRate, missedCalls } = roiInputs

    const missedCallCount = missedCalls
    const missedRevenue = (missedCallCount * closingRate / 100) * averageJobPrice
    const totalBookings = (monthlyCalls * closingRate / 100)
    const cloudgreetCost = 200 + (totalBookings * 50)
    const missedCallBookings = (missedCallCount * closingRate / 100)
    const missedCallBookingFees = missedCallBookings * 50
    const monthlySavings = missedRevenue - missedCallBookingFees
    const annualSavings = monthlySavings * 12
    const roiPercentage = Math.round((monthlySavings / 200) * 100)

    setRoiResults({
      currentCost: 0,
      missedRevenue,
      cloudgreetTotalCost: cloudgreetCost,
      monthlySavings,
      annualSavings,
      roiPercentage
    })
  }, [roiInputs])

  const handleInputChange = (field: string, value: string) => {
    const numericValue = parseFloat(value) || 0
    setRoiInputs(prev => ({
      ...prev,
      [field]: numericValue
    }))
  }

  React.useEffect(() => {
    updateROI()
  }, [updateROI])

  const features = [
    {
      icon: Brain,
      title: 'Industry-Specific AI',
      description: 'AI trained specifically for HVAC, Roofing, and Painting contractors',
      color: 'blue',
      benefits: ['Knows your industry', 'Emergency detection', 'Seasonal awareness', 'Compliance knowledge'],
      stats: '99.9% accuracy'
    },
    {
      icon: Phone,
      title: 'Emergency Call Priority',
      description: 'Never miss urgent calls - AI detects emergencies and prioritizes scheduling',
      color: 'red',
      benefits: ['Emergency detection', 'Priority scheduling', 'Urgent response', '24/7 availability'],
      stats: '0.2s response time'
    },
    {
      icon: Calendar,
      title: 'Smart Job Scheduling',
      description: 'Intelligent scheduling that considers weather, season, and job complexity',
      color: 'green',
      benefits: ['Weather-aware scheduling', 'Seasonal optimization', 'Job complexity matching', 'Travel time calculation'],
      stats: '95% booking rate'
    },
    {
      icon: BarChart,
      title: 'Contractor Analytics',
      description: 'Track job completion rates, customer satisfaction, and revenue per job',
      color: 'orange',
      benefits: ['Job tracking', 'Customer satisfaction', 'Revenue per job', 'Performance metrics'],
      stats: '40% revenue boost'
    },
    {
      icon: Shield,
      title: 'Compliance Ready',
      description: 'Built-in compliance tracking for permits, certifications, and safety standards',
      color: 'indigo',
      benefits: ['Permit tracking', 'Certification management', 'Safety compliance', 'Documentation'],
      stats: '100% compliant'
    },
    {
      icon: Zap,
      title: 'Quick Contractor Setup',
      description: 'Get your AI assistant running in under 24 hours - no technical skills needed',
      color: 'yellow',
      benefits: ['24-hour setup', 'No technical skills', 'Industry templates', '24/7 support'],
      stats: '24hr setup'
    }
  ]

  const benefits = [
    'Never miss emergency calls - even at 2 AM',
    'Handle seasonal demand spikes automatically',
    'Book jobs while you\'re on other jobs',
    'Professional customer service 24/7',
    'Track job completion and customer satisfaction',
    'Compliance and permit management built-in'
  ]

  const problemSolutions = [
    {
      problem: 'Missing emergency calls at night',
      solution: 'AI detects emergencies and schedules urgent jobs immediately',
      icon: XCircle,
      color: 'red'
    },
    {
      problem: 'Can\'t book jobs while on other jobs',
      solution: 'AI books new jobs while you\'re working - never miss opportunities',
      icon: CheckCircle2,
      color: 'green'
    },
    {
      problem: 'Seasonal demand overwhelms staff',
      solution: 'AI handles peak season calls automatically - no hiring needed',
      icon: DollarSign,
      color: 'blue'
    },
    {
      problem: 'Weather delays and rescheduling',
      solution: 'Smart scheduling considers weather and automatically reschedules',
      icon: Calendar,
      color: 'purple'
    }
  ]

  const stats = [
    { number: '99.9%', label: 'Emergency Call Answer Rate', icon: Phone },
    { number: '0.2s', label: 'Response Time', icon: Timer },
    { number: '40%', label: 'Revenue Increase', icon: TrendingUp },
    { number: '24/7', label: 'Availability', icon: Clock }
  ]

  const pricingPlans = [
    {
      name: 'CloudGreet Pro',
      price: '$200',
      period: '/month',
      description: 'Complete AI receptionist solution for growing businesses',
      features: [
        'Unlimited calls handled',
        'Advanced AI conversation engine',
        'Automatic appointment scheduling',
        '24/7 availability guarantee',
        'Plus $50 per booking scheduled',
        'Customer management system',
        'Real-time analytics dashboard',
        'Priority support & onboarding',
        'Custom business hours',
        'Multi-language support'
      ],
      popular: true,
      cta: 'Get Started',
      badge: 'Most Popular'
    }
  ]


  // Removed loading state check to fix errors

  // Removed session check to fix errors

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-purple-200 rounded-full opacity-30 blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-pink-200 rounded-full opacity-25 blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-200 rounded-full opacity-20 blur-3xl animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="w-full p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                CloudGreet
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Features</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Pricing</a>
              <a href="#roi" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">ROI Calculator</a>
              <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">About</a>
            </nav>

            <div className="flex items-center space-x-4">
              <Link 
                href="/login" 
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link 
                href="/onboarding/streamlined" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Get Started
              </Link>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 p-4 bg-white rounded-xl shadow-lg border">
              <nav className="flex flex-col space-y-3">
                <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Features</a>
                <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Pricing</a>
                <a href="#roi" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">ROI Calculator</a>
                <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">About</a>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-6 relative z-10 min-h-[80vh] flex items-center">
        <div className="max-w-7xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Badge */}
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-blue-800 font-semibold mb-8 border border-blue-200">
              <Crown className="w-5 h-5 mr-2" />
              Built for HVAC, Roofing & Painting Contractors
            </div>

            <div className="relative mb-8">
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-8 leading-[1.1] tracking-tight">
                <span className="block">Get Your Own</span>
                <span className="relative block">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent relative">
                    AI Voice Assistant
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  </span>
                </span>
              </h1>
            </div>
            
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-700 mb-16 max-w-5xl mx-auto leading-relaxed font-medium text-center">
              Built specifically for <span className="text-blue-600 font-bold">HVAC, Roofing, and Painting contractors</span>. Get your own AI voice assistant that knows your industry, handles emergency calls, and books jobs <span className="text-green-600 font-bold">24/7</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Link
                  href="/onboarding/streamlined" 
                  className="group bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-8 sm:px-12 lg:px-16 py-4 sm:py-6 rounded-3xl font-black text-lg sm:text-xl lg:text-2xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 shadow-2xl inline-flex items-center relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <Rocket className="w-8 h-8 mr-4 relative z-10" />
                  <span className="relative z-10">Get Started</span>
                  <ArrowRight className="w-8 h-8 ml-4 relative z-10 group-hover:translate-x-2 transition-transform duration-300" />
                </Link>
                
              </div>
              <div className="flex items-center space-x-4 text-gray-700 hover:text-blue-600 transition-colors duration-300 cursor-pointer group">
                <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300">
                  <Play className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <div className="font-bold text-lg">Watch Demo</div>
                  <div className="text-sm text-gray-500">See the magic in action</div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
              {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <div key={index} className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50 text-center transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-3xl font-black text-gray-900 mb-1">{stat.number}</div>
                    <div className="text-gray-600 font-semibold text-sm">{stat.label}</div>
                  </div>
                )
              })}
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-gray-500">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="font-medium">Enterprise Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <span className="font-medium">24-Hour Setup</span>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-red-500" />
                <span className="font-medium">24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section id="roi" className="py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 blur-2xl rounded-full"></div>
              <h2 className="relative text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 mb-8 leading-tight">
                <span className="block">Calculate Your</span>
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  Money-Making ROI
                </span>
              </h2>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto font-medium">
              See exactly how much <span className="text-blue-600 font-bold">extra revenue</span> CloudGreet will generate for your business.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Calculator Inputs */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Your Business Metrics</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Monthly Calls Received
                  </label>
                  <input
                    type="number"
                    value={roiInputs.monthlyCalls}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-gray-900 bg-white placeholder-gray-500"
                    onChange={(e) => handleInputChange('monthlyCalls', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Average Job Price ($)
                  </label>
                  <input
                    type="number"
                    value={roiInputs.averageJobPrice}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-gray-900 bg-white placeholder-gray-500"
                    onChange={(e) => handleInputChange('averageJobPrice', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Closing Rate (%)
                  </label>
                  <input
                    type="number"
                    value={roiInputs.closingRate}
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-gray-900 bg-white placeholder-gray-500"
                    onChange={(e) => handleInputChange('closingRate', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Missed Calls per Month
                  </label>
                  <input
                    type="number"
                    value={roiInputs.missedCalls}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-gray-900 bg-white placeholder-gray-500"
                    onChange={(e) => handleInputChange('missedCalls', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ROI Results */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
              <h3 className="text-2xl font-bold mb-8">Your ROI with CloudGreet</h3>
              
              <div className="space-y-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-100">Missed Call Revenue Loss</span>
                    <span className="text-2xl font-bold">${roiResults.missedRevenue.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-blue-200">Lost opportunities per month</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-100">Total Bookings Generated</span>
                    <span className="text-2xl font-bold">{Math.round((roiInputs.monthlyCalls * roiInputs.closingRate / 100))}</span>
                  </div>
                  <div className="text-sm text-blue-200">
                    {roiInputs.monthlyCalls} calls × {roiInputs.closingRate}% closing rate
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-100">CloudGreet Monthly Cost</span>
                    <span className="text-2xl font-bold">${roiResults.cloudgreetTotalCost.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-blue-200">
                    $200 base + $50 per booking ({Math.round((roiInputs.monthlyCalls * roiInputs.closingRate / 100))} bookings)
                  </div>
                </div>

                <div className="border-t border-white/20 pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-semibold">Monthly Revenue Gain</span>
                    <span className="text-3xl font-bold">${roiResults.monthlySavings.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-blue-200">Additional revenue from capturing missed calls</div>
                </div>

                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-semibold">Annual Revenue Gain</span>
                    <span className="text-3xl font-bold">${roiResults.annualSavings.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-blue-200">ROI: {roiResults.roiPercentage}%</div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <Link 
                  href="/onboarding/streamlined" 
                  className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-xl inline-flex items-center"
                >
                  Start Saving Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem-Solution Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-red-50 to-orange-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              The Problems You're
              <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent block">
                Facing Right Now
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every service business struggles with these issues. CloudGreet solves them all.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {problemSolutions.map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-red-600 font-bold text-lg mb-2">{item.problem}</div>
                      <div className="text-gray-700 text-lg font-medium">{item.solution}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Everything You Need to
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                Dominate Your Market
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Advanced AI technology that gives you the competitive edge you need to grow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group relative overflow-hidden">
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    {feature.stats}
                  </div>
                  <div className={`w-16 h-16 bg-gradient-to-br from-${feature.color}-500 to-${feature.color}-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-center text-sm text-gray-500">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-900 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="mb-12">
            <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-white font-semibold mb-8 border border-white/30">
              <Play className="w-5 h-5 mr-2" />
              See CloudGreet in Action
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
              Watch Your AI Receptionist
              <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Handle Real Calls
              </span>
            </h2>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              See exactly how CloudGreet answers calls, books appointments, and handles emergencies - all while you're busy with other jobs.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Demo Video Coming Soon</h3>
                  <p className="text-white/70">Watch a real call being handled by CloudGreet AI</p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <div className="font-bold text-lg mb-2">Real Call Handling</div>
              <div className="text-white/80">See how AI answers and processes calls</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div className="font-bold text-lg mb-2">Smart Scheduling</div>
              <div className="text-white/80">Watch AI book appointments automatically</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div className="font-bold text-lg mb-2">Emergency Detection</div>
              <div className="text-white/80">See how AI prioritizes urgent calls</div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Trusted by <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">500+ Contractors</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See how CloudGreet is transforming service businesses across the country.
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  M
                </div>
                <div className="ml-4">
                  <h4 className="font-bold text-gray-900">Mike Rodriguez</h4>
                  <p className="text-gray-600">HVAC Solutions LLC</p>
                </div>
              </div>
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 leading-relaxed">
                "CloudGreet has been a game-changer for my HVAC business. I went from missing 30% of calls to capturing every single one. My revenue increased by 45% in just 3 months."
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  S
                </div>
                <div className="ml-4">
                  <h4 className="font-bold text-gray-900">Sarah Chen</h4>
                  <p className="text-gray-600">Elite Painting Co.</p>
                </div>
              </div>
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 leading-relaxed">
                "The AI handles my painting estimates perfectly. It knows my pricing, availability, and even asks the right questions about project scope. My customers love the professional experience."
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  D
                </div>
                <div className="ml-4">
                  <h4 className="font-bold text-gray-900">David Thompson</h4>
                  <p className="text-gray-600">Thompson Roofing</p>
                </div>
              </div>
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 leading-relaxed">
                "Emergency calls were killing me - I'd miss them at night and lose customers. CloudGreet detects emergencies instantly and schedules urgent repairs. It's saved my business."
              </p>
            </div>
          </div>

          {/* Case Study */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white">
            <div className="max-w-4xl mx-auto text-center">
              <h3 className="text-3xl font-bold mb-6">Case Study: Metro HVAC Services</h3>
              <p className="text-xl text-blue-100 mb-8">
                See how Metro HVAC increased their booking rate by 67% and revenue by $180,000 in 6 months.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-300 mb-2">67%</div>
                  <div className="text-blue-100">Increase in Booking Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-300 mb-2">$180K</div>
                  <div className="text-blue-100">Additional Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-300 mb-2">24/7</div>
                  <div className="text-blue-100">Call Coverage</div>
                </div>
              </div>
              <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-xl">
                Read Full Case Study
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Simple, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Transparent Pricing</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              One plan. All features. No hidden fees. Get started today.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-lg">
              {pricingPlans.map((plan, index) => (
                <div key={index} className={`bg-white rounded-3xl p-10 shadow-2xl border-2 ${
                  plan.popular ? 'border-blue-500 relative' : 'border-gray-100'
                }`}>
                {plan.popular && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg">
                    {plan.badge}
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">{plan.name}</h3>
                  <div className="text-6xl font-black text-gray-900 mb-2">
                    {plan.price}
                    <span className="text-2xl text-gray-600">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 text-lg">{plan.description}</p>
                </div>

                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link 
                  href="/onboarding/streamlined" 
                  className={`block w-full text-center py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-200 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 shadow-xl'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>

                <div className="text-center mt-6">
                  <p className="text-sm text-gray-500">Professional setup • 24-hour activation</p>
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">30-Day Money-Back Guarantee</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Not satisfied? Get a full refund within 30 days, no questions asked.
                    </p>
                  </div>
                </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="mb-8">
            <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-white font-semibold mb-8 border border-white/30">
              <Gift className="w-5 h-5 mr-2" />
              Professional Setup & Support
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black text-white mb-8 leading-tight">
              <span className="block">Ready to</span>
              <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Dominate Your Market?
              </span>
            </h2>
          </div>
          <p className="text-2xl md:text-3xl text-white/90 mb-12 leading-relaxed font-medium max-w-4xl mx-auto">
            Join the AI revolution. Start capturing <span className="text-yellow-300 font-bold">every opportunity</span> 
            and watch your revenue <span className="text-green-300 font-bold">soar by 40%</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            <Link 
              href="/onboarding/streamlined" 
              className="group bg-white text-blue-600 px-8 sm:px-12 lg:px-16 py-4 sm:py-6 rounded-3xl font-black text-lg sm:text-xl lg:text-2xl hover:bg-gray-100 transition-all duration-300 shadow-2xl inline-flex items-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Rocket className="w-8 h-8 mr-4 relative z-10" />
              <span className="relative z-10">Get Started</span>
              <ArrowRight className="w-8 h-8 ml-4 relative z-10 group-hover:translate-x-2 transition-transform duration-300" />
            </Link>
            <div className="text-center text-white">
              <div className="text-sm text-white/80 mb-1">Professional setup in</div>
              <div className="text-3xl font-bold text-yellow-300">24 hours</div>
            </div>
          </div>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="font-bold text-lg mb-2">100% Secure</div>
              <div className="text-white/80">Enterprise-grade security</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="font-bold text-lg mb-2">24-Hour Setup</div>
              <div className="text-white/80">Professional setup in 24 hours</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div className="font-bold text-lg mb-2">24/7 Support</div>
              <div className="text-white/80">We're here when you need us</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">CloudGreet</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Professional AI receptionist for service businesses. Never miss another call.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/login" className="hover:text-white transition-colors">Login</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CloudGreet. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}