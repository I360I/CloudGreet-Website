import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/register/route'

describe('Auth API', () => {
  beforeEach(() => {
    // Reset environment for each test
    process.env.NODE_ENV = 'test'
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const requestBody = {
        businessName: 'Test HVAC',
        businessType: 'HVAC',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@testhvac.com',
        password: 'password123',
        phone: '5551234567',
        address: '123 Test St, Test City, TC 12345',
        services: ['HVAC Repair', 'Installation'],
        serviceAreas: ['Downtown', 'Suburbs']
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user).toBeDefined()
      expect(data.data.business).toBeDefined()
    })

    it('should reject registration with invalid email', async () => {
      const requestBody = {
        businessName: 'Test HVAC',
        businessType: 'HVAC',
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'password123',
        phone: '5551234567'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Validation failed')
    })

    it('should reject registration with weak password', async () => {
      const requestBody = {
        businessName: 'Test HVAC',
        businessType: 'HVAC',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@testhvac.com',
        password: '123',
        phone: '5551234567'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Validation failed')
    })

    it('should reject registration with missing required fields', async () => {
      const requestBody = {
        businessName: 'Test HVAC',
        // Missing required fields
        email: 'john@testhvac.com'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Validation failed')
    })
  })
})
