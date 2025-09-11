'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target, 
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

interface PredictionData {
  revenue: {
    current: number
    predicted: number
    confidence: number
    trend: 'up' | 'down' | 'stable'
    factors: string[]
  }
  bookings: {
    current: number
    predicted: number
    confidence: number
    peakHours: Array<{ hour: number; probability: number }>
    seasonalTrends: Array<{ month: string; factor: number }>
  }
  customerSatisfaction: {
    current: number
    predicted: number
    confidence: number
    riskFactors: string[]
    improvementSuggestions: string[]
  }
  marketInsights: {
    competitorAnalysis: {
      marketShare: number
      pricingComparison: number
      strengths: string[]
      opportunities: string[]
    }
    industryTrends: Array<{
      trend: string
      impact: 'high' | 'medium' | 'low'
      timeframe: string
      description: string
    }>
  }
  recommendations: Array<{
    type: 'revenue' | 'efficiency' | 'customer' | 'marketing'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    impact: string
    effort: 'low' | 'medium' | 'high'
    timeframe: string
  }>
}

export default function PredictiveAnalytics() {
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1m' | '3m' | '6m' | '1y'>('3m')
  const [activeTab, setActiveTab] = useState<'predictions' | 'insights' | 'recommendations'>('predictions')

  useEffect(() => {
    fetchPredictiveData()
  }, [selectedTimeframe])

  const fetchPredictiveData = async () => {
    setIsLoading(true)
    try {
      // Simulate AI-powered predictive analysis
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockData: PredictionData = {
        revenue: {
          current: 125400,
          predicted: 142800,
          confidence: 87,
          trend: 'up',
          factors: [
            'Seasonal demand increase (HVAC)',
            'Improved conversion rate',
            'New service offerings',
            'Market expansion'
          ]
        },
        bookings: {
          current: 156,
          predicted: 189,
          confidence: 82,
          peakHours: [
            { hour: 9, probability: 0.85 },
            { hour: 10, probability: 0.92 },
            { hour: 11, probability: 0.78 },
            { hour: 14, probability: 0.88 },
            { hour: 15, probability: 0.91 },
            { hour: 16, probability: 0.83 }
          ],
          seasonalTrends: [
            { month: 'Jan', factor: 0.8 },
            { month: 'Feb', factor: 0.9 },
            { month: 'Mar', factor: 1.1 },
            { month: 'Apr', factor: 1.2 },
            { month: 'May', factor: 1.3 },
            { month: 'Jun', factor: 1.4 },
            { month: 'Jul', factor: 1.5 },
            { month: 'Aug', factor: 1.4 },
            { month: 'Sep', factor: 1.2 },
            { month: 'Oct', factor: 1.1 },
            { month: 'Nov', factor: 0.9 },
            { month: 'Dec', factor: 0.8 }
          ]
        },
        customerSatisfaction: {
          current: 4.6,
          predicted: 4.8,
          confidence: 79,
          riskFactors: [
            'Response time variability',
            'Peak hour capacity',
            'Service quality consistency'
          ],
          improvementSuggestions: [
            'Implement AI response optimization',
            'Add customer feedback automation',
            'Enhance service quality monitoring'
          ]
        },
        marketInsights: {
          competitorAnalysis: {
            marketShare: 23.5,
            pricingComparison: 12,
            strengths: [
              'Superior AI technology',
              '24/7 availability',
              'Fast response times',
              'Industry specialization'
            ],
            opportunities: [
              'Expand to new markets',
              'Add premium services',
              'Improve customer retention',
              'Enhance mobile experience'
            ]
          },
          industryTrends: [
            {
              trend: 'AI Adoption',
              impact: 'high',
              timeframe: '6-12 months',
              description: 'Increasing demand for AI-powered customer service'
            },
            {
              trend: 'Mobile-First',
              impact: 'medium',
              timeframe: '3-6 months',
              description: 'Customers prefer mobile-optimized experiences'
            },
            {
              trend: 'Sustainability',
              impact: 'low',
              timeframe: '12+ months',
              description: 'Growing focus on eco-friendly service options'
            }
          ]
        },
        recommendations: [
          {
            type: 'revenue',
            priority: 'high',
            title: 'Optimize Peak Hour Pricing',
            description: 'Implement dynamic pricing during high-demand periods',
            impact: '+15% revenue increase',
            effort: 'medium',
            timeframe: '2-4 weeks'
          },
          {
            type: 'efficiency',
            priority: 'high',
            title: 'AI Response Optimization',
            description: 'Fine-tune AI responses based on conversation analytics',
            impact: '+20% conversion rate',
            effort: 'low',
            timeframe: '1-2 weeks'
          },
          {
            type: 'customer',
            priority: 'medium',
            title: 'Proactive Customer Outreach',
            description: 'Implement automated follow-up system for leads',
            impact: '+25% customer retention',
            effort: 'medium',
            timeframe: '3-6 weeks'
          },
          {
            type: 'marketing',
            priority: 'medium',
            title: 'Seasonal Campaign Strategy',
            description: 'Launch targeted campaigns for peak seasons',
            impact: '+30% booking increase',
            effort: 'high',
            timeframe: '4-8 weeks'
          }
        ]
      }
      
      setPredictionData(mockData)
    } catch (error) {
      console.error('Error fetching predictive data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-500" />
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-500" />
      default:
        return <Activity className="w-5 h-5 text-blue-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 dark:text-red-400'
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400'
      default:
        return 'text-green-600 dark:text-green-400'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI-Powered Predictions</h2>
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-32 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-48 rounded-2xl"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!predictionData) {
    return (
      <div className="text-center py-12">
        <Brain className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Predictive Data</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">AI is analyzing your data to generate predictions</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI-Powered Predictions</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Machine learning insights for your business
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Timeframe Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {(['1m', '3m', '6m', '1y'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTimeframe === timeframe
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {(['predictions', 'insights', 'recommendations'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          {/* Key Predictions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Revenue Prediction */}
            <div className="bg-gradient-to-br from-white to-green-50 dark:from-slate-800 dark:to-green-900/20 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                {getTrendIcon(predictionData.revenue.trend)}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Revenue Forecast</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Current</span>
                  <span className="font-medium">${predictionData.revenue.current.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Predicted</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    ${predictionData.revenue.predicted.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Confidence</span>
                  <span className="font-medium">{predictionData.revenue.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Bookings Prediction */}
            <div className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Booking Forecast</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Current</span>
                  <span className="font-medium">{predictionData.bookings.current}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Predicted</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {predictionData.bookings.predicted}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Confidence</span>
                  <span className="font-medium">{predictionData.bookings.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Satisfaction Prediction */}
            <div className="bg-gradient-to-br from-white to-purple-50 dark:from-slate-800 dark:to-purple-900/20 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Satisfaction Forecast</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Current</span>
                  <span className="font-medium">{predictionData.customerSatisfaction.current}/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Predicted</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {predictionData.customerSatisfaction.predicted}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Confidence</span>
                  <span className="font-medium">{predictionData.customerSatisfaction.confidence}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Peak Hours Analysis */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Peak Hours Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {predictionData.bookings.peakHours.map((hour) => (
                <div key={hour.hour} className="text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {hour.hour}:00
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-2">
                    <div 
                      className="h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" 
                      style={{ width: `${hour.probability * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {Math.round(hour.probability * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {/* Market Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Competitor Analysis</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Market Share</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {predictionData.marketInsights.competitorAnalysis.marketShare}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Pricing Advantage</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    +{predictionData.marketInsights.competitorAnalysis.pricingComparison}%
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {predictionData.marketInsights.competitorAnalysis.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Industry Trends</h3>
              <div className="space-y-4">
                {predictionData.marketInsights.industryTrends.map((trend, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">{trend.trend}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(trend.impact)}`}>
                        {trend.impact}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{trend.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{trend.timeframe}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {predictionData.recommendations.map((recommendation, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{recommendation.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(recommendation.priority)}`}>
                        {recommendation.priority} priority
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 mb-4">{recommendation.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Impact</span>
                    <span className={`text-sm font-medium ${getImpactColor(recommendation.impact.split(' ')[0])}`}>
                      {recommendation.impact}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Effort</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                      {recommendation.effort}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Timeframe</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {recommendation.timeframe}
                    </span>
                  </div>
                </div>
                
                <button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-xl font-medium transition-all duration-200">
                  Implement
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
