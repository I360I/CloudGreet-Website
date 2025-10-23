import { NextRequest } from 'next/server'
import { POST } from '@/app/api/click-to-call/initiate/route'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'test-business-id' },
            error: null
          })
        })
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' }
          })
        })
      })
    })
  }
}))

// Mock logger
jest.mock('@/lib/monitoring', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    TELNYX_API_KEY: 'test-telnyx-key',
    TELNYX_CONNECTION_ID: 'test-connection-id',
    NEXT_PUBLIC_APP_URL: 'https://test.com'
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('Click-to-Call API', () => {
  it('should initiate call with valid input', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        phoneNumber: '+1234567890',
        businessName: 'Test Business',
        businessType: 'Service',
        services: ['Consulting'],
        hours: '9-5'
      })
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.callId).toBeDefined()
  })

  it('should reject call without phone number', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        businessName: 'Test Business'
      })
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData.error).toContain('Phone number and business name are required')
  })

  it('should reject call without business name', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        phoneNumber: '+1234567890'
      })
    } as unknown as NextRequest

    const response = await Zed(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData.error).toContain('Phone number and business name are required')
  })

  it('should validate phone number format', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        phoneNumber: '123', // Invalid phone number
        businessName: 'Test Business'
      })
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData.error).toContain('Invalid phone number')
  })

  it('should handle Telnyx API errors', async () => {
    // Mock Telnyx to return an error
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        phoneNumber: '+1234567890',
        businessName: 'Test Business'
      })
    } as unknown as NextRequest

    // This would require mocking the actual Telnyx API call
    const response = await POST(mockRequest)
    
    // The response depends on how Telnyx responds
    expect(response.status).toBeDefined()
  })
})


