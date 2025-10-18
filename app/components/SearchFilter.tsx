'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, X, Calendar, User, Phone, Tag } from 'lucide-react'

interface FilterOption {
  id: string
  label: string
  type: 'select' | 'date' | 'text'
  options?: { value: string; label: string }[]
}

interface SearchFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filters: Record<string, any>
  onFilterChange: (filters: Record<string, any>) => void
  filterOptions: FilterOption[]
  className?: string
}

export default function SearchFilter({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  filterOptions,
  className = ''
}: SearchFilterProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState(filters)

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {}
    setLocalFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== null && value !== '' && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search calls, customers, services..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-800/70 hover:text-white transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterOptions.map((option) => (
                <div key={option.id}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {option.label}
                  </label>
                  
                  {option.type === 'select' && option.options ? (
                    <select
                      value={localFilters[option.id] || ''}
                      onChange={(e) => handleFilterChange(option.id, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    >
                      <option value="">All</option>
                      {option.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : option.type === 'date' ? (
                    <input
                      type="date"
                      value={localFilters[option.id] || ''}
                      onChange={(e) => handleFilterChange(option.id, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={`Filter by ${option.label.toLowerCase()}`}
                      value={localFilters[option.id] || ''}
                      onChange={(e) => handleFilterChange(option.id, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <div className="border-t border-gray-700/50 pt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Active Filters:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(filters).map(([key, value]) => {
                    if (value === undefined || value === null || value === '' || 
                        (Array.isArray(value) && value.length === 0)) {
                      return null
                    }

                    const option = filterOptions.find(opt => opt.id === key)
                    const displayValue = Array.isArray(value) ? value.join(', ') : value
                    const displayLabel = option?.options?.find(opt => opt.value === value)?.label || displayValue

                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm rounded-lg"
                      >
                        <span>{option?.label}: {displayLabel}</span>
                        <button
                          onClick={() => handleFilterChange(key, option?.type === 'select' ? '' : '')}
                          className="w-4 h-4 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}