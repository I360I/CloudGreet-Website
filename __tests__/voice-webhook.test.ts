import { NextRequest } from 'next/server'
import { POST } from '@/app/api/telnyx/voice-webhook/route'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      // Mock OpenAI client
    }))
  }
})

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
    OPENAI_API_KEY: 'test-openai-key',
    NEXT_PUBLIC_APP_URL: 'https://test.com',
    JWT_SECRET: 'test-jwt-secret'
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('Voice Webhook API', () => {
  it('should handle call.answered event with OpenAI integration', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        data: {
          event_type: 'call.answered',
          payload: {
            call_control_id: 'test-call-id',
            from: '+1234567890',
            to: '+0987654321',
            direction: 'inbound',
            state: 'answered'
          }
        }
      })
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.call_id).toBe('test-call-id')
    expect(responseData.status).toBe('answered')
    expect(responseData.instructions).toHaveLength(1)
    expect(responseData.instructions[0].instruction).toBe('stream_audio')
  })

  it('should handle call.hangup event', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        data: {
          event_type: 'call.hangup',
          payload: {
            call_control_id: 'test-call-id',
            from: '+1234567890',
            to: '+0987654321'
          }
        }
      })
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.call_id).toBe('test-call-id')
    expect(responseData.status).toBe('completed')
  })

  it('should handle missing OpenAI API key', async () => {
    process.env.OPENAI_API_KEY = ''

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        data: {
          event_type: 'call.answered',
          payload: {
            call_control_id: 'test-call-id'
          }
        }
      })
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    
    expect(response.status).toBe(500)
  })

  it('should handle invalid request body', async () => {
    const mockRequest = {
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    
    expect(response.status).toBe(500)
  })
})


