import React from 'react'
import Link from 'next/link'
import { ArrowRight, Phone, Play, CheckCircle, Star, Clock, Users, TrendingUp } from 'lucide-react'
import Footer from '@/app/components/Footer'

export default function DemoPage() {
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
              <Link href="/features" className="text-gray-300 hover:text-white transition-colors duration-300 font-medium">
                Features
              </Link>
              <Link href="/demo" className="text-white transition-colors duration-300 font-medium">
                Demo
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
      <div className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Experience CloudGreet Live
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Call our demo number right now to experience the same AI that will handle your customers. 
            See how natural and intelligent our AI receptionist really is.
          </p>
        </div>
      </div>

      {/* Demo Section */}
      <div className="max-w-6xl mx-auto px-4 py-24">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 md:p-8 border border-white/10 shadow-xl">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Phone className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Call Our Demo Now</h2>
            <p className="text-xl text-gray-300 mb-8">
              Experience the same AI that will handle your customers. Try booking an appointment, asking about services, or testing our lead qualification.
            </p>
            
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-xl p-8 mb-8">
              <div className="text-4xl font-bold text-white mb-2">+1 (833) 395-6731</div>
              <p className="text-gray-300">Available 24/7 • Try it right now!</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="tel:+18333956731" 
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Call Demo Now
              </a>
              <Link href="/register-simple" className="bg-white/10 backdrop-blur-xl text-white px-6 py-3 rounded-lg text-base font-medium border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 shadow-lg flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Get Your Own Number
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* What to Try */}
      <div className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">What to Try During Your Demo Call</h2>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            Here are some things you can test to see how our AI handles real customer scenarios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 md:p-8 border border-white/10 shadow-lg">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
              <Play className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Service Inquiries</h3>
            <p className="text-gray-300 mb-6">
              Ask about different services like "I need HVAC repair" or "Do you do emergency calls?"
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• "I need AC repair"</li>
              <li>• "Do you service my area?"</li>
              <li>• "What are your rates?"</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-6">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Booking Appointments</h3>
            <p className="text-gray-300 mb-6">
              Try to schedule an appointment and see how the AI handles your availability.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• "I'd like to book an appointment"</li>
              <li>• "When are you available?"</li>
              <li>• "Can I schedule for tomorrow?"</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-6">
              <Star className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Lead Qualification</h3>
            <p className="text-gray-300 mb-6">
              Experience how the AI gathers information about your project and needs.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• "What's your budget?"</li>
              <li>• "How urgent is this?"</li>
              <li>• "What's your address?"</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-6">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Business Hours</h3>
            <p className="text-gray-300 mb-6">
              Ask about operating hours and see how the AI handles after-hours calls.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• "What are your hours?"</li>
              <li>• "Are you open weekends?"</li>
              <li>• "Do you have emergency service?"</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Objection Handling</h3>
            <p className="text-gray-300 mb-6">
              Try to negotiate or raise concerns to see how the AI handles objections.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• "That's too expensive"</li>
              <li>• "I need to think about it"</li>
              <li>• "I'll call back later"</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-6">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Natural Conversation</h3>
            <p className="text-gray-300 mb-6">
              Just have a natural conversation and see how human-like the AI really is.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Ask follow-up questions</li>
              <li>• Change topics mid-call</li>
              <li>• Test response speed</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Demo Results */}
      <div className="max-w-6xl mx-auto px-4 py-24">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-8 md:p-10 border border-white/10 shadow-xl">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">What You'll Experience</h2>
            <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Our AI delivers the same professional experience your customers will receive, 
              with natural conversation flow and intelligent responses.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">&lt; 1s</div>
                <div className="text-white font-semibold">Response Time</div>
                <div className="text-gray-400 text-sm md:text-base">Lightning fast answers</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-green-400 mb-2">95%</div>
                <div className="text-white font-semibold">Accuracy Rate</div>
                <div className="text-gray-400 text-sm md:text-base">Correctly understands intent</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-purple-400 mb-2">24/7</div>
                <div className="text-white font-semibold">Availability</div>
                <div className="text-gray-400 text-sm md:text-base">Never misses a call</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register-simple" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Get Started Free
              </Link>
              <Link href="/contact" className="bg-white/10 backdrop-blur-xl text-white px-6 py-3 rounded-lg text-base font-medium border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 shadow-lg">
                Questions? Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
