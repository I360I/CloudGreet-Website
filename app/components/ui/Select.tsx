'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBusinessData } from '@/app/hooks/useBusinessData'

export interface SelectOption {
  value: string
  label: string
  color?: string // Hex color for service type options
}

interface SelectProps {
  options: SelectOption[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  searchable?: boolean // Auto-enable if options.length > 10
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  disabled = false,
  className = '',
  searchable
}: SelectProps) {
  const { theme } = useBusinessData()
  const primaryColor = theme?.primaryColor || '#8b5cf6'
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const selectRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  const shouldShowSearch = searchable !== undefined ? searchable : options.length > 10
  const filteredOptions = shouldShowSearch && searchQuery
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
        setFocusedIndex(-1)
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setFocusedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setFocusedIndex(prev => prev > 0 ? prev - 1 : -1)
      } else if (event.key === 'Enter' && focusedIndex >= 0) {
        event.preventDefault()
        onChange(filteredOptions[focusedIndex].value)
        setIsOpen(false)
        setSearchQuery('')
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, focusedIndex, filteredOptions, onChange])

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && shouldShowSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, shouldShowSearch])

  const selectedOption = options.find(opt => opt.value === value)

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchQuery('')
    setFocusedIndex(-1)
  }

  return (
    <div ref={selectRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-2',
          'bg-slate-800/50 border border-slate-700/50 rounded-lg',
          'hover:bg-slate-800/70 transition-colors',
          'text-white text-sm',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{ 
          '--tw-ring-color': primaryColor + '50'
        } as React.CSSProperties & { '--tw-ring-color'?: string }}
        aria-label="Select option"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedOption && selectedOption.color && (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 flex-shrink-0 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-full bg-slate-900/95 border border-slate-800/50 rounded-xl backdrop-blur-xl z-50 shadow-2xl max-h-80 overflow-hidden"
            role="listbox"
          >
            {/* Search Input */}
            {shouldShowSearch && (
              <div className="p-2 border-b border-slate-800/50">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setFocusedIndex(-1)
                  }}
                  placeholder="Search options..."
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2"
                  style={{ 
                    '--tw-ring-color': primaryColor + '50'
                  } as React.CSSProperties & { '--tw-ring-color'?: string }}
                />
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto max-h-64">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = value === option.value
                  const isFocused = index === focusedIndex

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors',
                        'focus:outline-none',
                        isFocused && 'bg-slate-800/50',
                        isSelected
                          ? ''
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      )}
                      style={isSelected ? {
                        backgroundColor: primaryColor + '20',
                        color: primaryColor
                      } : undefined}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {option.color && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      <span className="flex-1 truncate">{option.label}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

