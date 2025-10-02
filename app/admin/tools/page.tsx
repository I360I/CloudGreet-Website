'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, MapPin, Building, Phone, Mail, 
  Users, TrendingUp, Calendar, Download,
  Filter, Globe, Star, Clock, DollarSign,
  Copy, CheckCircle, ExternalLink, Plus
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
      // Real API call to auto-research endpoint
      const response = await fetch('/api/leads/auto-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: businessType,
          location: location,
          keywords: searchTerm
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSearchResults(result.data.businesses)
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
      ['Business Name', 'Phone', 'Website', 'Address', 'Rating', 'Reviews', 'Business Types', 'Business ID', 'Estimated Revenue'].join(','),
      ...selectedData.map(business => [
        business.name,
        business.phone,
        business.website,
        business.address,
        business.rating,
        business.reviews,
        business.types?.join('; ') || 'Service Business',
        business.business_id,
        business.estimated_revenue
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads.csv'
    a.click()
    window.URL.revokeObjectURL(url)
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
            ai_receptionist_value: business.ai_receptionist_value
          }
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('Lead added to CRM successfully!')
        // Trigger lead scoring
        await scoreLead(result.data.lead_id)
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
        console.log('Lead scored:', result.data)
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
        body: JSON.stringify({ leadId })
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('Follow-up sequence started:', result.data)
      }
    } catch (error) {
      console.error('Follow-up sequence error:', error)
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
                {selectedBusinesses.length > 0 && (
                  <button
                    onClick={exportSelectedBusinesses}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Selected ({selectedBusinesses.length})
                  </button>
                )}
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

        {/* Quick Tips */}
        <div className="mt-8 bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Lead Generation Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Best Search Strategies:</h4>
              <ul className="space-y-1">
                <li>• Search by business type + location</li>
                <li>• Look for businesses with 4+ star ratings</li>
                <li>• Focus on businesses with 50+ reviews</li>
                <li>• Target businesses with websites</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Cold Calling Approach:</h4>
              <ul className="space-y-1">
                <li>• Call during business hours (9-11am, 2-4pm)</li>
                <li>• Mention their high ratings in your pitch</li>
                <li>• Focus on revenue growth, not cost savings</li>
                <li>• Always end with a clear next step</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
