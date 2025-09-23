import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/health/route'

describe('Health API', () => {
  describe('GET /api/health', () => {
    it('should return health status successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.timestamp).toBeDefined()
      expect(data.uptime).toBeDefined()
    })

    it('should return health status with correct data types', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(typeof data.status).toBe('string')
      expect(typeof data.timestamp).toBe('string')
      expect(typeof data.uptime).toBe('number')
      expect(data.uptime).toBeGreaterThan(0)
    })

    it('should return valid timestamp', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.timestamp).toBeDefined()
      
      const timestamp = new Date(data.timestamp)
      expect(timestamp.getTime()).toBeGreaterThan(0)
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now())
    })
  })
})
