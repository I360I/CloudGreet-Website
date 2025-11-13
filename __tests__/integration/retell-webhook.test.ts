import crypto from 'crypto'
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
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(async () => ({ data: null, error: null }))
    }))
  }
}))

process.env.RETELL_WEBHOOK_SECRET = 'test_webhook_secret'

let retellPost: typeof import('@/app/api/retell/voice-webhook/route').POST

beforeAll(async () => {
  retellPost = (await import('@/app/api/retell/voice-webhook/route')).POST
})

describe('Retell voice webhook', () => {
  const createRequest = (body: any, signature?: string) => {
    const requestBody = JSON.stringify(body)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (signature) {
      headers['x-retell-signature'] = signature
    }

    return new Request('http://localhost/api/retell/voice-webhook', {
      method: 'POST',
      headers,
      body: requestBody
    })
  }

  const sign = (payload: object) =>
    crypto
      .createHmac('sha256', 'test_webhook_secret')
      .update(JSON.stringify(payload))
      .digest('hex')

  it('accepts call_ended events when signature is valid', async () => {
    const payload = {
      call_id: 'call_123',
      event: 'call_ended',
      transcript: 'AI: Hello / Caller: Need a quote'
    }

    const response = await retellPost(createRequest(payload, sign(payload)) as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
  })

  it('treats missing signature as warning in non-production envs', async () => {
    const payload = { call_id: 'call_123', event: 'call_ended' }
    const response = await retellPost(createRequest(payload) as any)
    expect(response.status).toBe(200)
  })
})