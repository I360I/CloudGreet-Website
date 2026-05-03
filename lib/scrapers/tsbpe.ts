import type { ScrapeParams, ScrapeRecord, SourceDefinition } from './types'

/**
 * Texas State Board of Plumbing Examiners license search.
 * Phase C fills in real scraping. Stub for foundation testing.
 */
async function* runTsbpe(params: ScrapeParams): AsyncGenerator<ScrapeRecord, void, void> {
 const limit = Math.min(params.limit ?? 5, 5)
 for (let i = 0; i < limit; i++) {
  yield {
   source: 'tsbpe_plumbing',
   business_name: `${params.location || 'Austin'} Plumbing Co. ${i + 1}`,
   owner_name: `Sample Plumber ${i + 1}`,
   phone: `+1512555${String(2000 + i).slice(0, 4)}`,
   business_type: 'Plumbing',
   license_no: `TSBPE-${20000 + i}`,
   city: params.location || 'Austin',
   state: 'TX',
   raw: { stub: true, index: i },
  }
 }
}

export const tsbpePlumbing: SourceDefinition = {
 id: 'tsbpe_plumbing',
 label: 'TSBPE · Plumbing contractors',
 description: 'Texas State Board of Plumbing Examiners. Owner name + license number.',
 trade: 'Plumbing',
 run: (params, _opts) => runTsbpe(params),
}
