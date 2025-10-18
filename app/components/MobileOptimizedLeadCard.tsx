'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  ExternalLink, 
  Star, 
  MapPin, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Zap,
  User,
  Building,
  Tag
} from 'lucide-react'

interface MobileOptimizedLeadCardProps {
  lead: any
  onEnrich: (leadId: string) => void
  onEmail: (leadId: string) => void
  onSMS: (leadId: string) => void
  onSelect: (leadId: string, selected: boolean) => void
  isSelected: boolean
  enrichingLeads: Set<string>
  index: number
}

export default function MobileOptimizedLeadCard({
  lead,
  onEnrich,
  onEmail,
  onSMS,
  onSelect,
  isSelected,
  enrichingLeads,
  index
}: MobileOptimizedLeadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-500 bg-green-500/10'
    if (score >= 70) return 'text-blue-500 bg-blue-500/10'
    if (score >= 50) return 'text-yellow-500 bg-yellow-500/10'
    return 'text-gray-500 bg-gray-500/10'
  }

  const formatPhone = (phone: string) => {
    return phone?.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') || 'Not available'
  }

  const truncateText = (text: string, maxLength: number) => {
    return text?.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-gray-800/50 backdrop-blur-lg rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-purple-500 shadow-lg shadow-purple-500/20'
          : 'border-gray-700'
      }`}
    >
      {/* Mobile-optimized header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Selection checkbox - larger for mobile */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(lead.id, e.target.checked)}
            className="w-5 h-5 mt-1 accent-purple-500"
          />
          
          {/* Business info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-bold text-white leading-tight">
                {truncateText(lead.business_name, 25)}
              </h3>
              
              {/* Score badge */}
              {lead.total_score && (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreColor(lead.total_score)}`}>
                  {lead.total_score}
                </span>
              )}
            </div>
            
            {/* Quick info row */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Building className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{lead.business_type || 'Business'}</span>
              {lead.city && (
                <>
                  <span>•</span>
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{lead.city}</span>
                </>
              )}
            </div>

            {/* Owner info */}
            {lead.owner_name && (
              <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{lead.owner_name}</span>
                {lead.owner_title && (
                  <span className="text-gray-500 truncate">• {lead.owner_title}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contact info - always visible */}
        <div className="grid grid-cols-1 gap-2 mt-3">
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Phone className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="truncate">{formatPhone(lead.phone)}</span>
            </div>
          )}
          
          {lead.owner_email && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="truncate">{lead.owner_email}</span>
              {lead.owner_email_verified && (
                <span className="text-green-500 text-xs">✓</span>
              )}
            </div>
          )}
        </div>

        {/* Tags - horizontal scroll */}
        {lead.tags && lead.tags.length > 0 && (
          <div className="flex gap-1 mt-3 overflow-x-auto">
            {lead.tags.slice(0, 3).map((tag: string, idx: number) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full whitespace-nowrap flex-shrink-0"
              >
                <Tag className="w-3 h-3 inline mr-1" />
                {tag}
              </span>
            ))}
            {lead.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-600/50 text-gray-400 text-xs rounded-full">
                +{lead.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Expand/Collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 py-2 text-center text-sm text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 inline mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 inline mr-1" />
              Show More
            </>
          )}
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 pb-4 border-t border-gray-700"
        >
          {/* Address */}
          {lead.address && (
            <div className="flex items-start gap-2 text-sm text-gray-300 mb-3">
              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <span>{lead.address}</span>
            </div>
          )}

          {/* Website */}
          {lead.website && (
            <div className="flex items-center gap-2 text-sm text-blue-400 mb-3">
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              <a 
                href={lead.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="truncate hover:underline"
              >
                {lead.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}

          {/* Google Reviews */}
          {lead.google_rating && (
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-3">
              <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <span>{lead.google_rating} stars</span>
              {lead.google_review_count && (
                <span className="text-gray-500">
                  ({lead.google_review_count} reviews)
                </span>
              )}
            </div>
          )}

          {/* Pain points preview */}
          {lead.pain_points && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-300 mb-1">Pain Points:</h4>
              <div className="text-sm text-gray-400">
                {Array.isArray(lead.pain_points) 
                  ? lead.pain_points.slice(0, 2).join(', ')
                  : truncateText(lead.pain_points, 100)
                }
              </div>
            </div>
          )}

          {/* Status badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-2 py-1 rounded-full text-xs ${
              lead.enrichment_status === 'enriched' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {lead.enrichment_status || 'Pending'}
            </span>
            
            {lead.outreach_status && (
              <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                {lead.outreach_status.replace('_', ' ')}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Action buttons - optimized for mobile */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {/* Enrich button */}
          <button
            onClick={() => onEnrich(lead.id)}
            disabled={enrichingLeads.has(lead.id)}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">
              {enrichingLeads.has(lead.id) ? 'Enriching...' : 'Enrich'}
            </span>
          </button>

          {/* Email button */}
          {lead.owner_email && (
            <button
              onClick={() => onEmail(lead.id)}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all"
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">Email</span>
            </button>
          )}

          {/* SMS button */}
          {lead.owner_phone && (
            <button
              onClick={() => onSMS(lead.id)}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-600/30 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">SMS</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
