import { supabaseAdmin } from '@/lib/supabase'
import type { ProspectFiltersInput } from '@/lib/prospecting/types'

type ProspectFilterRow = {
  provider: string
  filters: ProspectFiltersInput
}

const DEFAULT_FILTERS: ProspectFiltersInput = {
  titles: ['Owner', 'CEO', 'Founder'],
  employeeCount: { min: 5, max: 200 }
}

export async function getProspectingFilters(
  provider: string
): Promise<ProspectFiltersInput> {
  const { data, error } = await supabaseAdmin
    .from<ProspectFilterRow>('prospecting_filters')
    .select('filters')
    .eq('provider', provider)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load filters for ${provider}: ${error.message}`)
  }

  return data?.filters ?? DEFAULT_FILTERS
}

export async function upsertProspectingFilters(
  provider: string,
  filters: ProspectFiltersInput
) {
  const { error } = await supabaseAdmin.from('prospecting_filters').upsert(
    {
      provider,
      filters
    },
    {
      onConflict: 'provider'
    }
  )

  if (error) {
    throw new Error(`Failed to save filters for ${provider}: ${error.message}`)
  }
}


