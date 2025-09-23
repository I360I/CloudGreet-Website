import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/pricing/plans/route'

describe('Pricing API', () => {
  describe('GET /api/pricing/plans', () => {
    it('should return pricing plans successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/pricing/plans')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
    })

    it('should return pricing plan with correct structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/pricing/plans')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      const plan = data.data[0]
      expect(plan).toHaveProperty('id')
      expect(plan).toHaveProperty('name')
      expect(plan).toHaveProperty('price')
      expect(plan).toHaveProperty('currency')
      expect(plan).toHaveProperty('period')
      expect(plan).toHaveProperty('features')
      expect(plan).toHaveProperty('perBookingFee')
    })

    it('should return pricing plan with valid data types', async () => {
      const request = new NextRequest('http://localhost:3000/api/pricing/plans')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      const plan = data.data[0]
      expect(typeof plan.id).toBe('string')
      expect(typeof plan.name).toBe('string')
      expect(typeof plan.price).toBe('number')
      expect(typeof plan.currency).toBe('string')
      expect(typeof plan.period).toBe('string')
      expect(Array.isArray(plan.features)).toBe(true)
      expect(typeof plan.perBookingFee).toBe('number')
    })
  })
})
