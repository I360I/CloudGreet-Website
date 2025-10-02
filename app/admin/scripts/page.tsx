'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, Mail, MessageSquare, Copy, CheckCircle,
  Play, Pause, Volume2, Download, BookOpen,
  Target, Users, TrendingUp, Clock
} from 'lucide-react'

interface Script {
  id: string
  title: string
  type: 'cold_call' | 'follow_up' | 'email' | 'demo'
  content: string
  duration: string
  success_rate: number
  last_used: string
}

export default function SalesScripts() {
  const [selectedScript, setSelectedScript] = useState<Script | null>(null)
  const [copiedScript, setCopiedScript] = useState<string | null>(null)

  const scripts: Script[] = [
    {
      id: '1',
      title: 'Cold Call Opening',
      type: 'cold_call',
      content: `Hi [NAME], this is [YOUR_NAME] from CloudGreet. I'm calling because I noticed [BUSINESS_NAME] has excellent reviews online, and I have a solution that could help you capture even more customers and never miss another call.

We provide AI receptionists that answer your phones 24/7, qualify leads, and even book appointments automatically. This means you'll never miss a potential customer again, even when you're busy with other jobs.

Do you currently have any issues with missing calls or leads falling through the cracks?

[PAUSE FOR RESPONSE]

Great! The reason I'm calling is that we're helping [SIMILAR_BUSINESS_TYPE] businesses like yours increase their bookings by 40-60% within the first month. And the best part? It only costs $200/month plus a small commission on new bookings we generate for you.

Would you be interested in a quick 10-minute demo to see exactly how this works? I can show you how it would handle a typical call for [BUSINESS_NAME].`,
      duration: '2-3 minutes',
      success_rate: 78,
      last_used: '2 hours ago'
    },
    {
      id: '2',
      title: 'Email Follow-up',
      type: 'email',
      content: `Subject: Never Miss Another Call - AI Receptionist for [BUSINESS_NAME]

Hi [NAME],

I hope you're having a great week at [BUSINESS_NAME]!

I wanted to follow up on our conversation about how you're currently handling incoming calls and leads. 

Many service businesses like yours are losing 30-40% of potential revenue simply because they miss calls or don't follow up quickly enough. 

That's exactly why I created CloudGreet - an AI receptionist that:

✅ Answers every call, 24/7
✅ Qualifies leads automatically  
✅ Books appointments in your calendar
✅ Sends you SMS alerts for urgent calls
✅ Follows up with quotes and estimates

Our clients typically see a 40-60% increase in bookings within the first month, and since we only get paid when you get paid, it's a true win-win partnership.

Would you be open to a quick 10-minute demo this week? I can show you exactly how this would work for [BUSINESS_NAME] and answer any questions you have.

Best regards,
[YOUR_NAME]
CloudGreet

P.S. We're currently offering a 30-day free trial with no setup fees. No risk, all reward.`,
      duration: '30 seconds to read',
      success_rate: 65,
      last_used: '1 day ago'
    },
    {
      id: '3',
      title: 'Demo Presentation',
      type: 'demo',
      content: `DEMO SCRIPT - AI Receptionist for [BUSINESS_NAME]

[OPENING - 2 minutes]
"Thanks for taking the time to see how CloudGreet can help [BUSINESS_NAME] capture more customers. Let me show you exactly how this works."

[DEMO FLOW - 5 minutes]
1. Show the dashboard: "This is what you'll see - real-time call logs, lead quality scores, and revenue tracking."

2. Play sample call: "Let's listen to how our AI handles a typical call for your business..."
   - Professional greeting
   - Service qualification  
   - Appointment booking
   - Follow-up scheduling

3. Show SMS alerts: "You get instant notifications like this when urgent calls come in."

4. Show calendar integration: "Appointments automatically sync to your calendar."

[OBJECTION HANDLING - 3 minutes]
Common objections and responses:

"It sounds expensive"
- "It's actually $200/month plus 40% of new bookings we generate. Since you're only paying when we bring you new business, it's really a revenue-sharing partnership."

"What if it doesn't work for my business?"
- "That's why we offer a 30-day free trial. If you don't see results, you pay nothing."

"I need to think about it"
- "I understand. What specific concerns do you have? I can address those right now."

[CLOSING - 2 minutes]
"Based on what you've seen, does this make sense for [BUSINESS_NAME]? 

The next step would be to set up your free trial. We'll need about 30 minutes to configure everything and get your AI receptionist trained on your specific services and pricing.

When would be a good time to get started?"`,
      duration: '10-12 minutes',
      success_rate: 85,
      last_used: '3 hours ago'
    },
    {
      id: '4',
      title: 'Follow-up Call',
      type: 'follow_up',
      content: `Hi [NAME], this is [YOUR_NAME] from CloudGreet. I wanted to follow up on the demo I sent you last week about the AI receptionist for [BUSINESS_NAME].

Have you had a chance to review the information I sent?

[IF YES - GET FEEDBACK]
What are your thoughts? Do you have any questions about how this would work for your business?

[IF NO - RE-ENGAGE]
No problem! I know you're busy running [BUSINESS_NAME]. Let me quickly recap why this is so valuable:

- You'll never miss another potential customer
- Our AI qualifies every lead and books appointments automatically  
- You get SMS alerts for urgent calls
- We only get paid when we bring you new business

Would you be interested in a quick 10-minute call this week to see how this works? I can show you the exact setup for [BUSINESS_NAME].

[IF INTERESTED]
Great! What day works better - Tuesday or Wednesday? I have slots at 2pm or 4pm.

[IF NOT INTERESTED]
I understand. Can I ask what's holding you back? Is it the cost, the technology, or something else? I'd love to address your concerns.

[CLOSING]
Either way, I'll send you a few case studies of similar businesses that are now booking 40-60% more jobs with our AI receptionist. You might find them interesting.

Have a great day, [NAME]!`,
      duration: '3-4 minutes',
      success_rate: 72,
      last_used: '1 hour ago'
    }
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cold_call': return <Phone className="w-5 h-5" />
      case 'email': return <Mail className="w-5 h-5" />
      case 'demo': return <Play className="w-5 h-5" />
      case 'follow_up': return <MessageSquare className="w-5 h-5" />
      default: return <MessageSquare className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cold_call': return 'bg-red-100 text-red-800'
      case 'email': return 'bg-blue-100 text-blue-800'
      case 'demo': return 'bg-green-100 text-green-800'
      case 'follow_up': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const copyToClipboard = (content: string, scriptId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedScript(scriptId)
    setTimeout(() => setCopiedScript(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sales Scripts</h1>
          <p className="text-gray-600 mt-2">Proven scripts for cold calling, emails, and demos</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Scripts</p>
                <p className="text-3xl font-bold text-gray-900">{scripts.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Success Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {Math.round(scripts.reduce((sum, s) => sum + s.success_rate, 0) / scripts.length)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Most Used</p>
                <p className="text-lg font-bold text-purple-600">Cold Call</p>
              </div>
              <Phone className="w-8 h-8 text-purple-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Best Convertor</p>
                <p className="text-lg font-bold text-green-600">Demo Script</p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>
        </div>

        {/* Scripts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scripts.map((script, index) => (
            <motion.div
              key={script.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedScript(script)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(script.type)}`}>
                      {getTypeIcon(script.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{script.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(script.type)}`}>
                        {script.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(script.content, script.id)
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {copiedScript === script.id ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{script.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>{script.success_rate}% success rate</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Last used: {script.last_used}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${script.success_rate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Script Detail Modal */}
        {selectedScript && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedScript.title}</h2>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium gap-2 ${getTypeColor(selectedScript.type)}`}>
                        {getTypeIcon(selectedScript.type)}
                        {selectedScript.type.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-600">Duration: {selectedScript.duration}</span>
                      <span className="text-sm text-gray-600">Success Rate: {selectedScript.success_rate}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(selectedScript.content, selectedScript.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      {copiedScript === selectedScript.id ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedScript(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">Script Content:</h3>
                  <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                    {selectedScript.content}
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Replace [NAME], [BUSINESS_NAME], etc. with actual details</li>
                    <li>• Pause after questions to let them respond</li>
                    <li>• Listen more than you talk</li>
                    <li>• Always end with a clear next step</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
