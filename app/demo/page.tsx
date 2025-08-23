"use client"

import Link from "next/link"

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
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
            onClick={() => window.open('https://buy.stripe.com/test_your_link', '_blank')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600"
          >
            Get Started
          </button>
        </nav>
      </header>

      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center text-blue-500 hover:text-blue-600">
              ← Back to Home
            </Link>
          </div>

          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              See CloudGreet in Action
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Watch how CloudGreet handles real customer calls and books estimates automatically.
            </p>
          </div>

          {/* Demo Video */}
          <div className="mt-16 flow-root sm:mt-24">
            <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
              <div className="aspect-video rounded-md bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center relative overflow-hidden">
                <div className="text-center z-10">
                  <div className="h-20 w-20 mx-auto bg-blue-500 rounded-full flex items-center justify-center mb-6 hover:bg-blue-600 transition-colors cursor-pointer">
                    <span className="text-white text-4xl ml-1">▶</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">
                    CloudGreet 60-Second Demo
                  </h3>
                  <p className="text-gray-600 mb-4">
                    See real call handling and automatic booking
                  </p>
                  <button className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                    <span className="mr-2">▶</span>
                    Watch Demo
                  </button>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-purple-100/50"></div>
              </div>
            </div>
          </div>

          {/* Demo Features */}
          <div className="mx-auto mt-24 max-w-2xl sm:mt-32 lg:max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12 text-gray-900">
              What you will see in the demo
            </h2>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="text-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="mx-auto h-16 w-16 rounded-lg bg-blue-100 flex items-center justify-center mb-6">
                  <span className="text-blue-500 text-2xl">💬</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Live Call Handling</h3>
                <p className="text-gray-600 leading-relaxed">See how our AI receptionist handles real customer calls professionally</p>
              </div>
              
              <div className="text-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="mx-auto h-16 w-16 rounded-lg bg-blue-100 flex items-center justify-center mb-6">
                  <span className="text-blue-500 text-2xl">📅</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Calendar Integration</h3>
                <p className="text-gray-600 leading-relaxed">Watch bookings appear automatically in Google Calendar with full details</p>
              </div>
              
              <div className="text-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="mx-auto h-16 w-16 rounded-lg bg-blue-100 flex items-center justify-center mb-6">
                  <span className="text-blue-500 text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Daily Summaries</h3>
                <p className="text-gray-600 leading-relaxed">Review the daily text/email reports you will receive with call summaries and ROI</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mx-auto mt-24 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Ready to get started?
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Join hundreds of service businesses using CloudGreet to never miss another job.
            </p>
            <div className="mt-10">
              <button 
                onClick={() => window.open('https://buy.stripe.com/test_your_link', '_blank')}
                className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors shadow-lg"
              >
                Start Free Trial
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Setup in 24 hours • $200/mo + $50 per booking
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
