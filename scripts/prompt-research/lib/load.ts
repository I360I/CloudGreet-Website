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
 * Resolve the banks/ directory.
 *
 * We anchor everything on `process.cwd()` because that's the project
 * root in both contexts:
 *   - tsx CLI: started from cloudgreet/ where the user ran the command
 *   - Vercel serverless: the function bundle's working dir is the
 *     project root, and `outputFileTracingIncludes` in next.config.js
 *     drops the banks/ tree at the same relative path.
 *
 * We deliberately avoid `new URL('../banks/', import.meta.url)` because
 * webpack tries to statically resolve that as a module import at build
 * time and chokes ("Module not found: Can't resolve '../banks/'").
 */
const REL_BANKS = 'scripts/prompt-research/banks'

function resolveBanksRoot(): string {
  const candidates = [
    join(process.cwd(), REL_BANKS),
    // Fallback if cwd is somewhere unexpected: walk up from this file's
    // expected location. We can't trust import.meta.url under webpack so
    // we just try a couple of common ancestor layouts.
    join(process.cwd(), '..', REL_BANKS),
  ]
  for (const c of candidates) {
    if (existsSync(join(c, 'rubric.md'))) return c
  }
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
