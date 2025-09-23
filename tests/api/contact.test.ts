import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/contact/submit/route'

describe('Contact API', () => {
  describe('POST /api/contact/submit', () => {
    it('should submit contact form successfully', async () => {
      const requestBody = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        business: 'Test Company',
        subject: 'Inquiry about CloudGreet',
        message: 'I am interested in learning more about your AI receptionist service.'
      }

      const request = new NextRequest('http://localhost:3000/api/contact/submit', {
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
      expect(data.message).toContain('received')
    })

    it('should reject contact form with invalid email', async () => {
      const requestBody = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'invalid-email',
        subject: 'Test Subject',
        message: 'Test message'
      }

      const request = new NextRequest('http://localhost:3000/api/contact/submit', {
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

    it('should reject contact form with missing required fields', async () => {
      const requestBody = {
        firstName: 'Jane',
        // Missing required fields
        email: 'jane@example.com'
      }

      const request = new NextRequest('http://localhost:3000/api/contact/submit', {
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

    it('should reject contact form with short message', async () => {
      const requestBody = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        subject: 'Test Subject',
        message: 'Hi' // Too short
      }

      const request = new NextRequest('http://localhost:3000/api/contact/submit', {
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
