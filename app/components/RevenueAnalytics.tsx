'use client'

import { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import LoadingSpinner from './LoadingSpinner'

interface RevenueData {
  totalRevenue: number
  monthlyGrowth: number
  averageDealSize: number
  conversionRate: number
  upsellRevenue: number
  retentionRate: number
  forecast: Array<{
    month: string
    predictedRevenue: number
    confidence: number
  }>
}

interface LeadScoringData {
  highPriority: number
  mediumPriority: number
  lowPriority: number
  totalLeads: number
  conversionRate: number
}

interface UpsellOpportunities {
  totalOpportunities: number
  totalValue: number
  topServices: Array<{
    service: string
    value: number
    conversionRate: number
  }>
}

export default function RevenueAnalytics({ businessId }: { businessId: string }) {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [leadData, setLeadData] = useState<LeadScoringData | null>(null)
  const [upsellData, setUpsellData] = useState<UpsellOpportunities | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      
      // Fetch revenue forecast
      const forecastResponse = await fetch('/api/ai/revenue-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revenue_forecast',
          businessId,
          months: 6
        })
      })

      if (forecastResponse.ok) {
        const forecastResult = await forecastResponse.json()
        setRevenueData(forecastResult.data)
      }

      // Fetch lead scoring data
      const leadsResponse = await fetch('/api/ai/revenue-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'retention_analysis',
          businessId
        })
      })

      if (leadsResponse.ok) {
        const leadsResult = await leadsResponse.json()
        setLeadData(leadsResult.data)
      }

    } catch (error) {
      console.error('Error fetching revenue data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRevenueData()
  }, [businessId])

  const runUpsellAnalysis = async () => {
    try {
      const response = await fetch('/api/ai/revenue-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_upsells',
          businessId,
          customerId: 'sample-customer'
        })
      })

      if (response.ok) {
        const result = await response.json()
        setUpsellData(result.data)
      }
    } catch (error) {
      console.error('Error running upsell analysis:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Loading revenue analytics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">💰 Revenue Analytics & Optimization</h2>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setActiveTab('overview')}
              variant={activeTab === 'overview' ? 'primary' : 'secondary'}
            >
              Overview
            </Button>
            <Button 
              onClick={() => setActiveTab('leads')}
              variant={activeTab === 'leads' ? 'primary' : 'secondary'}
            >
              Lead Scoring
            </Button>
            <Button 
              onClick={() => setActiveTab('upsells')}
              variant={activeTab === 'upsells' ? 'primary' : 'secondary'}
            >
              Upsell Opportunities
            </Button>
          </div>
        </div>
      </Card>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600">
              ${revenueData?.totalRevenue?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              +{revenueData?.monthlyGrowth || 0}% this month
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Average Deal Size</h3>
            <p className="text-3xl font-bold text-blue-600">
              ${revenueData?.averageDealSize || 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Target: $500+
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Conversion Rate</h3>
            <p className="text-3xl font-bold text-purple-600">
              {revenueData?.conversionRate || 0}%
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Industry avg: 15%
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Upsell Revenue</h3>
            <p className="text-3xl font-bold text-orange-600">
              ${revenueData?.upsellRevenue || 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              +30% potential
            </p>
          </Card>
        </div>
      )}

      {/* Revenue Forecast */}
      {activeTab === 'overview' && revenueData?.forecast && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">📈 Revenue Forecast</h3>
          <div className="space-y-3">
            {revenueData.forecast.map((forecast, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{forecast.month}</p>
                  <p className="text-sm text-gray-600">
                    Confidence: {Math.round(forecast.confidence * 100)}%
                  </p>
                </div>
                <p className="text-xl font-bold text-green-600">
                  ${forecast.predictedRevenue.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lead Scoring Tab */}
      {activeTab === 'leads' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">🔥 High Priority Leads</h3>
            <p className="text-3xl font-bold text-red-600">
              {leadData?.highPriority || 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Call immediately
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">⚡ Medium Priority</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {leadData?.mediumPriority || 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Follow up today
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">📋 Standard Leads</h3>
            <p className="text-3xl font-bold text-blue-600">
              {leadData?.lowPriority || 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Follow up within 24h
            </p>
          </Card>
        </div>
      )}

      {/* Upsell Opportunities Tab */}
      {activeTab === 'upsells' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">💎 Upsell Opportunities</h3>
              <Button onClick={runUpsellAnalysis}>
                Analyze Opportunities
              </Button>
            </div>
            
            {upsellData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Total Opportunities</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {upsellData.totalOpportunities}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total Value: ${upsellData.totalValue.toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Top Services</h4>
                  <div className="space-y-2">
                    {upsellData.topServices.map((service, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{service.service}</span>
                        <span className="font-bold">
                          ${service.value} ({Math.round(service.conversionRate * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Action Items */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">🎯 Revenue Optimization Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded">
            <h4 className="font-semibold text-blue-800">Lead Qualification</h4>
            <p className="text-sm text-blue-600 mt-1">
              Ask about urgency, budget, and timeline to prioritize high-value leads
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded">
            <h4 className="font-semibold text-green-800">Upselling</h4>
            <p className="text-sm text-green-600 mt-1">
              Present maintenance plans, extended warranties, and premium services
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded">
            <h4 className="font-semibold text-purple-800">Dynamic Pricing</h4>
            <p className="text-sm text-purple-600 mt-1">
              Adjust pricing based on demand, urgency, and customer profile
            </p>
          </div>
          
          <div className="p-4 bg-orange-50 rounded">
            <h4 className="font-semibold text-orange-800">Customer Retention</h4>
            <p className="text-sm text-orange-600 mt-1">
              Follow up with existing customers for repeat business and referrals
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
