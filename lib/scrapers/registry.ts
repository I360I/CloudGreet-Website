import type { SourceDefinition } from './types'
import { tdlrHvac, tdlrElectrical } from './tdlr'
import { tsbpePlumbing } from './tsbpe'
import { tdaPestControl } from './tda'

/**
 * Single registry of every scraper source. Add new sources here once and
 * the API + UI pick them up.
 */
export const SCRAPER_SOURCES: SourceDefinition[] = [
 tdlrHvac,
 tdlrElectrical,
 tsbpePlumbing,
 tdaPestControl,
]

export function getSource(id: string): SourceDefinition | undefined {
 return SCRAPER_SOURCES.find((s) => s.id === id)
}
