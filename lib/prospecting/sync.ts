import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { getProspectingFilters } from '@/lib/prospecting/filters'
import { fetchApolloProspects } from '@/lib/integrations/apollo'
import { fetchClearbitProspects } from '@/lib/integrations/clearbit'
import type { ProspectFiltersInput } from '@/lib/prospecting/types'

type SyncStats = {
  fetched: number
  inserted: number
  skipped: number
}

async function recordSyncLog(
  provider: string,
  filters: ProspectFiltersInput,
  stats: SyncStats,
  status: 'success' | 'error',
  message?: string
) {
  const { error } = await supabaseAdmin.from('prospect_sync_logs').insert({
    provider,
    filters,
    fetched_count: stats.fetched,
    inserted_count: stats.inserted,
    skipped_count: stats.skipped,
    status,
    message,
    completed_at: new Date().toISOString()
  })

  if (error) {
    logger.error('Failed to record prospect sync log', { error })
  }
}

type ApolloProspect = Awaited<ReturnType<typeof fetchApolloProspects>>[number]
type ClearbitProspect = Awaited<ReturnType<typeof fetchClearbitProspects>>[number]

function normalizeProspect(provider: string, person: ApolloProspect | ClearbitProspect) {
  if (provider === 'apollo') {
    const apolloPerson = person as ApolloProspect
    return {
      externalId: apolloPerson.id,
      firstName: apolloPerson.first_name,
      lastName: apolloPerson.last_name,
      email: apolloPerson.email,
      phone: apolloPerson.phone_numbers?.[0]?.number ?? null,
      companyName: apolloPerson.organization?.name ?? null,
      jobTitle: apolloPerson.title,
      industry: apolloPerson.organization?.industry ?? null,
      website: apolloPerson.organization?.website_url ?? null,
      city: apolloPerson.city,
      state: apolloPerson.state,
      country: apolloPerson.country,
      employeeRange: apolloPerson.organization?.estimated_num_employees
        ? String(apolloPerson.organization?.estimated_num_employees)
        : null,
      revenueRange: apolloPerson.organization?.estimated_annual_revenue
        ? String(apolloPerson.organization?.estimated_annual_revenue)
        : null,
      sourceUrl: apolloPerson.linkedin_url
    }
  }

  const clearbitPerson = person as ClearbitProspect
  return {
    externalId: clearbitPerson.id,
    firstName: clearbitPerson.name?.givenName ?? null,
    lastName: clearbitPerson.name?.familyName ?? null,
    email: clearbitPerson.email ?? null,
    phone: clearbitPerson.phone ?? null,
    companyName: clearbitPerson.company?.name ?? null,
    jobTitle: clearbitPerson.title ?? null,
    industry: clearbitPerson.company?.industry ?? null,
    website: clearbitPerson.company?.site ?? null,
    city: clearbitPerson.location ?? null,
    state: null,
    country: null,
    employeeRange:
      clearbitPerson.company?.metrics?.employeesRange ??
      (clearbitPerson.company?.metrics?.employees
        ? String(clearbitPerson.company.metrics.employees)
        : null),
    revenueRange: clearbitPerson.company?.metrics?.annualRevenue
      ? String(clearbitPerson.company.metrics.annualRevenue)
      : null,
    sourceUrl: clearbitPerson.linkedin ?? null
  }
}

async function upsertProspects(
  provider: string,
  prospects: Array<ApolloProspect | ClearbitProspect>
) {
  let inserted = 0
  let skipped = 0

  for (const person of prospects) {
    const normalized = normalizeProspect(provider, person)
    const externalId = normalized.externalId
    if (!externalId) {
      skipped++
      continue
    }

    const { error } = await supabaseAdmin.from('prospects').upsert(
      {
        external_id: externalId,
        provider,
        first_name: normalized.firstName,
        last_name: normalized.lastName,
        email: normalized.email,
        phone: normalized.phone,
        company_name: normalized.companyName,
        job_title: normalized.jobTitle,
        industry: normalized.industry,
        website: normalized.website,
        city: normalized.city,
        state: normalized.state,
        country: normalized.country,
        employee_range: normalized.employeeRange,
        revenue_range: normalized.revenueRange,
        source_url: normalized.sourceUrl
      },
      { onConflict: 'provider,external_id' }
    )

    if (error) {
      logger.warn('Skipping prospect due to upsert error', {
        provider,
        externalId,
        error
      })
      skipped++
    } else {
      inserted++
    }
  }

  return { inserted, skipped }
}

export async function runProspectSync() {
  const provider = 'apollo'
  const filters = await getProspectingFilters(provider)

  const stats: SyncStats = {
    fetched: 0,
    inserted: 0,
    skipped: 0
  }

  let prospects: Awaited<ReturnType<typeof fetchApolloProspects>> | Awaited<ReturnType<typeof fetchClearbitProspects>> = []
  let activeProvider = provider

  try {
    prospects = await fetchApolloProspects(filters)
    stats.fetched = prospects.length
  } catch (error) {
    logger.warn('Apollo prospect sync failed, attempting Clearbit fallback', {
      error
    })

    try {
      prospects = await fetchClearbitProspects(filters)
      activeProvider = 'clearbit'
      stats.fetched = prospects.length
    } catch (fallbackError) {
      logger.error('Prospect sync failed', {
        provider,
        error,
        fallbackError
      })
      await recordSyncLog(
        provider,
        filters,
        stats,
        'error',
        (fallbackError as Error).message
      )
      throw fallbackError
    }
  }

  const upsertResult = await upsertProspects(activeProvider, prospects)
  stats.inserted = upsertResult.inserted
  stats.skipped = upsertResult.skipped

  await recordSyncLog(activeProvider, filters, stats, 'success')
  return stats
}


