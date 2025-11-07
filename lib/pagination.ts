// Pagination utilities for CloudGreet platform

import { useState, useEffect, useCallback } from 'react'
import type { JobDetails, PricingRule, Estimate, Lead, ContactInfo, Appointment, Business, AISettings, AIAgent, WebSocketMessage, SessionData, ValidationResult, QueryResult, RevenueOptimizedConfig, PricingScripts, ObjectionHandling, ClosingTechniques, AgentData, PhoneValidationResult, LeadScoringResult, ContactActivity, ReminderMessage, TestResult, WorkingPromptConfig, AgentConfiguration, ValidationFunction, ErrorDetails, APIError, APISuccess, APIResponse, FilterParams, SortParams, QueryParams, DatabaseError, SupabaseResponse, RateLimitConfig, SecurityHeaders, LogEntry, HealthCheckResult, ServiceHealth, MonitoringAlert, PerformanceMetrics, BusinessMetrics, CallMetrics, LeadMetrics, RevenueMetrics, DashboardData, ExportOptions, ImportResult, BackupConfig, MigrationResult, FeatureFlag, A_BTest, ComplianceConfig, AuditLog, SystemConfig } from '@/lib/types/common';

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface PaginationConfig {
  defaultLimit: number
  maxLimit: number
  defaultPage: number
}

export const PAGINATION_CONFIG: PaginationConfig = {
  defaultLimit: 20,
  maxLimit: 100,
  defaultPage: 1
}

/**
 * parsePaginationParams - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await parsePaginationParams(param1, param2)
 * ```
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(
    PAGINATION_CONFIG.maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') || PAGINATION_CONFIG.defaultLimit.toString(), 10))
  )
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}

/**
 * getPaginationLinks - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await getPaginationLinks(param1, param2)
 * ```
 */
export function getPaginationLinks(
  baseUrl: string,
  page: number,
  totalPages: number,
  limit: number
) {
  const links: { [key: string]: string } = {}
  
  if (page > 1) {
    links.first = `${baseUrl}?page=1&limit=${limit}`
    links.prev = `${baseUrl}?page=${page - 1}&limit=${limit}`
  }
  
  if (page < totalPages) {
    links.next = `${baseUrl}?page=${page + 1}&limit=${limit}`
    links.last = `${baseUrl}?page=${totalPages}&limit=${limit}`
  }
  
  return links
}

// Database pagination helpers
/**
 * buildPaginationQuery - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await buildPaginationQuery(param1, param2)
 * ```
 */
export function buildPaginationQuery(
  query: unknown,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit
  return (query as any).range(offset, offset + limit - 1)
}

/**
 * buildCountQuery - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await buildCountQuery(param1, param2)
 * ```
 */
export function buildCountQuery(query: unknown) {
  return (query as any).select('*', { count: 'exact', head: true })
}

