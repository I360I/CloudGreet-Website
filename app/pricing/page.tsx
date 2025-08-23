"use client"

import Link from "next/link"

export default function PricingPage() {
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
            onClick={() => window.open('https://buy.stripe.com/test_your_link', '_blank')}
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
            <p className="text-lg text-gray-600 mb-16">
              One plan that scales with your business. No hidden fees, no contracts.
            </p>
          </div>

          <div className="mx-auto max-w-2xl">
            <div className="bg-white p-8 border-2 border-blue-500 rounded-3xl shadow-2xl">
              <div className="text-center">
                <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium mb-6 inline-block">
                  Most Popular
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-6">CloudGreet Pro</h2>
                
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold text-gray-900">$200</span>
                  <span className="text-lg text-gray-600">/month</span>
                </div>
                
                <div className="mb-6">
                  <span className="text-3xl font-bold text-blue-500">+ $50</span>
                  <span className="text-lg text-gray-600"> per booking</span>
                </div>
                
                <p className="text-gray-600 mb-8">
                  Complete AI receptionist service for service businesses
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-blue-500">✓</span>
                  <span className="text-gray-600">24/7 AI receptionist answers every call</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500">✓</span>
                  <span className="text-gray-600">Automatic booking into Google Calendar</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500">✓</span>
                  <span className="text-gray-600">Daily summary reports via text/email</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500">✓</span>
                  <span className="text-gray-600">Spam and duplicate call filtering</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500">✓</span>
                  <span className="text-gray-600">Brand-matched professional tone</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500">✓</span>
                  <span className="text-gray-600">Setup completed in 24 hours</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500">✓</span>
                  <span className="text-gray-600">No contracts - cancel anytime</span>
                </li>
              </ul>

              <div className="text-center">
                <button 
                  onClick={() => window.open('https://buy.stripe.com/test_your_link', '_blank')}
                  className="w-full bg-blue-500 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 mb-3"
                >
                  Start Free Trial
                </button>
                <p className="text-sm text-gray-500">
                  Setup in 24 hours • No contracts • Cancel anytime
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mx-auto mt-24 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
              Pricing FAQ
            </h2>
            <div className="space-y-8">
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What exactly counts as a booking?</h3>
                <p className="text-gray-600">A booking is when we successfully schedule an estimate or service appointment in your calendar with a qualified customer who provided contact information and job details.</p>
              </div>
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Are there any setup fees?</h3>
                <p className="text-gray-600">No setup fees. You only pay the monthly base fee ($200) plus per-booking fees ($50 each). First month is prorated based on your start date.</p>
              </div>
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Can I pause or cancel anytime?</h3>
                <p className="text-gray-600">Yes, no contracts required. You can pause service or cancel with 30 days notice. We'll provide all call logs and booking data upon cancellation.</p>
              </div>
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What if I get too many bookings?</h3>
                <p className="text-gray-600">You can set daily, weekly, or monthly booking limits. When you reach your cap, we'll politely defer additional callers to your next available period.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
