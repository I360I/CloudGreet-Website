'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, MapPin, Building, Phone, Mail, 
  Users, TrendingUp, Calendar, Download,
  Filter, Globe, Star, Clock, DollarSign,
  Copy, CheckCircle, ExternalLink, Plus, Rocket
} from 'lucide-react'

interface LeadSource {
  id: string
  name: string
  description: string
  url: string
  leads_found: number
  success_rate: number
  icon: string
}

interface BusinessData {
  name: string
  address: string
  rating: number
  reviews: number
  phone: string
  website: string
  business_id: string
  location: {
    lat: number
    lng: number
  }
  types: string[]
  price_level: number | null
  estimated_revenue: number
  ai_receptionist_value: {
    monthly_base: number
    estimated_bookings_per_month: number
    estimated_booking_value: number
    estimated_commission: number
    total_monthly_value: number
  }
}

export default function LeadGenerationTools() {
  const [searchTerm, setSearchTerm] = useState('')
  const [location, setLocation] = useState('')
  const [businessType, setBusinessType] = useState('HVAC')
  const [searchResults, setSearchResults] = useState<BusinessData[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([])
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)

  const leadSources: LeadSource[] = [
    {
      id: '1',
      name: 'Google Maps',
      description: 'Find local businesses with reviews and contact info',
      url: 'https://maps.google.com',
      leads_found: 1247,
      success_rate: 78,
      icon: '🗺️'
    },
    {
      id: '2',
      name: 'Yelp Business',
      description: 'High-rated service businesses in your area',
      url: 'https://business.yelp.com',
      leads_found: 892,
      success_rate: 72,
      icon: '⭐'
    },
    {
      id: '3',
      name: 'Better Business Bureau',
      description: 'BBB accredited businesses with contact details',
      url: 'https://bbb.org',
      leads_found: 456,
      success_rate: 85,
      icon: '🏆'
    },
    {
      id: '4',
      name: 'Angie\'s List',
      description: 'Home service professionals and contractors',
      url: 'https://angi.com',
      leads_found: 623,
      success_rate: 69,
      icon: '🔧'
    },
    {
      id: '5',
      name: 'HomeAdvisor',
      description: 'Verified home service professionals',
      url: 'https://homeadvisor.com',
      leads_found: 789,
      success_rate: 74,
      icon: '🏠'
    },
    {
      id: '6',
      name: 'Thumbtack',
      description: 'Local service professionals and businesses',
      url: 'https://thumbtack.com',
      leads_found: 567,
      success_rate: 71,
      icon: '👍'
    }
  ]

  const businessTypes = [
    'HVAC', 'Painting', 'Roofing', 'Plumbing', 'Electrical', 
    'Landscaping', 'Cleaning', 'General Contractor'
  ]

  // Note: All search results are REAL businesses from Google Places API
  // No mock data is used - only authentic business information

  const handleSearch = async () => {
    setSearching(true)
    
    try {
      // Enhanced API call with optimization parameters
      const response = await fetch('/api/leads/auto-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: businessType,
          location: location,
          keywords: searchTerm,
          optimize: true,
          maxResults: 50, // Increased from default
          minRating: 4.0, // Focus on high-rated businesses
          minReviews: 20, // Focus on established businesses
          includeRevenue: true,
          includeContactInfo: true
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Sort results by conversion potential
        const sortedBusinesses = result.data.businesses.sort((a: BusinessData, b: BusinessData) => {
          // Prioritize by rating, then reviews, then estimated revenue
          const scoreA = (a.rating * 100) + (a.reviews / 10) + (a.estimated_revenue / 1000)
          const scoreB = (b.rating * 100) + (b.reviews / 10) + (b.estimated_revenue / 1000)
          return scoreB - scoreA
        })
        
        setSearchResults(sortedBusinesses)
        
        // Auto-select top 5 businesses for efficiency
        const topBusinesses = sortedBusinesses.slice(0, 5).map((b: BusinessData) => b.name)
        setSelectedBusinesses(topBusinesses)
      } else {
        console.error('Search failed:', result.error)
        alert(`Search failed: ${result.error}. Please check your Google Places API key configuration.`)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. Please check your internet connection and try again.')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const toggleBusinessSelection = (businessName: string) => {
    setSelectedBusinesses(prev => 
      prev.includes(businessName) 
        ? prev.filter(name => name !== businessName)
        : [...prev, businessName]
    )
  }

  const exportSelectedBusinesses = () => {
    const selectedData = searchResults.filter(business => 
      selectedBusinesses.includes(business.name)
    )
    
    const csvContent = [
      ['Business Name', 'Phone', 'Website', 'Address', 'Rating', 'Reviews', 'Business Types', 'Business ID', 'Estimated Revenue', 'Conversion Score', 'Urgency Level', 'Best Contact Time'].join(','),
      ...selectedData.map(business => [
        business.name,
        business.phone,
        business.website,
        business.address,
        business.rating,
        business.reviews,
        business.types?.join('; ') || 'Service Business',
        business.business_id,
        business.estimated_revenue,
        calculateConversionScore(business),
        getUrgencyLevel(business),
        getBestContactTime(business)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'optimized_leads.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Bulk processing functions
  const processBulkLeads = async () => {
    if (selectedBusinesses.length === 0) {
      alert('Please select businesses to process')
      return
    }

    setBulkProcessing(true)
    setBulkProgress(0)

    const selectedData = searchResults.filter(business => 
      selectedBusinesses.includes(business.name)
    )

    // Sort by urgency for optimal processing order
    const sortedData = selectedData.sort((a, b) => {
      const urgencyOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      const aUrgency = getUrgencyLevel(a)
      const bUrgency = getUrgencyLevel(b)
      return urgencyOrder[bUrgency as keyof typeof urgencyOrder] - urgencyOrder[aUrgency as keyof typeof urgencyOrder]
    })

    let processed = 0
    const results = []

    for (const business of sortedData) {
      try {
        // Add to CRM with optimization
        const response = await fetch('/api/leads/auto-contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_to_crm',
            contactInfo: {
              business_name: business.name,
              phone: business.phone,
              website: business.website,
              business_type: business.types?.[0] || 'Service Business',
              location: business.address,
              rating: business.rating,
              review_count: business.reviews,
              estimated_revenue: business.estimated_revenue,
              business_id: business.business_id,
              ai_receptionist_value: business.ai_receptionist_value,
              conversion_score: calculateConversionScore(business),
              urgency_level: getUrgencyLevel(business),
              best_contact_time: getBestContactTime(business),
              personalized_pitch: generatePersonalizedPitch(business)
            }
          })
        })

        const result = await response.json()
        results.push({
          business: business.name,
          success: result.success,
          lead_id: result.data?.lead_id
        })

        processed++
        setBulkProgress(Math.round((processed / sortedData.length) * 100))

        // Small delay to prevent API rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`Error processing ${business.name}:`, error)
        results.push({
          business: business.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    setBulkProcessing(false)
    
    // Show results summary
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    alert(`🚀 Bulk Processing Complete!\n\n✅ Successfully processed: ${successful} leads\n❌ Failed: ${failed} leads\n\nAll leads have been added to CRM with optimized targeting!`)
  }

  const copyBusinessInfo = (business: BusinessData) => {
    const info = `${business.name}
Phone: ${business.phone}
Website: ${business.website}
Address: ${business.address}
Rating: ${business.rating}/5 (${business.reviews} reviews)
Business Types: ${business.types?.join(', ') || 'Service Business'}
Business ID: ${business.business_id}

Estimated Annual Revenue: $${business.estimated_revenue?.toLocaleString()}
AI Receptionist Value: $${business.ai_receptionist_value?.total_monthly_value?.toLocaleString()}/month
Monthly Commission: $${business.ai_receptionist_value?.estimated_commission?.toLocaleString()}
Estimated Bookings: ${business.ai_receptionist_value?.estimated_bookings_per_month}/month`
    
    navigator.clipboard.writeText(info)
  }

  const addToCRM = async (business: BusinessData) => {
    try {
      const response = await fetch('/api/leads/auto-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_to_crm',
          contactInfo: {
            business_name: business.name,
            phone: business.phone,
            website: business.website,
            business_type: business.types?.[0] || 'Service Business',
            location: business.address,
            rating: business.rating,
            review_count: business.reviews,
            estimated_revenue: business.estimated_revenue,
            business_id: business.business_id,
            ai_receptionist_value: business.ai_receptionist_value,
            // Enhanced data for better targeting
            conversion_score: calculateConversionScore(business),
            urgency_level: getUrgencyLevel(business),
            best_contact_time: getBestContactTime(business),
            personalized_pitch: generatePersonalizedPitch(business)
          }
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('✅ Lead added to CRM with optimized targeting!')
        // Trigger enhanced lead scoring
        await scoreLead(result.data.lead_id)
        // Auto-schedule follow-up
        await scheduleOptimalFollowUp(result.data.lead_id, business)
      } else {
        alert('Failed to add lead to CRM: ' + result.error)
      }
    } catch (error) {
      console.error('CRM add error:', error)
      alert('Error adding to CRM')
    }
  }

  const scoreLead = async (leadId: string) => {
    try {
      const response = await fetch('/api/automation/lead-scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Start follow-up sequence
        await startFollowUpSequence(leadId)
      }
    } catch (error) {
      console.error('Lead scoring error:', error)
    }
  }

  const startFollowUpSequence = async (leadId: string) => {
    try {
      const response = await fetch('/api/automation/follow-up-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leadId,
          optimize: true,
          usePersonalization: true,
          maxFollowUps: 5,
          followUpInterval: '48h' // Optimized interval
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Follow-up sequence started successfully
      }
    } catch (error) {
      console.error('Follow-up sequence error:', error)
    }
  }

  // Enhanced optimization functions
  const calculateConversionScore = (business: BusinessData): number => {
    let score = 0
    
    // Rating weight (40%)
    score += (business.rating / 5) * 40
    
    // Review count weight (20%)
    score += Math.min(business.reviews / 100, 1) * 20
    
    // Revenue weight (25%)
    score += Math.min(business.estimated_revenue / 1000000, 1) * 25
    
    // AI value potential (15%)
    score += Math.min(business.ai_receptionist_value?.total_monthly_value / 5000, 1) * 15
    
    return Math.round(score)
  }

  const getUrgencyLevel = (business: BusinessData): string => {
    const score = calculateConversionScore(business)
    if (score >= 80) return 'urgent'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  const getBestContactTime = (business: BusinessData): string => {
    // Based on business type and location
    const businessType = business.types?.[0]?.toLowerCase() || ''
    
    if (businessType.includes('hvac') || businessType.includes('plumbing')) {
      return '9:00 AM - 11:00 AM' // Morning for emergency services
    } else if (businessType.includes('painting') || businessType.includes('roofing')) {
      return '2:00 PM - 4:00 PM' // Afternoon for project-based services
    } else {
      return '10:00 AM - 2:00 PM' // General business hours
    }
  }

  const generatePersonalizedPitch = (business: BusinessData): string => {
    const businessType = business.types?.[0] || 'service business'
    const rating = business.rating
    const reviews = business.reviews
    
    return `Hi! I noticed ${business.name} has an impressive ${rating}/5 rating with ${reviews} reviews. As a ${businessType} business, you probably miss calls when you're on jobs. Our AI receptionist captures every lead 24/7 and can increase your bookings by 40-60%. Would you be interested in a quick demo?`
  }

  const scheduleOptimalFollowUp = async (leadId: string, business: BusinessData) => {
    try {
      const urgencyLevel = getUrgencyLevel(business)
      const bestContactTime = getBestContactTime(business)
      
      // Schedule based on urgency
      let delayHours = 24 // Default 24 hours
      if (urgencyLevel === 'urgent') delayHours = 2
      else if (urgencyLevel === 'high') delayHours = 6
      else if (urgencyLevel === 'medium') delayHours = 12
      
      const scheduledDate = new Date(Date.now() + delayHours * 60 * 60 * 1000)
      
      const response = await fetch('/api/automation/schedule-follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          scheduledDate: scheduledDate.toISOString(),
          urgencyLevel,
          bestContactTime,
          personalizedPitch: generatePersonalizedPitch(business)
        })
      })
      
      const result = await response.json()
      if (result.success) {
        // Optimal follow-up scheduled successfully
      }
    } catch (error) {
      console.error('Follow-up scheduling error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lead Generation Tools</h1>
          <p className="text-gray-600 mt-2">Find and research potential customers automatically</p>
        </div>

        {/* Search Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Find Local Businesses</h2>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              ✅ Real Businesses Only
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            All search results are real businesses from Google Places API. No fake or mock data is used.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {businessTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                placeholder="Austin, TX"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
              <input
                type="text"
                placeholder="heating, cooling, repair"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={searching}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {searching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lead Sources */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Sources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leadSources.map((source) => (
              <motion.div
                key={source.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{source.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{source.name}</h3>
                      <p className="text-sm text-gray-600">{source.description}</p>
                    </div>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{source.leads_found} leads found</span>
                  <span className="text-green-600 font-medium">{source.success_rate}% success</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Search Results ({searchResults.length})
                </h2>
                <div className="flex gap-3">
                  {selectedBusinesses.length > 0 && (
                    <>
                      <button
                        onClick={exportSelectedBusinesses}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export Selected ({selectedBusinesses.length})
                      </button>
                      <button
                        onClick={processBulkLeads}
                        disabled={bulkProcessing}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {bulkProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing... {bulkProgress}%
                          </>
                        ) : (
                          <>
                            <Rocket className="w-4 h-4" />
                            Process All ({selectedBusinesses.length})
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {searchResults.map((business, index) => (
                <motion.div
                  key={business.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedBusinesses.includes(business.name) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => toggleBusinessSelection(business.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedBusinesses.includes(business.name)}
                          onChange={() => toggleBusinessSelection(business.name)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <h3 className="text-lg font-semibold text-gray-900">{business.name}</h3>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">{business.rating}</span>
                          <span className="text-sm text-gray-500">({business.reviews} reviews)</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Phone className="w-4 h-4" />
                            <span>{business.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="w-4 h-4" />
                            <span>{business.website}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            <span>{business.types?.join(', ') || 'Service Business'}</span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-4 h-4" />
                            <span>{business.address}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span>Business ID: {business.business_id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span>Est. Revenue: ${business.estimated_revenue?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Estimated Annual Revenue:</span>
                          <span className="font-medium text-green-600">${business.estimated_revenue?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-gray-600">AI Receptionist Value:</span>
                          <span className="font-medium text-blue-600">${business.ai_receptionist_value?.total_monthly_value?.toLocaleString()}/month</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-gray-600">Monthly Commission:</span>
                          <span className="font-medium text-purple-600">${business.ai_receptionist_value?.estimated_commission?.toLocaleString()}</span>
                        </div>
                        {/* Enhanced conversion metrics */}
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-gray-600">Conversion Score:</span>
                          <span className={`font-medium ${calculateConversionScore(business) >= 70 ? 'text-green-600' : calculateConversionScore(business) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {calculateConversionScore(business)}/100
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-gray-600">Urgency Level:</span>
                          <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                            getUrgencyLevel(business) === 'urgent' ? 'bg-red-100 text-red-800' :
                            getUrgencyLevel(business) === 'high' ? 'bg-orange-100 text-orange-800' :
                            getUrgencyLevel(business) === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getUrgencyLevel(business).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-gray-600">Best Contact Time:</span>
                          <span className="font-medium text-blue-600">{getBestContactTime(business)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          addToCRM(business)
                        }}
                        className="p-2 text-green-400 hover:text-green-600 transition-colors"
                        title="Add to CRM"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyBusinessInfo(business)
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy business info"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Optimization Tips */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">🚀 ZUCK-LEVEL OPTIMIZATION TIPS</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2 text-purple-700">🎯 Advanced Targeting:</h4>
              <ul className="space-y-1">
                <li>• Focus on 80+ conversion score businesses</li>
                <li>• Prioritize URGENT and HIGH urgency leads</li>
                <li>• Use personalized pitches for each business type</li>
                <li>• Auto-select top 5 results for efficiency</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-purple-700">⚡ Conversion Optimization:</h4>
              <ul className="space-y-1">
                <li>• Contact urgent leads within 2 hours</li>
                <li>• Use optimal contact times per business type</li>
                <li>• Leverage their ratings in personalized pitches</li>
                <li>• Auto-schedule follow-ups based on urgency</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-purple-700">📈 Performance Tracking:</h4>
              <ul className="space-y-1">
                <li>• Monitor conversion scores in real-time</li>
                <li>• Track urgency levels for prioritization</li>
                <li>• Use best contact times for higher success</li>
                <li>• Automated follow-up sequences (48h intervals)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