// Frontend pagination hook
export function usePagination<T>(
  fetchFunction: (page: number, limit: number) => Promise<PaginatedResponse<T>>,
  initialPage: number = 1,
  initialLimit: number = PAGINATION_CONFIG.defaultLimit
) {
  const [data, setData] = useState<T[]>([])
  const [pagination, setPagination] = useState<PaginatedResponse<T>['pagination'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [currentLimit, setCurrentLimit] = useState(initialLimit)

  const fetchData = useCallback(async (page: number, limit: number) => {
    try {
      /**
       * setLoading - Add description here
       * 
       * @param {...any} args - Method parameters
       * @returns {Promise<any>} Method return value
       * @throws {Error} When operation fails
       * 
       * @example
       * ```typescript
       * await this.setLoading(param1, param2)
       * ```
       */
      setLoading(true)
      /**
       * setError - Add description here
       * 
       * @param {...any} args - Method parameters
       * @returns {Promise<any>} Method return value
       * @throws {Error} When operation fails
       * 
       * @example
       * ```typescript
       * await this.setError(param1, param2)
       * ```
       */
      setError(null)
      const result = await fetchFunction(page, limit)
      /**
       * setData - Add description here
       * 
       * @param {...any} args - Method parameters
       * @returns {Promise<any>} Method return value
       * @throws {Error} When operation fails
       * 
       * @example
       * ```typescript
       * await this.setData(param1, param2)
       * ```
       */
      setData(result.data)
      /**
       * setPagination - Add description here
       * 
       * @param {...any} args - Method parameters
       * @returns {Promise<any>} Method return value
       * @throws {Error} When operation fails
       * 
       * @example
       * ```typescript
       * await this.setPagination(param1, param2)
       * ```
       */
      setPagination(result.pagination)
      /**
       * setCurrentPage - Add description here
       * 
       * @param {...any} args - Method parameters
       * @returns {Promise<any>} Method return value
       * @throws {Error} When operation fails
       * 
       * @example
       * ```typescript
       * await this.setCurrentPage(param1, param2)
       * ```
       */
      setCurrentPage(page)
      /**
       * setCurrentLimit - Add description here
       * 
       * @param {...any} args - Method parameters
       * @returns {Promise<any>} Method return value
       * @throws {Error} When operation fails
       * 
       * @example
       * ```typescript
       * await this.setCurrentLimit(param1, param2)
       * ```
       */
      setCurrentLimit(limit)
    } catch (err) {
      /**
       * setError - Add description here
       * 
       * @param {...any} args - Method parameters
       * @returns {Promise<any>} Method return value
       * @throws {Error} When operation fails
       * 
       * @example
       * ```typescript
       * await this.setError(param1, param2)
       * ```
       */
      setError(err as Error)
    } finally {
      /**
       * setLoading - Add description here
       * 
       * @param {...any} args - Method parameters
       * @returns {Promise<any>} Method return value
       * @throws {Error} When operation fails
       * 
       * @example
       * ```typescript
       * await this.setLoading(param1, param2)
       * ```
       */
      setLoading(false)
    }
  }, [fetchFunction])

  const goToPage = useCallback((page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      /**
       * fetchData - Add description here
       * 
       * @param {...any} args - Method parameters
       * @returns {Promise<any>} Method return value
       * @throws {Error} When operation fails
       * 
       * @example
       * ```typescript
       * await this.fetchData(param1, param2)
       * ```
       */
      fetchData(page, currentLimit)
    }
  }, [fetchData, pagination, currentLimit])

  const changeLimit = useCallback((limit: number) => {
    const validLimit = Math.min(PAGINATION_CONFIG.maxLimit, Math.max(1, limit))
    /**
     * fetchData - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.fetchData(param1, param2)
     * ```
     */
    fetchData(1, validLimit) // Reset to page 1 when changing limit
  }, [fetchData])

  const nextPage = useCallback(() => {
    if (pagination?.hasNext) {
      /**
       * goToPage - Add description here
       * 
       * @param {...any} args - Method parameters
       * @returns {Promise<any>} Method return value
       * @throws {Error} When operation fails
       * 
       * @example
       * ```typescript
       * await this.goToPage(param1, param2)
       * ```
       */
      goToPage(currentPage + 1)
    }
  }, [goToPage, pagination, currentPage])

  const prevPage = useCallback(() => {
    if (pagination?.hasPrev) {
      /**
       * goToPage - Add description here
       * 
       * @param {...any} args - Method parameters
       * @returns {Promise<any>} Method return value
       * @throws {Error} When operation fails
       * 
       * @example
       * ```typescript
       * await this.goToPage(param1, param2)
       * ```
       */
      goToPage(currentPage - 1)
    }
  }, [goToPage, pagination, currentPage])

  useEffect(() => {
    /**
     * fetchData - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.fetchData(param1, param2)
     * ```
     */
    fetchData(initialPage, initialLimit)
  }, [fetchData, initialPage, initialLimit])

  return {
    data,
    pagination,
    loading,
    error,
    currentPage,
    currentLimit,
    goToPage,
    changeLimit,
    nextPage,
    prevPage,
    refetch: () => fetchData(currentPage, currentLimit)
  }
}

// Pagination component props
export interface PaginationProps {
  pagination: PaginatedResponse<unknown>['pagination']
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  className?: string
}

// Common pagination limits
export const PAGINATION_LIMITS = [10, 20, 50, 100] as const
