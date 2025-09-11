'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  HelpCircle,
  Search,
  MessageCircle,
  Phone,
  Mail,
  BookOpen,
  Video,
  FileText,
  ChevronRight,
  CheckCircle,
  Star,
  Users,
  Clock,
  Shield,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  Settings,
  BarChart3
} from 'lucide-react'

export default function HelpPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('getting-started')

  const categories = [
    { id: 'getting-started', label: 'Getting Started', icon: Zap },
    { id: 'features', label: 'Features', icon: Target },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: HelpCircle },
    { id: 'billing', label: 'Billing', icon: TrendingUp },
    { id: 'api', label: 'API & Integrations', icon: Settings }
  ]

  const faqs = {
    'getting-started': [
      {
        question: 'How do I set up my AI receptionist?',
        answer: 'Setting up your AI receptionist is easy! Just complete the onboarding process in your dashboard. You\'ll need to provide your business information, phone number, and calendar details. The setup takes about 5 minutes.'
      },
      {
        question: 'What information do I need to provide during setup?',
        answer: 'You\'ll need your business name, type (HVAC, Painting, or Roofing), phone number, calendar provider (Google, Outlook, or Apple), business hours, and AI personality preference.'
      },
      {
        question: 'How long does it take to activate my AI receptionist?',
        answer: 'Your AI receptionist is typically activated within 24 hours of completing setup. You\'ll receive an email confirmation once it\'s ready to take calls.'
      },
      {
        question: 'Can I test my AI receptionist before going live?',
        answer: 'Yes! After setup, you can test your AI receptionist using our test flow feature. This allows you to make a test call and see how it handles different scenarios.'
      }
    ],
    'features': [
      {
        question: 'What types of calls can my AI receptionist handle?',
        answer: 'Your AI receptionist can handle appointment bookings, service inquiries, emergency calls, rescheduling requests, and general business questions. It\'s specifically trained for HVAC, Painting, and Roofing businesses.'
      },
      {
        question: 'How does emergency call detection work?',
        answer: 'Our AI is trained to recognize emergency keywords and urgent situations. When an emergency is detected, the AI immediately prioritizes the call and can transfer to you or schedule urgent appointments.'
      },
      {
        question: 'Can my AI receptionist book appointments directly?',
        answer: 'Yes! Your AI receptionist can check your calendar availability and book appointments directly. It integrates with Google Calendar, Outlook, and Apple Calendar to prevent double-booking.'
      },
      {
        question: 'Does the AI filter spam calls?',
        answer: 'Yes, our AI includes advanced spam detection. It can identify and filter out spam calls, telemarketers, and other unwanted calls, saving you time and money.'
      }
    ],
    'troubleshooting': [
      {
        question: 'My AI receptionist isn\'t answering calls. What should I do?',
        answer: 'First, check that your phone number is properly connected in the settings. If the issue persists, contact our support team. We provide 99.9% uptime guarantee and will resolve any issues quickly.'
      },
      {
        question: 'Why aren\'t appointments appearing in my calendar?',
        answer: 'Check your calendar integration in the settings. Make sure your calendar provider is properly connected and that the AI has the necessary permissions to create events.'
      },
      {
        question: 'The AI is giving incorrect information. How can I fix this?',
        answer: 'Update your business information in the settings. The AI learns from your business details, so keeping them current ensures accurate responses. You can also customize the greeting and responses.'
      },
      {
        question: 'I\'m not receiving notifications. What\'s wrong?',
        answer: 'Check your notification settings in the dashboard. Make sure email notifications are enabled and that our emails aren\'t going to your spam folder.'
      }
    ],
    'billing': [
      {
        question: 'How does billing work?',
        answer: 'CloudGreet Pro costs $200/month plus $50 per booking. You\'re only charged for successful bookings, not for calls that don\'t result in appointments.'
      },
      {
        question: 'When am I charged for bookings?',
        answer: 'You\'re charged $50 for each successful booking made by your AI receptionist. These charges appear on your monthly bill along with the $200 base fee.'
      },
      {
        question: 'Can I change my plan?',
        answer: 'Currently, we offer one comprehensive plan (CloudGreet Pro) that includes all features. If you need a different plan, contact our sales team to discuss custom options.'
      },
      {
        question: 'What if I want to cancel?',
        answer: 'You can cancel your subscription at any time from your billing settings. There are no long-term contracts or cancellation fees.'
      }
    ],
    'api': [
      {
        question: 'Do you offer API access?',
        answer: 'Yes! We provide API access for advanced integrations. Contact our support team to discuss your specific needs and get API documentation.'
      },
      {
        question: 'What calendar providers do you support?',
        answer: 'We support Google Calendar, Microsoft Outlook, and Apple Calendar. We\'re constantly adding support for more providers based on customer demand.'
      },
      {
        question: 'Can I integrate with my existing CRM?',
        answer: 'Yes, we offer integrations with popular CRM systems. Contact our support team to discuss integration options for your specific CRM.'
      },
      {
        question: 'Is there a webhook system for real-time updates?',
        answer: 'Yes, we provide webhooks for real-time notifications about calls, bookings, and other events. Check our API documentation for details.'
      }
    ]
  }

  const contactMethods = [
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Get instant help from our support team',
      action: 'Start Chat',
      available: 'Available 24/7'
    },
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Speak directly with a support specialist',
      action: 'Call Now',
      available: 'Mon-Fri 9AM-6PM EST'
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Send us a detailed message',
      action: 'Send Email',
      available: 'Response within 2 hours'
    }
  ]

  const resources = [
    {
      icon: BookOpen,
      title: 'User Guide',
      description: 'Complete guide to using CloudGreet',
      type: 'PDF'
    },
    {
      icon: Video,
      title: 'Video Tutorials',
      description: 'Step-by-step video guides',
      type: 'Videos'
    },
    {
      icon: FileText,
      title: 'API Documentation',
      description: 'Technical documentation for developers',
      type: 'Docs'
    }
  ]

  const filteredFaqs = faqs[selectedCategory as keyof typeof faqs]?.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <HelpCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Help & Support</h1>
                <p className="text-slate-500 dark:text-slate-400">Get help and find answers to your questions</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search for help articles, FAQs, and guides..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Categories</h3>
              <nav className="space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        selectedCategory === category.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{category.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {/* FAQ Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Frequently Asked Questions
              </h2>
              
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-12">
                  <HelpCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No results found</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Try adjusting your search terms or browse different categories.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFaqs.map((faq, index) => (
                    <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                        {faq.question}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Support */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Still need help? Contact our support team
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {contactMethods.map((method, index) => {
                  const Icon = method.icon
                  return (
                    <div key={index} className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{method.title}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{method.available}</p>
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">{method.description}</p>
                      <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
                        {method.action}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Resources */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Additional Resources
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {resources.map((resource, index) => {
                  const Icon = resource.icon
                  return (
                    <div key={index} className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-600 hover:shadow-lg transition-all duration-200 cursor-pointer">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{resource.title}</h3>
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-full">
                            {resource.type}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">{resource.description}</p>
                      <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                        <span>View Resource</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}