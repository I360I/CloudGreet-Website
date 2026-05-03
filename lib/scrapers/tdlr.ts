import type { ScrapeParams, ScrapeRecord, SourceDefinition } from './types'

/**
 * Texas Department of Licensing and Regulation public license search.
 * Phase B fills this in with real HTML parsing. For now, the stub yields
 * a small deterministic sample so the pipeline can be tested end-to-end.
 */

async function* runTdlr(
 trade: 'HVAC' | 'Electrical',
 params: ScrapeParams,
): AsyncGenerator<ScrapeRecord, void, void> {
 const limit = Math.min(params.limit ?? 5, 5)
 for (let i = 0; i < limit; i++) {
  yield {
   source: trade === 'HVAC' ? 'tdlr_hvac' : 'tdlr_electrical',
   business_name: `${params.location || 'Austin'} ${trade} Co. ${i + 1}`,
   owner_name: `Sample Owner ${i + 1}`,
   phone: `+1512555${String(1000 + i).slice(0, 4)}`,
   business_type: trade,
   license_no: `TDLR-${trade.slice(0, 3).toUpperCase()}-${10000 + i}`,
   address: `${100 + i} Sample Rd`,
   city: params.location || 'Austin',
   state: 'TX',
   zip: '78701',
   raw: { stub: true, trade, index: i },
  }
 }
}

export const tdlrHvac: SourceDefinition = {
 id: 'tdlr_hvac',
 label: 'TDLR · HVAC contractors',
 description: 'Texas Department of Licensing and Regulation — Air Conditioning & Refrigeration Contractors. Owner name + phone + license number.',
 trade: 'HVAC',
 run: (params, _opts) => runTdlr('HVAC', params),
}

export const tdlrElectrical: SourceDefinition = {
 id: 'tdlr_electrical',
 label: 'TDLR · Electrical contractors',
 description: 'Texas Department of Licensing and Regulation — Electrical Contractor. Owner name + phone + license number.',
 trade: 'Electrical',
 run: (params, _opts) => runTdlr('Electrical', params),
}
