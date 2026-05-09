/**
 * Verify ElevenLabs post-call webhook signatures.
 *
 * EL signs each webhook with HMAC-SHA256 using the workspace secret
 * configured at https://elevenlabs.io/app/settings/webhooks. The header
 * format mirrors Stripe's:
 *
 *   ElevenLabs-Signature: t=<unix_ts>,v0=<hex_hmac>
 *
 * The HMAC payload is `${timestamp}.${rawBody}`.
 *
 * Fail-closed: in production, missing signature OR missing secret = reject.
 * Don't accept unsigned webhooks even on dev unless explicitly opted-in.
 */

import crypto from 'crypto'
import { logger } from '@/lib/monitoring'

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string }

export function verifyElevenLabsWebhook(
  rawBody: string,
  signatureHeader: string | null,
  options?: {
    /** Reject if timestamp is older than this (default: 5 min). */
    toleranceSeconds?: number
  },
): VerifyResult {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET
  if (!secret) {
    logger.error('ELEVENLABS_WEBHOOK_SECRET not configured - rejecting webhook')
    return { ok: false, reason: 'webhook_secret_not_configured' }
  }
  if (!signatureHeader) {
    return { ok: false, reason: 'missing_signature_header' }
  }

  // Header: "t=1234567890,v0=abcdef..."
  const parts = signatureHeader.split(',').map((s) => s.trim())
  let ts: string | null = null
  let sig: string | null = null
  for (const p of parts) {
    if (p.startsWith('t=')) ts = p.slice(2)
    else if (p.startsWith('v0=')) sig = p.slice(3)
  }
  if (!ts || !sig) {
    return { ok: false, reason: 'malformed_signature_header' }
  }

  const tolerance = options?.toleranceSeconds ?? 300
  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum)) {
    return { ok: false, reason: 'invalid_timestamp' }
  }
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - tsNum) > tolerance) {
    return { ok: false, reason: 'timestamp_outside_tolerance' }
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${rawBody}`)
    .digest('hex')

  let valid = false
  try {
    valid = crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(sig, 'hex'),
    )
  } catch {
    return { ok: false, reason: 'signature_decode_failed' }
  }

  return valid ? { ok: true } : { ok: false, reason: 'signature_mismatch' }
}
