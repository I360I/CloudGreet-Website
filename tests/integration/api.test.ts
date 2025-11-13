import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream, TransformStream } from 'stream/web'
import { MessageChannel, MessagePort } from 'worker_threads'

;(global as any).TextEncoder = (global as any).TextEncoder ?? TextEncoder
;(global as any).TextDecoder = (global as any).TextDecoder ?? TextDecoder
;(global as any).ReadableStream = (global as any).ReadableStream ?? ReadableStream
;(global as any).TransformStream = (global as any).TransformStream ?? TransformStream
;(global as any).MessageChannel = (global as any).MessageChannel ?? MessageChannel
;(global as any).MessagePort = (global as any).MessagePort ?? MessagePort

const { Headers, Request, Response, FormData, File, Blob } = require('undici')

;(global as any).Headers = (global as any).Headers ?? Headers
;(global as any).Request = (global as any).Request ?? Request
;(global as any).Response = (global as any).Response ?? Response
;(global as any).FormData = (global as any).FormData ?? FormData
;(global as any).File = (global as any).File ?? File
;(global as any).Blob = (global as any).Blob ?? Blob

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabaseAdmin: {
    rpc: jest.fn(async () => ({ data: '2025-11-08T00:00:00Z', error: null }))
  }
}))

const supabaseMock = require('@/lib/supabase').supabaseAdmin
const { GET: healthCheck } = require('@/app/api/health/route')

describe('API smoke integration', () => {
  beforeEach(() => {
    supabaseMock.rpc.mockResolvedValue({ data: '2025-11-08T00:00:00Z', error: null })
  })

  it('reports healthy status when dependencies respond', async () => {
    const response = await healthCheck()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.checks.env.SUPABASE).toBe(true)
  })

  it('flags database check failure while keeping endpoint available', async () => {
    supabaseMock.rpc.mockRejectedValueOnce(new Error('Connection refused'))

    const response = await healthCheck()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.checks.database.ok).toBe(false)
  })
})










