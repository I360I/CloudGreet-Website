import React from 'react'
import Link from 'next/link'
import { HelpCircle, Phone, MessageSquare, Calendar, BarChart, Shield } from 'lucide-react'

const helpSections = [
  {
    icon: <Phone className="h-8 w-8 text-purple-400" />,
    title: 'Getting Started',
    description: 'Learn how to set up your AI receptionist and start taking calls.',
    topics: [
      'Setting up your business profile',
      'Configuring your AI agent',
      'Getting your phone number',
      'Testing your setup'
    ]
  },
  {
    icon: <MessageSquare className="h-8 w-8 text-purple-400" />,
    title: 'AI Agent Management',
    description: 'Customize your AI receptionist to match your business needs.',
    topics: [
      'Changing your AI personality',
      'Setting up custom greetings',
      'Configuring business hours',
      'Managing call routing'
    ]
  },
  {
    icon: <Calendar className="h-8 w-8 text-purple-400" />,
    title: 'Appointment Booking',
    description: 'Set up automated appointment booking and calendar integration.',
    topics: [
      'Connecting your calendar',
      'Setting up appointment types',
      'Managing bookings',
      'Sending reminders'
    ]
  },
  {
    icon: <BarChart className="h-8 w-8 text-purple-400" />,
    title: 'Analytics & Reporting',
    description: 'Track your performance and optimize your AI receptionist.',
    topics: [
      'Understanding your dashboard',
      'Viewing call analytics',
      'Tracking conversions',
      'Exporting data'
    ]
  },
  {
    icon: <Shield className="h-8 w-8 text-purple-400" />,
    title: 'Security & Privacy',
    description: 'Learn about data protection and security features.',
    topics: [
      'Data encryption',
      'Tenant isolation',
      'Privacy compliance',
      'Access controls'
    ]
  }
]

const faqs = [
  {
    question: 'How do I get started with CloudGreet?',
    answer: 'Simply sign up, complete the onboarding process, and we\'ll provision a phone number for your business. Your AI receptionist will be ready to take calls within minutes.'
  },
  {
    question: 'Can I customize my AI receptionist?',
    answer: 'Yes! You can customize the personality, greeting message, business hours, and even add custom instructions to match your brand voice.'
  },
  {
    question: 'How does appointment booking work?',
    answer: 'Your AI receptionist can automatically book appointments by connecting to your Google Calendar or Microsoft Calendar. It will check availability and send confirmation messages.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use enterprise-grade encryption, tenant isolation, and comply with all major privacy regulations. Each business\'s data is completely isolated.'
  },
  {
    question: 'What if I need human support?',
    answer: 'Our AI can escalate calls to you or your team when needed. You can set escalation triggers and provide fallback phone numbers.'
  }
]

const HelpPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Help Center
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Everything you need to know about CloudGreet
          </p>
        </div>

        {/* Help Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {helpSections.map((section, index) => (
            <div
              key={index}
              className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-8 hover:border-purple-500 transition-all duration-300"
            >
              <div className="mb-4 p-3 bg-purple-900 bg-opacity-50 rounded-full w-fit">
                {section.icon}
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-purple-300">{section.title}</h3>
              <p className="text-gray-400 mb-4">{section.description}</p>
              <ul className="space-y-2">
                {section.topics.map((topic, topicIndex) => (
                  <li key={topicIndex} className="text-sm text-gray-300 flex items-center">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-10 mb-16">
          <h2 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-red-600">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-700 pb-6 last:border-b-0">
                <h3 className="text-xl font-semibold mb-3 text-purple-300">{faq.question}</h3>
                <p className="text-gray-300">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="text-center">
          <div className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-10 max-w-2xl mx-auto">
            <HelpCircle className="h-16 w-16 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4 text-purple-300">Still Need Help?</h2>
            <p className="text-lg text-gray-300 mb-8">
              Our support team is here to help you get the most out of CloudGreet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 shadow-lg transform hover:scale-105 text-center">
                Contact Support
              </Link>
              <Link href="/demo" className="bg-white bg-opacity-10 border border-gray-600 text-gray-200 hover:bg-opacity-20 hover:border-purple-500 font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 text-center">
                Try Demo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPage
