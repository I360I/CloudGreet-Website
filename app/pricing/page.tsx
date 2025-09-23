"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  Settings,
  ArrowLeft,
  Brain,
  Save,
  X,
  AlertCircle
} from 'lucide-react'

interface PricingRule {
  id: string
  service_type: 'hvac' | 'roofing' | 'painting'
  name: string
  description?: string
  base_price: number
  unit_type: 'per_sqft' | 'per_hour' | 'per_unit' | 'fixed'
  unit_price?: number
  min_price?: number
  max_price?: number
  is_active: boolean
}

export default function PricingPage() {
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddRule, setShowAddRule] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [businessId, setBusinessId] = useState('')

  useEffect(() => {
    // Get business ID from localStorage or API
    const token = localStorage.getItem('token')
    if (token) {
      // Get business ID from user data
      const user = localStorage.getItem('user')
      if (user) {
        const userData = JSON.parse(user)
        setBusinessId(userData.business_id || userData.id)
        loadPricingRules()
      }
    }
  }, [])

  const loadPricingRules = async () => {
    try {
      const response = await fetch(`/api/pricing/rules?business_id=${businessId}`)
      if (response.ok) {
        const data = await response.json()
        setPricingRules(data.rules || [])
      }
    } catch (error) {
      // Console error removed for production
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddRule = async (ruleData: Partial<PricingRule>) => {
    try {
      const response = await fetch('/api/pricing/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...ruleData,
          business_id: businessId
        })
      })

      if (response.ok) {
        await loadPricingRules()
        setShowAddRule(false)
      }
    } catch (error) {
      // Console error removed for production
    }
  }

  const handleUpdateRule = async (ruleData: Partial<PricingRule>) => {
    if (!editingRule) return

    try {
      const response = await fetch('/api/pricing/rules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          id: editingRule.id,
          ...ruleData
        })
      })

      if (response.ok) {
        await loadPricingRules()
        setEditingRule(null)
      }
    } catch (error) {
      // Console error removed for production
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/pricing/rules?id=${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        await loadPricingRules()
      }
    } catch (error) {
      // Console error removed for production
    }
  }

  const getServiceTypeColor = (serviceType: string) => {
    switch (serviceType) {
      case 'hvac': return 'bg-blue-600'
      case 'roofing': return 'bg-gray-600'
      case 'painting': return 'bg-green-600'
      default: return 'bg-purple-600'
    }
  }

  const getUnitTypeLabel = (unitType: string) => {
    switch (unitType) {
      case 'per_sqft': return '/sq ft'
      case 'per_hour': return '/hour'
      case 'per_unit': return '/unit'
      case 'fixed': return 'fixed'
      default: return ''
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Pricing Rules...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
                <ArrowLeft className="w-6 h-6 text-gray-300" />
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">CloudGreet</h1>
                    <p className="text-xs text-gray-400 font-medium">AI RECEPTIONIST</p>
                  </div>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Pricing Rules</h2>
            <p className="text-gray-400">Configure pricing rules for AI-generated quotes and estimates</p>
          </div>
          
          <button
            onClick={() => setShowAddRule(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Rule</span>
          </button>
        </div>

        {/* Pricing Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pricingRules.map((rule) => (
            <div key={rule.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getServiceTypeColor(rule.service_type)}`}>
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{rule.name}</h3>
                    <p className="text-gray-400 text-sm capitalize">{rule.service_type}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingRule(rule)}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-300" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              
              {rule.description && (
                <p className="text-gray-300 text-sm mb-4">{rule.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Base Price:</span>
                  <span className="text-white font-medium">${rule.base_price}</span>
                </div>
                
                {rule.unit_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Unit Price:</span>
                    <span className="text-white font-medium">
                      ${rule.unit_price}{getUnitTypeLabel(rule.unit_type)}
                    </span>
                  </div>
                )}
                
                {rule.min_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Min Price:</span>
                    <span className="text-white font-medium">${rule.min_price}</span>
                  </div>
                )}
                
                {rule.max_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Max Price:</span>
                    <span className="text-white font-medium">${rule.max_price}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {pricingRules.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Pricing Rules</h3>
            <p className="text-gray-400 mb-6">Create your first pricing rule to enable AI-generated quotes</p>
            <button
              onClick={() => setShowAddRule(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Add First Rule
            </button>
          </div>
        )}

        {/* Add/Edit Rule Modal */}
        {(showAddRule || editingRule) && (
          <RuleModal
            rule={editingRule}
            onSave={editingRule ? handleUpdateRule : handleAddRule}
            onClose={() => {
              setShowAddRule(false)
              setEditingRule(null)
            }}
          />
        )}
      </main>
    </div>
  )
}

function RuleModal({ rule, onSave, onClose }: {
  rule: PricingRule | null
  onSave: (data: Partial<PricingRule>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    service_type: rule?.service_type || 'hvac' as const,
    name: rule?.name || '',
    description: rule?.description || '',
    base_price: rule?.base_price || 0,
    unit_type: rule?.unit_type || 'fixed' as const,
    unit_price: rule?.unit_price || 0,
    min_price: rule?.min_price || 0,
    max_price: rule?.max_price || 0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">
            {rule ? 'Edit Rule' : 'Add Pricing Rule'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Service Type</label>
            <select
              value={formData.service_type}
              onChange={(e) => setFormData({ ...formData, service_type: e.target.value as any })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hvac">HVAC</option>
              <option value="roofing">Roofing</option>
              <option value="painting">Painting</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Rule Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Exterior Painting"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional description of this pricing rule"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Base Price</label>
              <input
                type="number"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Unit Type</label>
              <select
                value={formData.unit_type}
                onChange={(e) => setFormData({ ...formData, unit_type: e.target.value as any })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fixed">Fixed Price</option>
                <option value="per_sqft">Per Square Foot</option>
                <option value="per_hour">Per Hour</option>
                <option value="per_unit">Per Unit</option>
              </select>
            </div>
          </div>

          {formData.unit_type !== 'fixed' && (
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Unit Price</label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Min Price (Optional)</label>
              <input
                type="number"
                value={formData.min_price}
                onChange={(e) => setFormData({ ...formData, min_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Max Price (Optional)</label>
              <input
                type="number"
                value={formData.max_price}
                onChange={(e) => setFormData({ ...formData, max_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{rule ? 'Update Rule' : 'Add Rule'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
