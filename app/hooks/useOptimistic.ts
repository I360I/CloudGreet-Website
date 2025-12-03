'use client'

import { useState, useCallback, useRef } from 'react'

interface OptimisticOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  rollbackDelay?: number
}

/**
 * Hook for optimistic UI updates
 * Shows changes immediately, rolls back on error
 */
export function useOptimistic<T>(
  initialData: T,
  options: OptimisticOptions<T> = {}
) {
  const [data, setData] = useState<T>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const previousDataRef = useRef<T>(initialData)

  const update = useCallback(async (
    optimisticValue: T,
    asyncOperation: () => Promise<T>
  ) => {
    // Store previous value for rollback
    previousDataRef.current = data
    
    // Immediately show optimistic value
    setData(optimisticValue)
    setIsLoading(true)
    setError(null)

    try {
      // Perform async operation
      const result = await asyncOperation()
      
      // Update with real value
      setData(result)
      options.onSuccess?.(result)
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Operation failed')
      
      // Rollback to previous value
      if (options.rollbackDelay) {
        setTimeout(() => {
          setData(previousDataRef.current)
        }, options.rollbackDelay)
      } else {
        setData(previousDataRef.current)
      }
      
      setError(error)
      options.onError?.(error)
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [data, options])

  const rollback = useCallback(() => {
    setData(previousDataRef.current)
    setError(null)
  }, [])

  return {
    data,
    setData,
    update,
    rollback,
    isLoading,
    error,
  }
}

/**
 * Hook for optimistic list updates (add/remove/update items)
 */
export function useOptimisticList<T extends { id: string }>(
  initialItems: T[],
  options: OptimisticOptions<T[]> = {}
) {
  const { data: items, update, isLoading, error } = useOptimistic<T[]>(initialItems, options)

  const addItem = useCallback(async (
    item: T,
    asyncOperation: () => Promise<T>
  ) => {
    const optimisticItems = [...items, item]
    return update(optimisticItems, async () => {
      const newItem = await asyncOperation()
      return [...items, newItem]
    })
  }, [items, update])

  const removeItem = useCallback(async (
    id: string,
    asyncOperation: () => Promise<void>
  ) => {
    const optimisticItems = items.filter(item => item.id !== id)
    return update(optimisticItems, async () => {
      await asyncOperation()
      return optimisticItems
    })
  }, [items, update])

  const updateItem = useCallback(async (
    id: string,
    updates: Partial<T>,
    asyncOperation: () => Promise<T>
  ) => {
    const optimisticItems = items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
    return update(optimisticItems, async () => {
      const updatedItem = await asyncOperation()
      return items.map(item => item.id === id ? updatedItem : item)
    })
  }, [items, update])

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    isLoading,
    error,
  }
}

