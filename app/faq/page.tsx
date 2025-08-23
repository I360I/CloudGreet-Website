""use client"

import Link from "next/link"
import { useState } from "react"

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<number[]>([0]) // First item open by default
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '', company: '' })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

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

  const faqCategories = [
    {
      title: "Getting Started",
      faqs: [
        {
          question: "How quickly can CloudGreet be set up for my business?",
          answer: "Most customers are live within 24 hours. We handle the technical setup, Google Calendar integration, and AI training for your specific business. Our setup process includes: configuring your AI receptionist with your business details, testing the Google Calendar integration, training the AI on your services and pricing, and conducting a test call to ensure everything works perfectly."
        },
        {
          question: "What information do I need to provide during setup?",
          answer: "We need your business details (services offered, pricing ranges, scheduling preferences), access to your Google Calendar, your current phone number for call forwarding, and any specific scripts or talking points you want the AI to use. The entire setup call takes about 30 minutes."
        },
        {
          question: "Do I need any special equipment or software?",
          answer: "No special equipment needed. CloudGreet works with your existing phone number and Google Calendar. We handle all the technical integration on our end. You just need a Google account for calendar access."
        }
      ]
    },
    {
      title: "Pricing & Billing",
      faqs: [
        {
          question: "What exactly counts as a booking?",
          answer: "A booking is when we successfully schedule an estimate or service appointment in your calendar with a qualified customer who provided their contact information and job details. We do not charge for spam calls, wrong numbers, unqualified inquiries, or calls where the customer decides not to book."
        },
        {
          question: "Are there any setup fees or hidden costs?",
          answer: "No setup fees, no hidden costs, no contracts. You only pay the monthly base fee ($200) plus per-booking fees ($50 each). Your first month is prorated based on your start date. Cancel anytime with 30 days notice."
        },
        {
          question: "How does billing work for partial months?",
          answer: "Your first month is prorated based on when you start. For example, if you start on the 15th, you pay half the monthly fee for that month. Booking fees are charged as they occur. You receive detailed invoices showing all charges."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit cards (Visa, MasterCard, American Express, Discover) and ACH bank transfers. Payments are processed securely through Stripe. You can update your payment method anytime in your account dashboard."
        }
      ]
    },
    {
      title: "How CloudGreet Works",
      faqs: [
        {
          question: "How does the AI know about my business and services?",
          answer: "During setup, we train the AI on your specific business details including services offered, pricing ranges, scheduling preferences, and your brand voice. The AI learns your business terminology and can answer common questions about your services professionally."
        },
        {
          question: "What happens if the AI cannot handle a call?",
          answer: "If the AI encounters a complex situation it cannot handle, it will politely take the caller information (name, phone, details) and let them know you will call back within a specified timeframe. We continuously improve the AI based on these interactions."
        },
        {
          question: "Can I customize what the AI says to callers?",
          answer: "Yes, during setup we configure the AI to match your brand voice and specific business needs. You can specify greeting scripts, common responses, questions to ask, and information to collect. We can update these anytime."
        },
        {
          question: "Does CloudGreet integrate with my existing tools?",
          answer: "CloudGreet integrates directly with Google Calendar for scheduling. We can also connect to most CRM systems, scheduling tools, and payment processors. Contact us about specific integrations you need."
        }
      ]
    },
    {
      title: "Managing Your Service",
      faqs: [
        {
          question: "Can I set limits on how many bookings I receive?",
          answer: "Absolutely. You can set daily, weekly, or monthly booking limits to ensure you are not overwhelmed. When you reach your cap, we will politely defer additional callers to your next available period or take their information for future scheduling."
        },
        {
          question: "What if I need to pause service temporarily?",
          answer: "You can pause service anytime (for vacations, slow seasons, equipment issues, etc.) and resume when ready. We will prorate your monthly fee accordingly. Just give us 24 hours notice to properly redirect your calls."
        },
        {
          question: "How do I handle cancellations and reschedules?",
          answer: "CloudGreet handles cancellations and reschedule requests automatically. If a customer calls to cancel or reschedule, we update your calendar immediately and send you a notification. No additional charges for these calls."
        },
        {
          question: "Can I review call recordings and transcripts?",
          answer: "Yes, you have access to call recordings and transcripts through your dashboard. This helps you understand how calls are being handled and provides insights for improving your business processes."
        }
      ]
    },
    {
      title: "Technical Questions",
      faqs: [
        {
          question: "Do I need Google Calendar specifically?",
          answer: "Yes, we integrate directly with Google Calendar for automatic scheduling. If you do not have Google Calendar set up, we can help you configure it during onboarding. It is free and takes just a few minutes to set up."
        },
        {
          question: "What happens if my internet or calendar goes down?",
          answer: "CloudGreet continues answering calls even if your systems are down. We will take detailed messages and contact information, then sync everything once your systems are back online. We have 99.9% uptime guarantee."
        },
        {
          question: "How secure is my customer data?",
          answer: "We use enterprise-grade security with SOC 2 compliance. All data is encrypted in transit and at rest. We never share customer information and follow strict data protection protocols. You own all your customer data."
        },
        {
          question: "Can CloudGreet handle multiple phone lines?",
          answer: "Yes, CloudGreet can handle multiple phone numbers and lines for your business. Each line can have different configurations and routing rules. Contact us to discuss your specific needs."
        }
      ]
    }
  ]

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
            <Link href="/pricing" className="text-sm font-semibold text-gray-900 hover:text-blue-500">Pricing</Link>
            <Link href="/demo" className="text-sm font-semibold text-gray-900 hover:text-blue-500">Demo</Link>
            <Link href="/faq" className="text-sm font-semibold text-blue-500">FAQ</Link>
            <Link href="/contact" className="text-sm font-semibold text-gray-900 hover:text-blue-500">Contact</Link>
          </div>
          
          <button 
            onClick={() => setShowLeadForm(true)}
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

          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-gray-600 mb-16">
              Everything you need to know about CloudGreet AI receptionist service.
            </p>
          </div>

          <div className="mx-auto max-w-4xl">
            {faqCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
                  {category.title}
                </h2>
                
                <div className="space-y-4">
                  {category.faqs.map((faq, faqIndex) => {
                    const globalIndex = categoryIndex * 10 + faqIndex // Unique index across all categories
                    const isOpen = openItems.includes(globalIndex)
                    
                    return (
                      <div key={globalIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleItem(globalIndex)}
                          className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                          <span className={`text-blue-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-4">
                            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mx-auto mt-24 max-w-4xl">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-200">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Still have questions?
                </h2>
                <p className="text-gray-600 mb-8">
                  Our team is here to help. Get answers within 4 hours during business hours.
                </p>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <Link 
                    href="/contact"
                    className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow text-center"
                  >
                    <div className="text-2xl mb-2">📧</div>
                    <div className="font-semibold text-gray-900">Email Support</div>
                    <div className="text-sm text-gray-500">support@cloudgreet.com</div>
                  </Link>
                  
                  <a 
                    href="tel:(737) 296-0092"
                    className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow text-center"
                  >
                    <div className="text-2xl mb-2">📞</div>
                    <div className="font-semibold text-gray-900">Call Us</div>
                    <div className="text-sm text-gray-500">(737) 296-0092</div>
                  </a>
                  
                  <button 
                    onClick={() => setShowLeadForm(true)}
                    className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <div className="text-2xl mb-2">🚀</div>
                    <div className="font-semibold">Start Free Trial</div>
                    <div className="text-sm text-blue-100">Setup in 24 hours</div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Resources */}
          <div className="mx-auto mt-24 max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
              Popular resources
            </h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              <Link href="/pricing" className="p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900 mb-2">Pricing Guide</h3>
                <p className="text-gray-600 text-sm">Understand our simple pricing model and see ROI calculations for your business size.</p>
              </Link>
              
              <Link href="/demo" className="p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900 mb-2">See CloudGreet in Action</h3>
                <p className="text-gray-600 text-sm">Watch how CloudGreet handles real customer calls and books appointments.</p>
              </Link>
              
              <Link href="/contact" className="p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900 mb-2">Schedule a Demo Call</h3>
                <p className="text-gray-600 text-sm">Get a personalized demo with your actual business information and phone setup.</p>
              </Link>
              
              <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2">Industry Success Stories</h3>
                <p className="text-gray-600 text-sm">Read how painters, HVAC, plumbers, and roofers use CloudGreet to grow their business.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                <p className="text-gray-600">We will contact you within 4 hours to set up your free trial.</p>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

