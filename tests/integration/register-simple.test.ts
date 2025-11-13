/**
 * Integration tests for the simple registration API route.
 * Supabase calls are mocked so we can exercise the handler logic end-to-end.
 */

type NextRequest = {
  method: string
  url: string
  headers: Map<string, string>
  json: () => Promise<any>
}

jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      headers: new Map(),
      json: async () => body
    })
  }
}))

import { TextEncoder, TextDecoder } from 'util'

jest.mock('bcryptjs', () => ({
  hash: jest.fn(async (value: string) => `hashed-${value}`)
}))

const insertedRecords = {
  custom_users: null as any,
  users: null as any,
  businesses: null as any
}

const createUpdateMock = () => ({
  eq: jest.fn().mockResolvedValue({ data: null, error: null })
})

// Polyfill Node globals required by undici/Next
if (!(global as any).TextEncoder) {
  ;(global as any).TextEncoder = TextEncoder
}
if (!(global as any).TextDecoder) {
  ;(global as any).TextDecoder = TextDecoder
}

if (!(global as any).ReadableStream) {
  const { ReadableStream } = require('stream/web')
  ;(global as any).ReadableStream = ReadableStream
}
if (!(global as any).Headers) {
  ;(global as any).Headers = class {
    private readonly map = new Map<string, string>()
    constructor(init?: Record<string, string>) {
      if (init) {
        Object.entries(init).forEach(([key, value]) => this.map.set(key.toLowerCase(), value))
      }
    }
    get(key: string) {
      return this.map.get(key.toLowerCase()) ?? null
    }
    set(key: string, value: string) {
      this.map.set(key.toLowerCase(), value)
    }
  }
}
if (!(global as any).Request) {
  ;(global as any).Request = class {}
}
if (!(global as any).Response) {
  ;(global as any).Response = class {}
}

jest.mock('@/lib/supabase', () => {
  const adminUserId = 'auth-user-id'

  return {
    supabaseAdmin: {
      auth: {
        admin: {
          createUser: jest.fn(async () => ({
            data: { user: { id: adminUserId, email: 'mock@example.com' } },
            error: null
          })),
          deleteUser: jest.fn(async () => ({ data: null, error: null }))
        }
      },
      from: jest.fn((table: string) => {
        if (table === 'custom_users') {
          return {
            insert: (payload: Record<string, unknown>) => {
              const record = { ...payload }
              if (!record.id) {
                record.id = adminUserId
              }
              insertedRecords.custom_users = record
              return {
                select: () => ({
                  single: async () => ({ data: record, error: null })
                })
              }
            },
            select: () => ({
              eq: () => ({
                single: async () => ({ data: null, error: null })
              })
            }),
            delete: () => createUpdateMock(),
            update: () => createUpdateMock()
          }
        }

        if (table === 'users') {
          return {
            insert: async (payload: Record<string, unknown>) => {
              insertedRecords.users = { ...payload }
              return { error: null }
            },
            update: () => createUpdateMock(),
            delete: () => createUpdateMock()
          }
        }

        if (table === 'businesses') {
          return {
            insert: (payload: Record<string, unknown>) => {
              const record = { ...payload, id: 'business-id' }
              insertedRecords.businesses = record
              return {
                select: () => ({
                  single: async () => ({ data: record, error: null })
                })
              }
            }
          }
        }

        throw new Error(`Unexpected table requested in mock: ${table}`)
      })
    },
    __insertedRecords: insertedRecords
  }
})

const registerSimpleRoute: typeof import('@/app/api/auth/register-simple/route') = require('@/app/api/auth/register-simple/route')
const registerFullRoute: typeof import('@/app/api/auth/register/route') = require('@/app/api/auth/register/route')
const handlers = [
  { name: 'register-simple', post: registerSimpleRoute.POST },
  { name: 'register', post: registerFullRoute.POST }
]

describe.each(handlers)('%s API route', ({ post }) => {
  beforeEach(() => {
    for (const key of Object.keys(insertedRecords) as (keyof typeof insertedRecords)[]) {
      insertedRecords[key] = null
    }
    process.env.JWT_SECRET = 'test-secret'
  })

  const makeRequest = (body: unknown) =>
    ({
      method: 'POST',
      url: 'http://localhost/api/auth/register-simple',
      headers: new Map<string, string>(),
      json: async () => body
    } as unknown as NextRequest)

  it('rejects payloads missing required fields', async () => {
    const request = makeRequest({
      firstName: '',
      lastName: 'Tester',
      businessName: '',
      businessType: 'HVAC',
      email: 'missing@cloudgreet.com',
      password: 'Password123!',
      phone: '+15555551234',
      address: '123 Market St'
    })

    const response = await post(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.message).toContain('Missing required fields')
  })

  it('creates auth, custom, and business records on success', async () => {
    const request = makeRequest({
      firstName: 'Taylor',
      lastName: 'Morgan',
      businessName: 'Taylor Morgan Services',
      businessType: 'HVAC',
      email: 'taylor.morgan+test@cloudgreet.com',
      password: 'SecurePass123!',
      phone: '+1 (555) 210-3344',
      address: '890 Market St, San Francisco, CA'
    })

    const response = await post(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.user.email).toBe('taylor.morgan+test@cloudgreet.com')
    expect(insertedRecords.custom_users).toMatchObject({
      id: 'auth-user-id',
      email: 'taylor.morgan+test@cloudgreet.com',
      first_name: 'Taylor',
      last_name: 'Morgan',
      name: 'Taylor Morgan'
    })
    expect(insertedRecords.users).toMatchObject({
      id: 'auth-user-id',
      email: 'taylor.morgan+test@cloudgreet.com',
      first_name: 'Taylor',
      last_name: 'Morgan'
    })
    expect(insertedRecords.businesses).toMatchObject({
      owner_id: 'auth-user-id',
      business_name: 'Taylor Morgan Services'
    })
    expect(payload.data.token).toEqual(expect.any(String))
  })
})


