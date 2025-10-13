'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface LeadPaginationProps {
  pagination: PaginationInfo
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export default function LeadPagination({
  pagination,
  onPageChange,
  onLimitChange
}: LeadPaginationProps) {
  const { page, limit, total, totalPages, hasNext, hasPrev } = pagination

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (page > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }

      if (page < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  const startItem = (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-4 backdrop-blur-lg">
      <div className="flex items-center justify-between">
        {/* Items info */}
        <div className="text-sm text-gray-400">
          Showing {startItem} to {endItem} of {total} leads
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Show:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-400">per page</span>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-2">
          {/* First page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={!hasPrev}
            className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous page */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((pageNum, index) => (
              <div key={index}>
                {pageNum === '...' ? (
                  <span className="px-3 py-2 text-gray-400">...</span>
                ) : (
                  <button
                    onClick={() => onPageChange(pageNum as number)}
                    className={`px-3 py-2 rounded-lg transition-all ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-600 text-gray-400 hover:bg-gray-700/50 hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Next page */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNext}
            className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Page info for mobile */}
      <div className="mt-4 text-center text-sm text-gray-400 md:hidden">
        Page {page} of {totalPages}
      </div>
    </div>
  )
}
