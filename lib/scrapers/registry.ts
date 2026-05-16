import type { SourceDefinition } from './types'
import { tdlrHvac, tdlrElectrical } from './tdlr'
import { tsbpePlumbing } from './tsbpe'
import { tdaPestControl } from './tda'
import {
 googleRoofing, googlePainting, googleHandyman, googleLandscaping,
} from './google-trades'
import { placesSources } from './google-places-discovery'

/**
 * placesSources (google-places-discovery.ts) duplicate the
 * google-trades.ts entries for Roofing/Painting/Landscaping but with
 * TX-only fan-out. We keep them imported for the HVAC/Plumbing/
 * Electrical/Pest entries (which the TDLR/TSBPE/TDA sources already
 * cover via enrichment), but their roofing/painting/landscaping
 * duplicates are filtered out below so the dropdown stops showing
 * "Roofing" and "Roofers" as two separate options.
 */
import { qualityModeSource } from './quality-mode'
import { ohioModeSource } from './ohio-mode'
import { arizonaModeSource } from './arizona-mode'
import { placesLaw } from './places-law'

/**
 * Single registry of every scraper source. Add new sources here once and
 * the API + UI pick them up.
 *
 * Order matters - the rep UI defaults to the first source. We put the
 * Texas licensing databases first because they're effectively free
 * (no per-record Google Places cost beyond fill-in enrichment), they
 * include the owner's legal name (which Google Places doesn't expose),
 * and reps prefer that combo even at lower precision. The Google
 * Places-backed sources stay registered so reps can opt into them
 * for trades that don't have a public Texas license database.
 */
export const SCRAPER_SOURCES: SourceDefinition[] = [
 // Quality mode - small national batch, ruthlessly filtered. First in
 // the list because reps complaining about "trash leads" want this.
 qualityModeSource,
 // Ohio mode - statewide multi-trade sweep. Built for Aaron's onboarding
 // demo; can ship per-state versions of this same shape on request.
 ohioModeSource,
 // Arizona mode - same shape as Ohio mode, Phoenix/Tucson/etc.
 arizonaModeSource,
 // Solo & small law firms - non-contractor vertical, kept near top
 // because legal is a strong fit for the AI receptionist pitch.
 placesLaw,
 // Preferred - Texas licensing databases (free, with owner name)
 tdlrHvac,
 tdlrElectrical,
 tsbpePlumbing,
 tdaPestControl,
 // Trades without a Texas license database - Google Places only
 googleRoofing,
 googlePainting,
 googleHandyman,
 googleLandscaping,
 // placesSources are TX-only forks of google-trades. The non-trade-
 // duplicate entries (HVAC/plumb/elec/pest) are hidden because the
 // license-database sources above already enrich them. The trade
 // duplicates (places_roofing/painting/landscaping) are hidden too -
 // they duplicate googleRoofing/googlePainting/googleLandscaping
 // which are nationwide-capable. Nothing from placesSources currently
 // ships to the UI; kept imported in case a future TX-only variant
 // is wanted.
 ...placesSources.filter((s) => ![
  'places_hvac', 'places_plumbing', 'places_electrical', 'places_pest',
  'places_roofing', 'places_painting', 'places_landscaping',
 ].includes(s.id)),
]

export function getSource(id: string): SourceDefinition | undefined {
 return SCRAPER_SOURCES.find((s) => s.id === id)
}
