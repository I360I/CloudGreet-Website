import React from 'react'
import Link from 'next/link'
import { ArrowRight, Phone, Calendar, Brain, Shield, BarChart3, Clock, MessageSquare, Zap, Users, Target, TrendingUp } from 'lucide-react'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-purple-500/20 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CG</span>
              </div>
              <span className="text-white font-bold text-xl">CloudGreet</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/landing" className="text-gray-300 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                Contact
              </Link>
              <Link href="/register-simple" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            Powerful Features for Your Business
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Everything you need to never miss a call, qualify leads, and grow your service business with AI-powered automation.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Core Features */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
              <Phone className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">24/7 AI Call Answering</h3>
            <p className="text-gray-300 mb-6">
              Never miss a call again. Our AI answers every call instantly, even outside business hours.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Instant call pickup</li>
              <li>• Natural conversation flow</li>
              <li>• 24/7 availability</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-6">
              <Brain className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Intelligent Lead Qualification</h3>
            <p className="text-gray-300 mb-6">
              AI automatically qualifies leads by gathering service needs, location, urgency, and budget.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Service type identification</li>
              <li>• Location verification</li>
              <li>• Budget qualification</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Automatic Booking</h3>
            <p className="text-gray-300 mb-6">
              Seamlessly schedule qualified leads directly into your calendar with SMS confirmations.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Calendar integration</li>
              <li>• SMS confirmations</li>
              <li>• Time zone handling</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Missed Call Recovery</h3>
            <p className="text-gray-300 mb-6">
              Automatically send follow-up SMS to missed calls to recover lost opportunities.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Instant SMS follow-up</li>
              <li>• Personalized messages</li>
              <li>• Call-back scheduling</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Call Recordings & Transcripts</h3>
            <p className="text-gray-300 mb-6">
              Every call is recorded and transcribed for quality assurance and training.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Full call recordings</li>
              <li>• AI transcripts</li>
              <li>• Quality analytics</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Professional Dashboard</h3>
            <p className="text-gray-300 mb-6">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-6">Advanced AI Capabilities</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
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
                <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast Response</h3>
                <p className="text-gray-300">AI responds in under 1 second, ensuring no customer waits or hangs up.</p>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/20">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Business?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of service businesses who never miss another opportunity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register-simple" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/contact" className="bg-white/10 text-white px-8 py-4 rounded-lg hover:bg-white/20 transition-all">
              Contact Sales
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-black/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CG</span>
                </div>
                <span className="text-white font-bold text-xl">CloudGreet</span>
              </div>
              <p className="text-gray-400">AI-powered receptionist for your business.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/features" className="text-gray-400 hover:text-white">Features</Link></li>
                <li><Link href="/landing#pricing" className="text-gray-400 hover:text-white">Pricing</Link></li>
                <li><Link href="/demo" className="text-gray-400 hover:text-white">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><Link href="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
                <li><Link href="/help" className="text-gray-400 hover:text-white">Help Center</Link></li>
                <li><Link href="/status" className="text-gray-400 hover:text-white">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-gray-400 hover:text-white">Terms</Link></li>
                <li><Link href="/privacy" className="text-gray-400 hover:text-white">Privacy</Link></li>
                <li><Link href="/cookies" className="text-gray-400 hover:text-white">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-400">© 2024 CloudGreet. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
