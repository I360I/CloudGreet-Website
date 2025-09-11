'use client'

import { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  Star,
  Filter,
  Download,
  Play,
  Pause,
  Volume2,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

interface ConversationData {
  id: string
  timestamp: Date
  duration: number
  caller: string
  phoneNumber: string
  sentiment: 'positive' | 'neutral' | 'negative'
  topics: string[]
  keywords: string[]
  outcome: 'booking' | 'no_booking' | 'callback' | 'not_interested'
  satisfaction: number
  transcript: string
  audioUrl?: string
  aiResponseTime: number
  humanHandoff: boolean
}

interface AnalyticsMetrics {
  totalConversations: number
  averageDuration: number
  bookingRate: number
  satisfactionScore: number
  sentimentBreakdown: {
    positive: number
    neutral: number
    negative: number
  }
  topTopics: Array<{ topic: string; count: number; percentage: number }>
  peakHours: Array<{ hour: number; count: number }>
  responseTime: number
}

export default function ConversationAnalytics() {
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative' | 'bookings'>('all')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchConversationData()
  }, [dateRange])

  const fetchConversationData = async () => {
    setIsLoading(true)
    try {
      // Simulate API call with realistic conversation data
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const mockConversations: ConversationData[] = generateMockConversations()
      const mockAnalytics: AnalyticsMetrics = generateMockAnalytics(mockConversations)
      
      setConversations(mockConversations)
      setAnalytics(mockAnalytics)
    } catch (error) {
      console.error('Error fetching conversation data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockConversations = (): ConversationData[] => {
    const conversations: ConversationData[] = []
    const topics = ['HVAC Repair', 'Painting Quote', 'Roofing Inspection', 'Emergency Service', 'Maintenance', 'Installation']
    const outcomes: ConversationData['outcome'][] = ['booking', 'no_booking', 'callback', 'not_interested']
    const sentiments: ConversationData['sentiment'][] = ['positive', 'neutral', 'negative']
    
    for (let i = 0; i < 50; i++) {
      const timestamp = new Date()
      timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 30))
      timestamp.setHours(Math.floor(Math.random() * 12) + 8) // 8 AM to 8 PM
      
      conversations.push({
        id: `conv_${i}`,
        timestamp,
        duration: Math.floor(Math.random() * 300) + 60, // 1-6 minutes
        caller: `Customer ${i + 1}`,
        phoneNumber: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
        topics: topics.slice(0, Math.floor(Math.random() * 3) + 1),
        keywords: ['service', 'quote', 'available', 'schedule', 'emergency'].slice(0, Math.floor(Math.random() * 3) + 1),
        outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
        satisfaction: Math.floor(Math.random() * 2) + 3, // 3-5 stars
        transcript: generateMockTranscript(),
        aiResponseTime: Math.random() * 2 + 0.5, // 0.5-2.5 seconds
        humanHandoff: Math.random() < 0.15 // 15% handoff rate
      })
    }
    
    return conversations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  const generateMockTranscript = (): string => {
    const templates = [
      "AI: Hello, thank you for calling [Business Name]. How can I help you today?\nCustomer: Hi, I need a quote for painting my house.\nAI: I'd be happy to help you with a painting quote. What's the square footage of your home?\nCustomer: It's about 2,500 square feet.\nAI: Great! I can schedule a free estimate for you. What's your preferred time?\nCustomer: How about next Tuesday afternoon?\nAI: Perfect! I have 2 PM available. What's your address?\nCustomer: 123 Main Street.\nAI: Excellent! I've scheduled your estimate for Tuesday at 2 PM. You'll receive a confirmation text shortly.",
      "AI: Good morning! Thank you for calling [Business Name]. What can I do for you?\nCustomer: My AC isn't working and it's really hot.\nAI: I understand this is urgent. Are you experiencing any specific symptoms?\nCustomer: It's blowing warm air and making strange noises.\nAI: That sounds like it could be a compressor issue. I can send a technician out today. What's your address?\nCustomer: 456 Oak Avenue.\nAI: I have a technician available at 3 PM today. The service call fee is $89. Does that work for you?\nCustomer: Yes, that's fine.\nAI: Perfect! You'll receive a text confirmation and the technician will call 30 minutes before arrival."
    ]
    return templates[Math.floor(Math.random() * templates.length)]
  }

  const generateMockAnalytics = (conversations: ConversationData[]): AnalyticsMetrics => {
    const totalConversations = conversations.length
    const averageDuration = conversations.reduce((sum, conv) => sum + conv.duration, 0) / totalConversations
    const bookingRate = (conversations.filter(c => c.outcome === 'booking').length / totalConversations) * 100
    const satisfactionScore = conversations.reduce((sum, conv) => sum + conv.satisfaction, 0) / totalConversations
    
    const sentimentBreakdown = conversations.reduce((acc, conv) => {
      acc[conv.sentiment]++
      return acc
    }, { positive: 0, neutral: 0, negative: 0 })
    
    const topicCounts = conversations.reduce((acc, conv) => {
      conv.topics.forEach(topic => {
        acc[topic] = (acc[topic] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)
    
    const topTopics = Object.entries(topicCounts)
      .map(([topic, count]) => ({
        topic,
        count,
        percentage: (count / totalConversations) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    const peakHours = Array.from({ length: 12 }, (_, i) => ({
      hour: i + 8,
      count: conversations.filter(c => c.timestamp.getHours() === i + 8).length
    }))
    
    const responseTime = conversations.reduce((sum, conv) => sum + conv.aiResponseTime, 0) / totalConversations
    
    return {
      totalConversations,
      averageDuration: Math.round(averageDuration),
      bookingRate: Math.round(bookingRate * 10) / 10,
      satisfactionScore: Math.round(satisfactionScore * 10) / 10,
      sentimentBreakdown,
      topTopics,
      peakHours,
      responseTime: Math.round(responseTime * 10) / 10
    }
  }

  const filteredConversations = conversations.filter(conv => {
    switch (filter) {
      case 'positive':
        return conv.sentiment === 'positive'
      case 'negative':
        return conv.sentiment === 'negative'
      case 'bookings':
        return conv.outcome === 'booking'
      default:
        return true
    }
  })

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'negative':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      default:
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
    }
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'booking':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'callback':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
      case 'not_interested':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      default:
        return 'text-slate-600 bg-slate-100 dark:bg-slate-900/20'
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Date,Caller,Phone,Duration,Sentiment,Outcome,Satisfaction,Topics\n" +
      filteredConversations.map(conv => 
        `${conv.timestamp.toLocaleDateString()},${conv.caller},${conv.phoneNumber},${formatDuration(conv.duration)},${conv.sentiment},${conv.outcome},${conv.satisfaction},"${conv.topics.join('; ')}"`
      ).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `conversations_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Conversation Analytics</h2>
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-32 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-32 rounded-2xl"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Conversation Data</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Start taking calls to see conversation analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Conversation Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {analytics.totalConversations} conversations analyzed
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Date Range */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === range
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Filter */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {(['all', 'positive', 'negative', 'bookings'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  filter === f
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={exportData}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Conversations</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{analytics.totalConversations}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Last {dateRange}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-green-50 dark:from-slate-800 dark:to-green-900/20 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Booking Rate</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{analytics.bookingRate}%</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +5.2% from last period
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-purple-50 dark:from-slate-800 dark:to-purple-900/20 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Duration</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatDuration(analytics.averageDuration)}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Optimal: 2-4 minutes</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-orange-900/20 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Satisfaction</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{analytics.satisfactionScore}/5</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center">
                <Star className="w-3 h-3 mr-1" />
                Excellent rating
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Sentiment Analysis</h3>
          <div className="space-y-4">
            {Object.entries(analytics.sentimentBreakdown).map(([sentiment, count]) => (
              <div key={sentiment} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    sentiment === 'positive' ? 'bg-green-500' :
                    sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                    {sentiment}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        sentiment === 'positive' ? 'bg-green-500' :
                        sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${(count / analytics.totalConversations) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400 w-12 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Top Topics</h3>
          <div className="space-y-3">
            {analytics.topTopics.map((topic, index) => (
              <div key={topic.topic} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <span className="text-slate-900 dark:text-white font-medium">{topic.topic}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" 
                      style={{ width: `${topic.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400 w-8 text-right">
                    {topic.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Conversations</h3>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {filteredConversations.slice(0, 10).map((conversation) => (
            <div
              key={conversation.id}
              className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
              onClick={() => setSelectedConversation(conversation)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{conversation.caller}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(conversation.sentiment)}`}>
                        {conversation.sentiment}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOutcomeColor(conversation.outcome)}`}>
                        {conversation.outcome.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{conversation.phoneNumber}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {conversation.timestamp.toLocaleDateString()} at {conversation.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDuration(conversation.duration)}
                      </span>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < conversation.satisfaction
                                ? 'text-yellow-400 fill-current'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {conversation.audioUrl && (
                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Conversation Details</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {selectedConversation.caller} • {selectedConversation.phoneNumber}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Conversation Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Duration</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {formatDuration(selectedConversation.duration)}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Response Time</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedConversation.aiResponseTime}s
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Satisfaction</p>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < selectedConversation.satisfaction
                              ? 'text-yellow-400 fill-current'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Human Handoff</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedConversation.humanHandoff ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                {/* Topics and Keywords */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Topics Discussed</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedConversation.topics.map((topic) => (
                        <span key={topic} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedConversation.keywords.map((keyword) => (
                        <span key={keyword} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Transcript */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Conversation Transcript</h4>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 max-h-60 overflow-y-auto">
                    <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {selectedConversation.transcript}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
