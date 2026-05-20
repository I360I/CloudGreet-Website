/**
 * Load business and scenario fixtures from disk + build the run matrix.
 *
 * Scenarios can opt-in to specific businesses via `applies_to`. Without
 * it, the scenario runs against every business. The matrix is the
 * Cartesian product after that filter.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { BusinessFixture, ScenarioFixture } from './types'

/**
 * Resolve the banks/ directory across both CLI and serverless contexts.
 *
 * - Locally (tsx CLI), `import.meta.url` points at the source file and
 *   `../banks/` lands correctly.
 * - On Vercel, `outputFileTracingIncludes` in next.config.js drops the
 *   banks/ directory under the function root at the same relative path
 *   from the project root. `process.cwd()` is the project root in
 *   serverless functions, so `<cwd>/scripts/prompt-research/banks` is
 *   the right place to look.
 *
 * Try the relative-to-source location first; fall back to cwd.
 */
function resolveBanksRoot(): string {
  const candidates = [
    new URL('../banks/', import.meta.url).pathname,
    join(process.cwd(), 'scripts/prompt-research/banks/'),
  ]
  for (const c of candidates) {
    if (existsSync(join(c, 'rubric.md'))) return c
  }
  // Last resort - return the first so the caller gets a recognisable
  // ENOENT pointing at the expected path.
  return candidates[0]
}

const ROOT = resolveBanksRoot()

export function loadBusinesses(): BusinessFixture[] {
  const dir = join(ROOT, 'businesses')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as BusinessFixture)
}

export function loadScenarios(): ScenarioFixture[] {
  const dir = join(ROOT, 'scenarios')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as ScenarioFixture)
}

export function loadRubric(): string {
  return readFileSync(join(ROOT, 'rubric.md'), 'utf8')
}

export function buildMatrix(
  businesses: BusinessFixture[],
  scenarios: ScenarioFixture[],
): Array<{ business: BusinessFixture; scenario: ScenarioFixture }> {
  const pairs: Array<{ business: BusinessFixture; scenario: ScenarioFixture }> = []
  for (const s of scenarios) {
    const applies = s.applies_to && s.applies_to.length > 0
      ? new Set(s.applies_to)
      : null
    for (const b of businesses) {
      if (applies && !applies.has(b.id)) continue
      pairs.push({ business: b, scenario: s })
    }
  }
  return pairs
}
