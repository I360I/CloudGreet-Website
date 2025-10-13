'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, X, Search, Tag, User, Building, TrendingUp } from 'lucide-react'

interface FilterOptions {
  enrichment: string
  minScore: number
  businessType: string
  outreachStatus: string
  assignedTo: string
  tags: string[]
  search: string
}

interface AdvancedLeadFiltersProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  availableTags: Array<{ tag: string; count: number }>
  availableAssignees: Array<{ id: string; name: string; email: string }>
  isOpen: boolean
  onToggle: () => void
}

export default function AdvancedLeadFilters({
  filters,
  onFiltersChange,
  availableTags,
  availableAssignees,
  isOpen,
  onToggle
}: AdvancedLeadFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
  }

  const applyFilters = () => {
    onFiltersChange(localFilters)
  }

  const clearFilters = () => {
    const defaultFilters: FilterOptions = {
      enrichment: 'all',
      minScore: 0,
      businessType: '',
      outreachStatus: 'all',
      assignedTo: 'all',
      tags: [],
      search: ''
    }
    setLocalFilters(defaultFilters)
    onFiltersChange(defaultFilters)
  }

  const activeFiltersCount = [
    filters.enrichment !== 'all',
    filters.minScore > 0,
    filters.businessType !== '',
    filters.outreachStatus !== 'all',
    filters.assignedTo !== 'all',
    filters.tags.length > 0,
    filters.search !== ''
  ].filter(Boolean).length

  return (
    <>
      {/* Filter Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700 transition-all"
      >
        <Filter className="w-4 h-4" />
        <span>Advanced Filters</span>
        {activeFiltersCount > 0 && (
          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 backdrop-blur-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Advanced Filters
              </h3>
              <button
                onClick={onToggle}
                className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Search className="w-4 h-4 inline mr-1" />
                  Search
                </label>
                <input
                  type="text"
                  value={localFilters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  placeholder="Business name, owner, address..."
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Enrichment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Enrichment Status
                </label>
                <select
                  value={localFilters.enrichment}
                  onChange={(e) => updateFilter('enrichment', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="enriched">Enriched</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Minimum Score */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min Score: {localFilters.minScore}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={localFilters.minScore}
                  onChange={(e) => updateFilter('minScore', Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Building className="w-4 h-4 inline mr-1" />
                  Business Type
                </label>
                <select
                  value={localFilters.businessType}
                  onChange={(e) => updateFilter('businessType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Roofing">Roofing</option>
                  <option value="Painting">Painting</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Landscaping">Landscaping</option>
                </select>
              </div>

              {/* Outreach Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Outreach Status
                </label>
                <select
                  value={localFilters.outreachStatus}
                  onChange={(e) => updateFilter('outreachStatus', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="not_contacted">Not Contacted</option>
                  <option value="contacted">Contacted</option>
                  <option value="responded">Responded</option>
                  <option value="interested">Interested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="do_not_contact">Do Not Contact</option>
                </select>
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Assigned To
                </label>
                <select
                  value={localFilters.assignedTo}
                  onChange={(e) => updateFilter('assignedTo', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Assignees</option>
                  <option value="unassigned">Unassigned</option>
                  {availableAssignees.map(assignee => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.slice(0, 20).map(tagData => (
                  <button
                    key={tagData.tag}
                    onClick={() => {
                      const newTags = localFilters.tags.includes(tagData.tag)
                        ? localFilters.tags.filter(t => t !== tagData.tag)
                        : [...localFilters.tags, tagData.tag]
                      updateFilter('tags', newTags)
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition-all ${
                      localFilters.tags.includes(tagData.tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tagData.tag} ({tagData.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-600">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Clear All Filters
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={onToggle}
                  className="px-4 py-2 bg-gray-600/20 border border-gray-500/30 text-gray-400 rounded-lg hover:bg-gray-600/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
