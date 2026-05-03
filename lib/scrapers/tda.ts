import type { ScrapeParams, ScrapeRecord, SourceDefinition } from './types'

/**
 * Texas Department of Agriculture — pesticide applicators / pest control.
 * Phase D fills in real scraping. Stub for foundation testing.
 */
async function* runTda(params: ScrapeParams): AsyncGenerator<ScrapeRecord, void, void> {
 const limit = Math.min(params.limit ?? 5, 5)
 for (let i = 0; i < limit; i++) {
  yield {
   source: 'tda_pest',
   business_name: `${params.location || 'Austin'} Pest Control ${i + 1}`,
   owner_name: `Sample Owner ${i + 1}`,
   phone: `+1512555${String(3000 + i).slice(0, 4)}`,
   business_type: 'Pest Control',
   license_no: `TDA-${30000 + i}`,
   city: params.location || 'Austin',
   state: 'TX',
   raw: { stub: true, index: i },
  }
 }
}

export const tdaPestControl: SourceDefinition = {
 id: 'tda_pest',
 label: 'TDA · Pest control',
 description: 'Texas Department of Agriculture — licensed pesticide applicators. Owner name + license number.',
 trade: 'Pest Control',
 run: (params, _opts) => runTda(params),
}
