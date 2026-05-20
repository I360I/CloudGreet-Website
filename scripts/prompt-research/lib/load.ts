/**
 * Load business and scenario fixtures from disk + build the run matrix.
 *
 * Scenarios can opt-in to specific businesses via `applies_to`. Without
 * it, the scenario runs against every business. The matrix is the
 * Cartesian product after that filter.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BusinessFixture, ScenarioFixture } from './types'

const ROOT = new URL('../banks/', import.meta.url).pathname

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
