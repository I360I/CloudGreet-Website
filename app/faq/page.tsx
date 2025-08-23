"use client"

import Link from "next/link"

export default function FAQPage() {
  const faqs = [
    {
      question: "What counts as a booking?",
      answer: "A booking is when we successfully schedule an estimate or service call in your calendar with a qualified customer who provided their contact information and job details. We don't charge for spam calls, wrong numbers, or unqualified inquiries."
    },
    {
      question: "Do I need Google Calendar?",
      answer: "Yes, we integrate directly with Google Calendar to automatically schedule appointments. If you don't have Google Calendar set up, we can help you configure it during the onboarding process. It's free and takes just a few minutes."
    },
    {
      question: "Can I cap bookings so I'm not overloaded?",
      answer: "Absolutely. You can set daily, weekly, or monthly booking limits to ensure you're not overwhelmed. When you reach your cap, we'll politely defer additional calls to your next available period or take their information for future scheduling."
    },
    {
      question: "How fast is setup really?",
      answer: "Most customers are live within 24 hours. We need about 30 minutes to configure your AI receptionist, test the Google Calendar integration, and train it on your business specifics (services offered, pricing ranges, scheduling preferences)."
    },
    {
      question: "What about cancellations and reschedules?",
      answer: "We handle cancellations and reschedule requests automatically. If a customer calls to cancel or reschedule, we'll update your calendar immediately and send you a notification. No additional charges for these calls."
    },
    {
      question: "What if the AI doesn't understand a caller?",
      answer: "Our AI is trained specifically for service businesses, but if it encounters a complex situation, it will politely take the caller's information and have you call them back. We continuously improve the AI based on these interactions."
    },
    {
      question: "Can I customize what the AI says?",
      answer: "Yes, during setup we'll configure the AI to match your brand voice and specific business details. You can specify how you want calls handled, what questions to ask, and what information to collect."
    },
    {
      question: "What types of calls does CloudGreet handle?",
      answer: "We handle estimate requests, service calls, general inquiries, and appointment scheduling. We filter out spam, sales calls, and other non-business calls automatically."
    }
  ]

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
            <Link href="/demo" className="text-sm font-semibold text-gray-900 hover:text-blue-500">Demo</Link>
            <Link href="/faq" className="text-sm font-semibold text-blue-500">FAQ</Link>
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
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Everything you need to know about CloudGreet AI receptionist service.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-3xl">
            <div className="space-y-8">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b border-gray-200 pb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-2xl text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Still have questions?
            </h2>
            <p className="text-gray-600 mb-6">
              Contact us and we'll get back to you within 24 hours.
            </p>
            <Link 
              href="/contact"
              className="inline-flex items-center bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

