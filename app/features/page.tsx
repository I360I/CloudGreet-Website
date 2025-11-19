import React from 'react'
import Link from 'next/link'
import { ArrowRight, Phone, Calendar, Brain, Shield, BarChart3, Clock, MessageSquare, Zap, Users, Target, TrendingUp } from 'lucide-react'
import Footer from '@/app/components/Footer'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-gray-800/50 backdrop-blur-md bg-black/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/landing" className="flex items-center hover:opacity-80 transition-opacity">
              <span className="text-2xl font-bold text-white">CloudGreet</span>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/landing" className="text-gray-300 hover:text-white transition-colors duration-300 font-medium">
                Home
              </Link>
              <Link href="/features" className="text-white transition-colors duration-300 font-medium">
                Features
              </Link>
              <Link href="/contact" className="text-gray-300 hover:text-white transition-colors duration-300 font-medium">
                Contact
              </Link>
            </div>
            <Link href="/register-simple" className="bg-white/15 backdrop-blur-xl text-white px-5 py-2 rounded-lg text-sm font-medium border border-white/30 hover:bg-white/25 hover:border-white/50 transition-all duration-300 shadow-lg">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 lg:py-20">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            Powerful Features for Your Business
          </h1>
          <p className="text-base md:text-lg text-gray-300 mb-8 max-w-3xl mx-auto leading-snug">
            Everything you need to never miss a call, qualify leads, and grow your service business with AI-powered automation.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Core Features */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 md:p-6 border border-white/10 shadow-lg">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <Phone className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 leading-tight">24/7 AI Call Answering</h3>
            <p className="text-sm md:text-base text-gray-300 mb-4 leading-snug">
              Never miss a call again. Our AI answers every call instantly, even outside business hours.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Instant call pickup</li>
              <li>• Natural conversation flow</li>
              <li>• 24/7 availability</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-white/20">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 leading-tight">Intelligent Lead Qualification</h3>
            <p className="text-sm md:text-base text-gray-300 mb-4 leading-snug">
              AI automatically qualifies leads by gathering service needs, location, urgency, and budget.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Service type identification</li>
              <li>• Location verification</li>
              <li>• Budget qualification</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-white/20">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 leading-tight">Automatic Booking</h3>
            <p className="text-sm md:text-base text-gray-300 mb-4 leading-snug">
              Seamlessly schedule qualified leads directly into your calendar with SMS confirmations.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Calendar integration</li>
              <li>• SMS confirmations</li>
              <li>• Time zone handling</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-white/20">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 leading-tight">Missed Call Recovery</h3>
            <p className="text-sm md:text-base text-gray-300 mb-4 leading-snug">
              Automatically send follow-up SMS to missed calls to recover lost opportunities.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Instant SMS follow-up</li>
              <li>• Personalized messages</li>
              <li>• Call-back scheduling</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-white/20">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 leading-tight">Call Recordings & Transcripts</h3>
            <p className="text-sm md:text-base text-gray-300 mb-4 leading-snug">
              Every call is recorded and transcribed for quality assurance and training.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Full call recordings</li>
              <li>• AI transcripts</li>
              <li>• Quality analytics</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-white/20">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 leading-tight">Professional Dashboard</h3>
            <p className="text-sm md:text-base text-gray-300 mb-4 leading-snug">
              Real-time analytics, ROI tracking, and performance insights to grow your business.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Real-time metrics</li>
              <li>• ROI calculations</li>
              <li>• Performance insights</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Advanced Features */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 lg:py-20">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">Advanced AI Capabilities</h2>
          <p className="text-base md:text-lg text-gray-300 max-w-3xl mx-auto leading-snug">
            Powered by the latest AI technology to deliver human-like conversations and intelligent automation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-white mb-2 leading-tight">Lightning Fast Response</h3>
                <p className="text-sm md:text-base text-gray-300 leading-snug">AI responds in under 1 second, ensuring no customer waits or hangs up.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Multi-Language Support</h3>
                <p className="text-gray-300">Communicate with customers in their preferred language for better service.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Smart Lead Scoring</h3>
                <p className="text-gray-300">AI automatically scores and prioritizes leads based on likelihood to convert.</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Business Hours Intelligence</h3>
                <p className="text-gray-300">AI respects your business hours and handles after-hours calls appropriately.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Continuous Learning</h3>
                <p className="text-gray-300">AI learns from every interaction to improve responses and booking rates.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Two-Way SMS</h3>
                <p className="text-gray-300">Send and receive SMS messages directly from your dashboard for follow-ups.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 lg:py-20">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 backdrop-blur-xl rounded-xl p-4 md:p-6 lg:p-8 text-center border border-white/10 shadow-xl">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">Ready to Transform Your Business?</h2>
          <p className="text-base md:text-lg text-gray-300 mb-6 max-w-2xl mx-auto leading-snug">
            Join thousands of service businesses who never miss another opportunity.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register-simple" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg flex items-center justify-center gap-2">
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/contact" className="bg-white/10 backdrop-blur-xl text-white px-4 py-2 rounded-lg text-sm font-medium border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 shadow-lg">
              Contact Sales
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
