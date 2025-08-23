"use client"

import Link from "next/link"

export default function Home() {
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
            onClick={() => window.open('https://buy.stripe.com/test_your_link', '_blank')}
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
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Never miss a job again.
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              CloudGreet answers every call and books estimates straight into your Google Calendar. 
              AI receptionist built for painters, HVAC, plumbers, and roofers. Setup in 24 hours.
            </p>
            
            <div className="flex items-center justify-center gap-6 mb-8">
              <button 
                onClick={() => window.open('https://buy.stripe.com/test_your_link', '_blank')}
                className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600"
              >
                Start Free Trial
              </button>
              <Link 
                href="/demo"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50"
              >
                Watch Demo
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
              <p className="text-gray-600">AI receptionist handles every call professionally.</p>
            </div>
            
            <div className="text-center">
              <div className="h-20 w-20 bg-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-white text-3xl">📅</span>
              </div>
              <div className="mb-2">
                <span className="text-blue-500 font-semibold mr-2">Step 2</span>
                <h4 className="text-xl font-bold text-gray-900 inline">We book estimates</h4>
              </div>
              <p className="text-gray-600">Qualified leads get scheduled into your Google Calendar.</p>
            </div>
            
            <div className="text-center">
              <div className="h-20 w-20 bg-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-white text-3xl">📊</span>
              </div>
              <div className="mb-2">
                <span className="text-blue-500 font-semibold mr-2">Step 3</span>
                <h4 className="text-xl font-bold text-gray-900 inline">You get daily summaries</h4>
              </div>
              <p className="text-gray-600">Daily reports show calls handled and revenue generated.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-24">
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
              <p className="text-gray-600">Every missed call is money lost. We answer 24/7.</p>
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
                <span className="text-2xl">📧</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Daily summaries</h3>
              <p className="text-gray-600">Get daily reports of calls and bookings made.</p>
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
              onClick={() => window.open('https://buy.stripe.com/test_your_link', '_blank')}
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
    </div>
  )
}

