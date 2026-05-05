import type { SourceDefinition } from './types'
import { tdlrHvac, tdlrElectrical } from './tdlr'
import { tsbpePlumbing } from './tsbpe'
import { tdaPestControl } from './tda'
import {
 googleRoofing, googlePainting, googleHandyman, googleLandscaping,
} from './google-trades'
import { placesSources } from './google-places-discovery'

/**
 * Single registry of every scraper source. Add new sources here once and
 * the API + UI pick them up.
 *
 * Order matters — the rep UI defaults to the first source. We put the
 * Google-Places-backed sources first because they consistently produce
 * higher-precision leads (real businesses, type-classified, with
 * reviews to filter ghost listings) than the licensing databases,
 * which return individual license-holders rather than companies.
 */
export const SCRAPER_SOURCES: SourceDefinition[] = [
 // Preferred — Google Places (real businesses, type-classified)
 ...placesSources,
 // Legacy — Texas licensing databases (license-holders, noisier)
 tdlrHvac,
 tdlrElectrical,
 tsbpePlumbing,
 tdaPestControl,
 // Already Google-Places-based but pre-existing
 googleRoofing,
 googlePainting,
 googleHandyman,
 googleLandscaping,
]

export function getSource(id: string): SourceDefinition | undefined {
 return SCRAPER_SOURCES.find((s) => s.id === id)
}
