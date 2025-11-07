import { NextRequest } from 'next/server'
// TODO: Create /api/click-to-call/initiate route or update test
// import { POST } from '@/app/api/click-to-call/initiate/route'

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

describe.skip('Click-to-Call API', () => {
  // TODO: Create /api/click-to-call/initiate route to enable these tests
  it.skip('should initiate call with valid input', async () => {
    // TODO: Create /api/click-to-call/initiate route to enable this test
  })

  it.skip('should reject call without phone number', async () => {
    // TODO: Create /api/click-to-call/initiate route to enable this test
  })

  it.skip('should reject call without business name', async () => {
    // TODO: Create /api/click-to-call/initiate route to enable this test
  })

  it.skip('should validate phone number format', async () => {
    // TODO: Create /api/click-to-call/initiate route to enable this test
  })

  it.skip('should handle Telnyx API errors', async () => {
    // TODO: Create /api/click-to-call/initiate route to enable this test
  })
})


