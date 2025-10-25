'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, FileText, FileSpreadsheet, Calendar, Loader } from 'lucide-react'

interface ExportButtonProps {
  onExport: (format: 'csv' | 'pdf' | 'excel') => Promise<void>
  disabled?: boolean
  className?: string
}

export default function ExportButton({ onExport, disabled = false, className = '' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)

  const exportOptions = [
    {
      format: 'csv' as const,
      label: 'CSV File',
      description: 'Comma-separated values for spreadsheets',
      icon: FileText,
      color: 'text-green-400'
    },
    {
      format: 'excel' as const,
      label: 'Excel File',
      description: 'Microsoft Excel format',
      icon: FileSpreadsheet,
      color: 'text-blue-400'
    },
    {
      format: 'pdf' as const,
      label: 'PDF Report',
      description: 'Formatted document for printing',
      icon: Calendar,
      color: 'text-red-400'
    }
  ]

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    setIsExporting(true)
    setExportingFormat(format)
    setIsOpen(false)

    try {
      await onExport(format)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
      setExportingFormat(null)
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-800/70 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Export</span>
          </>
        )}
      </button>

      {/* Export Options Dropdown */}
      <AnimatePresence>
        {isOpen && !isExporting && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-72 bg-gray-900/95 border border-gray-800/50 rounded-xl backdrop-blur-xl z-50 shadow-2xl"
            >
              <div className="p-4">
                <h3 className="text-white font-semibold mb-3">Export Data</h3>
                <div className="space-y-2">
                  {exportOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.format}
                        onClick={() => handleExport(option.format)}
                        className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center ${option.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{option.label}</div>
                          <div className="text-gray-400 text-xs mt-1">{option.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Export Status */}
                {isExporting && exportingFormat && (
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin text-blue-400" />
                      <span className="text-blue-400 text-sm">
                        Exporting {exportingFormat.toUpperCase()}...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
