/**
 * Minimal retry-with-exponential-backoff for Anthropic 429s.
 *
 * The eval fires many requests per pair (each agent turn + each
 * caller turn + the judge). On lower Anthropic tiers we routinely
 * crest the per-minute token bucket and get 429s. This wraps any
 * messages.create call and retries up to maxAttempts times with
 * exponential backoff (plus jitter) on transient 429 / 529 / 503.
 *
 * Non-rate-limit errors (auth, validation, etc.) pass through
 * immediately.
 */

export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseMs?: number } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 5
  const baseMs = opts.baseMs ?? 1500
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e: any) {
      lastErr = e
      const status = e?.status ?? e?.response?.status
      const retriable = status === 429 || status === 503 || status === 529
      if (!retriable || attempt === maxAttempts) throw e
      // Anthropic sometimes returns a `retry-after` header; honor it
      // when present, otherwise back off exponentially with jitter.
      const ra = e?.headers?.['retry-after'] ?? e?.response?.headers?.get?.('retry-after')
      const headerWaitMs = typeof ra === 'string' ? Number(ra) * 1000 : 0
      const exp = baseMs * Math.pow(2, attempt - 1)
      const jitter = Math.floor(Math.random() * 500)
      const waitMs = Math.max(headerWaitMs, exp) + jitter
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }
  throw lastErr
}
