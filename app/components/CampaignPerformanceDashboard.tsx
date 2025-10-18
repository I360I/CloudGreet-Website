'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Mail, 
  MessageSquare, 
  Target, 
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Eye,
  MousePointer,
  Reply,
  Star,
  Zap,
  Globe,
  Smartphone,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'

interface CampaignMetrics {
  campaignId: string
  campaignName: string
  totalSent: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  totalConverted: number
  openRate: number
  clickRate: number
  replyRate: number
  conversionRate: number
  revenue: number
  cost: number
  roi: number
  avgTimeToConvert: number
  lastActivity: string
}

interface FunnelData {
  stage: string
  leads: number
  conversions: number
  conversionRate: number
  dropOffRate: number
  avgTime: number
}

interface TopPerformingCampaign {
  campaignId: string
  campaignName: string
  conversionRate: number
  revenue: number
  roi: number
  trend: 'up' | 'down' | 'stable'
}

interface LeadEngagement {
  leadId: string
  businessName: string
  engagementScore: number
  lastActivity: string
  status: string
  totalInteractions: number
  conversionProbability: number
}

export default function CampaignPerformanceDashboard() {
  const [metrics, setMetrics] = useState<CampaignMetrics[]>([])
  const [funnelData, setFunnelData] = useState<FunnelData[]>([])
  const [topCampaigns, setTopCampaigns] = useState<TopPerformingCampaign[]>([])
  const [engagedLeads, setEngagedLeads] = useState<LeadEngagement[]>([])
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [timeframe])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Simulate API calls - in real implementation, these would fetch from your APIs
      const mockMetrics: CampaignMetrics[] = [
        {
          campaignId: 'camp_1',
          campaignName: 'HVAC Initial Outreach',
          totalSent: 150,
          totalDelivered: 145,
          totalOpened: 98,
          totalClicked: 45,
          totalReplied: 23,
          totalConverted: 8,
          openRate: 67.6,
          clickRate: 31.0,
          replyRate: 15.9,
          conversionRate: 5.5,
          revenue: 16000,
          cost: 500,
          roi: 3100,
          avgTimeToConvert: 7.2,
          lastActivity: '2024-01-15T10:30:00Z'
        },
        {
          campaignId: 'camp_2',
          campaignName: 'Plumbing Emergency Sequence',
          totalSent: 89,
          totalDelivered: 87,
          totalOpened: 67,
          totalClicked: 34,
          totalReplied: 18,
          totalConverted: 6,
          openRate: 77.0,
          clickRate: 39.1,
          replyRate: 20.7,
          conversionRate: 6.9,
          revenue: 12000,
          cost: 300,
          roi: 3900,
          avgTimeToConvert: 4.8,
          lastActivity: '2024-01-15T09:15:00Z'
        },
        {
          campaignId: 'camp_3',
          campaignName: 'Roofing Storm Season',
          totalSent: 67,
          totalDelivered: 65,
          totalOpened: 42,
          totalClicked: 19,
          totalReplied: 12,
          totalConverted: 4,
          openRate: 64.6,
          clickRate: 29.2,
          replyRate: 18.5,
          conversionRate: 6.2,
          revenue: 8000,
          cost: 200,
          roi: 3900,
          avgTimeToConvert: 5.5,
          lastActivity: '2024-01-14T16:45:00Z'
        }
      ]

      const mockFunnelData: FunnelData[] = [
        { stage: 'New Leads', leads: 1000, conversions: 0, conversionRate: 0, dropOffRate: 0, avgTime: 0 },
        { stage: 'Contacted', leads: 800, conversions: 0, conversionRate: 20, dropOffRate: 20, avgTime: 1 },
        { stage: 'Opened Email', leads: 400, conversions: 0, conversionRate: 50, dropOffRate: 50, avgTime: 2 },
        { stage: 'Clicked Link', leads: 200, conversions: 0, conversionRate: 50, dropOffRate: 50, avgTime: 3 },
        { stage: 'Replied', leads: 100, conversions: 0, conversionRate: 50, dropOffRate: 50, avgTime: 5 },
        { stage: 'Demo Scheduled', leads: 50, conversions: 0, conversionRate: 50, dropOffRate: 50, avgTime: 7 },
        { stage: 'Demo Completed', leads: 30, conversions: 0, conversionRate: 60, dropOffRate: 40, avgTime: 10 },
        { stage: 'Proposal Sent', leads: 20, conversions: 0, conversionRate: 66.7, dropOffRate: 33.3, avgTime: 12 },
        { stage: 'Client Converted', leads: 10, conversions: 10, conversionRate: 50, dropOffRate: 0, avgTime: 14 }
      ]

      const mockTopCampaigns: TopPerformingCampaign[] = [
        {
          campaignId: 'camp_2',
          campaignName: 'Plumbing Emergency Sequence',
          conversionRate: 6.9,
          revenue: 12000,
          roi: 3900,
          trend: 'up'
        },
        {
          campaignId: 'camp_1',
          campaignName: 'HVAC Initial Outreach',
          conversionRate: 5.5,
          revenue: 16000,
          roi: 3100,
          trend: 'stable'
        },
        {
          campaignId: 'camp_3',
          campaignName: 'Roofing Storm Season',
          conversionRate: 6.2,
          revenue: 8000,
          roi: 3900,
          trend: 'down'
        }
      ]

      const mockEngagedLeads: LeadEngagement[] = [
        {
          leadId: 'lead_1',
          businessName: 'Miami HVAC Solutions',
          engagementScore: 85,
          lastActivity: '2024-01-15T10:30:00Z',
          status: 'demo_scheduled',
          totalInteractions: 12,
          conversionProbability: 75
        },
        {
          leadId: 'lead_2',
          businessName: 'Emergency Plumbing Pro',
          engagementScore: 78,
          lastActivity: '2024-01-15T09:15:00Z',
          status: 'interested',
          totalInteractions: 8,
          conversionProbability: 65
        },
        {
          leadId: 'lead_3',
          businessName: 'Storm Roofing Experts',
          engagementScore: 72,
          lastActivity: '2024-01-14T16:45:00Z',
          status: 'replied',
          totalInteractions: 6,
          conversionProbability: 55
        }
      ]

      setMetrics(mockMetrics)
      setFunnelData(mockFunnelData)
      setTopCampaigns(mockTopCampaigns)
      setEngagedLeads(mockEngagedLeads)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-green-500" />
      case 'down': return <ArrowDown className="w-4 h-4 text-red-500" />
      default: return <div className="w-4 h-4 bg-gray-500 rounded-full" />
    }
  }

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'demo_scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'interested': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'replied': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Campaign Performance Dashboard</h1>
            <p className="text-gray-400">Track and optimize your automated campaigns</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-green-500">+12.5%</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">1,247</h3>
            <p className="text-gray-400">Total Leads</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Target className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-2xl font-bold text-green-500">+8.3%</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">18</h3>
            <p className="text-gray-400">Conversions</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-2xl font-bold text-green-500">+15.2%</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">$36,000</h3>
            <p className="text-gray-400">Revenue</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-green-500">+5.1%</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">6.1%</h3>
            <p className="text-gray-400">Conversion Rate</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Campaign Performance */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Campaign Performance</h3>
              <Filter className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {metrics.map((metric, index) => (
                <motion.div
                  key={metric.campaignId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-700/50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{metric.campaignName}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">{metric.conversionRate.toFixed(1)}%</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-400">Open Rate</span>
                      </div>
                      <span className="font-semibold">{metric.openRate.toFixed(1)}%</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MousePointer className="w-4 h-4 text-green-400" />
                        <span className="text-gray-400">Click Rate</span>
                      </div>
                      <span className="font-semibold">{metric.clickRate.toFixed(1)}%</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Reply className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-400">Reply Rate</span>
                      </div>
                      <span className="font-semibold">{metric.replyRate.toFixed(1)}%</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-purple-400" />
                        <span className="text-gray-400">Revenue</span>
                      </div>
                      <span className="font-semibold">${metric.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Conversion Funnel</h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-3">
              {funnelData.map((stage, index) => (
                <motion.div
                  key={stage.stage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{stage.stage}</h4>
                      <p className="text-sm text-gray-400">{stage.leads} leads</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{stage.conversionRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-400">{stage.avgTime}d avg</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Campaigns */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Top Performing Campaigns</h3>
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            
            <div className="space-y-4">
              {topCampaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.campaignId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold">#{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{campaign.campaignName}</h4>
                      <p className="text-sm text-gray-400">{campaign.conversionRate.toFixed(1)}% conversion</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">${campaign.revenue.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">{campaign.roi}% ROI</div>
                    </div>
                    {getTrendIcon(campaign.trend)}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Most Engaged Leads */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Most Engaged Leads</h3>
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            
            <div className="space-y-4">
              {engagedLeads.map((lead, index) => (
                <motion.div
                  key={lead.leadId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold">{lead.engagementScore}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{lead.businessName}</h4>
                      <p className="text-sm text-gray-400">{lead.totalInteractions} interactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${getEngagementColor(lead.engagementScore)}`}>
                      {lead.engagementScore}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(lead.status)}`}>
                      {lead.status.replace('_', ' ')}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

