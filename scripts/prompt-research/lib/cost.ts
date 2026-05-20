/**
 * CostMeter wraps an Anthropic client and accumulates the per-pair
 * dollar cost across every messages.create call - without forcing
 * every caller (simulate, score, generate) to thread cost through
 * their return types.
 *
 * Rates as of 2026-05 (Sonnet 4.6):
 *   $3.00 / MTok input
 *   $15.00 / MTok output
 *   $0.30 / MTok cache read (10% of input)
 *   $3.75 / MTok cache write (1.25x input)
 *
 * Tokens are in actual count, the multiplier is "micro-dollars per
 * token" so micro = (tokens * rate). Divide by 1e6 to get dollars.
 *
 * The wrapper monkey-patches the client's messages.create. We only
 * touch the instance we're given, so other clients in the process
 * are untouched.
 */

import type Anthropic from '@anthropic-ai/sdk'

type Rates = { input: number; output: number; cache_read: number; cache_write: number }

const SONNET_46_RATES: Rates = { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 }
const OPUS_47_RATES: Rates = { input: 15, output: 75, cache_read: 1.5, cache_write: 18.75 }
const HAIKU_45_RATES: Rates = { input: 1, output: 5, cache_read: 0.1, cache_write: 1.25 }

function ratesFor(model: string | undefined): Rates {
  const m = (model || '').toLowerCase()
  if (m.includes('opus')) return OPUS_47_RATES
  if (m.includes('haiku')) return HAIKU_45_RATES
  return SONNET_46_RATES
}

export class CostMeter {
  private microSum = 0

  /** Monkey-patch messages.create on the given client so every call
   *  accumulates into this meter. Returns the same client for chaining. */
  attach(client: Anthropic): Anthropic {
    const original = (client.messages as any).create.bind(client.messages)
    const self = this
    ;(client.messages as any).create = function patched(...args: any[]) {
      const reqBody = args[0]
      const result = original(...args)
      if (result && typeof (result as any).then === 'function') {
        return (result as Promise<any>).then((resp) => {
          try { self.record(reqBody?.model, resp?.usage) } catch { /* never block on accounting */ }
          return resp
        })
      }
      return result
    }
    return client
  }

  /** Record one usage block manually. Used when you have a response
   *  in hand but didn't go through the wrapped messages.create
   *  (e.g. from lib/agent-builder/generate.ts which has its own client). */
  recordCostMicro(micro: number): void {
    if (!Number.isFinite(micro) || micro < 0) return
    this.microSum += micro
  }

  /** Snapshot the accumulator. Always non-negative. */
  microDollars(): number {
    return Math.max(0, Math.round(this.microSum))
  }

  dollars(): number {
    return this.microDollars() / 1_000_000
  }

  private record(model: string | undefined, usage: any): void {
    if (!usage) return
    const r = ratesFor(model)
    const input = Number(usage.input_tokens || 0)
    const output = Number(usage.output_tokens || 0)
    const cacheRead = Number(usage.cache_read_input_tokens || 0)
    const cacheWrite = Number(usage.cache_creation_input_tokens || 0)
    this.microSum += input * r.input + output * r.output + cacheRead * r.cache_read + cacheWrite * r.cache_write
  }
}
