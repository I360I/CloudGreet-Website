import type { SourceDefinition } from './types'
import { tdlrHvac, tdlrElectrical } from './tdlr'
import { tsbpePlumbing } from './tsbpe'
import { tdaPestControl } from './tda'
import {
 googleRoofing, googlePainting, googleHandyman, googleLandscaping,
} from './google-trades'

/**
 * Single registry of every scraper source. Add new sources here once and
 * the API + UI pick them up.
 */
export const SCRAPER_SOURCES: SourceDefinition[] = [
 // Licensed trades — sourced from Texas licensing databases
 tdlrHvac,
 tdlrElectrical,
 tsbpePlumbing,
 tdaPestControl,
 // Unlicensed trades — sourced directly from Google Places
 googleRoofing,
 googlePainting,
 googleHandyman,
 googleLandscaping,
]

export function getSource(id: string): SourceDefinition | undefined {
 return SCRAPER_SOURCES.find((s) => s.id === id)
}
