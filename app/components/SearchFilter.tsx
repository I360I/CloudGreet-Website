'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react'

interface SearchFilterProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filters: {
    status?: string[]
    serviceType?: string[]
    dateRange?: string
  }
  onFilterChange: (filters: any) => void
  availableStatuses?: string[]
  availableServices?: string[]
}

export default function SearchFilter({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  availableStatuses = ['completed', 'missed', 'voicemail', 'in-progress'],
  availableServices = ['HVAC', 'Roofing', 'Painting']
}: SearchFilterProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [tempFilters, setTempFilters] = useState(filters)

  const activeFilterCount = 
    (filters.status?.length || 0) + 
    (filters.serviceType?.length || 0) +
    (filters.dateRange ? 1 : 0)

  const handleApplyFilters = () => {
    onFilterChange(tempFilters)
    setShowFilters(false)
  }

  const handleClearFilters = () => {
    const clearedFilters = {
      status: [],
      serviceType: [],
      dateRange: ''
    }
    setTempFilters(clearedFilters)
    onFilterChange(clearedFilters)
    setShowFilters(false)
  }

  const toggleStatus = (status: string) => {
    const current = tempFilters.status || []
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status]
    setTempFilters({ ...tempFilters, status: updated })
  }

  const toggleService = (service: string) => {
    const current = tempFilters.serviceType || []
    const updated = current.includes(service)
      ? current.filter(s => s !== service)
      : [...current, service]
    setTempFilters({ ...tempFilters, serviceType: updated })
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search calls, customers, phone numbers..."
            className="w-full pl-11 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
          {searchTerm && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </motion.button>
          )}
        </div>

        {/* Filter Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
            activeFilterCount > 0
              ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Filter className="w-5 h-5" />
          <span className="hidden md:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Status Filters */}
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Call Status
                </h4>
                <div className="flex flex-wrap gap-2">
                  {availableStatuses.map((status) => (
                    <motion.button
                      key={status}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleStatus(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                        tempFilters.status?.includes(status)
                          ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {status}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Service Type Filters */}
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Service Type</h4>
                <div className="flex flex-wrap gap-2">
                  {availableServices.map((service) => (
                    <motion.button
                      key={service}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleService(service)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        tempFilters.serviceType?.includes(service)
                          ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {service}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Clear All
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleApplyFilters}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all"
                >
                  Apply Filters
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && !showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <span className="text-sm text-gray-400">Active filters:</span>
          {filters.status?.map((status) => (
            <span
              key={status}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-400 capitalize"
            >
              {status}
              <button
                onClick={() => {
                  const updated = filters.status?.filter(s => s !== status) || []
                  onFilterChange({ ...filters, status: updated })
                }}
                className="hover:bg-blue-500/30 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.serviceType?.map((service) => (
            <span
              key={service}
              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-400"
            >
              {service}
              <button
                onClick={() => {
                  const updated = filters.serviceType?.filter(s => s !== service) || []
                  onFilterChange({ ...filters, serviceType: updated })
                }}
                className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </motion.div>
      )}
    </div>
  )
}

