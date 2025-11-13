import { logger } from '@/lib/monitoring'
import { getIntegrationSecret } from '@/lib/integrations/service'
import type { ProspectFiltersInput } from '@/lib/prospecting/types'

const CLEARBIT_URL = 'https://prospector.clearbit.com/v1/people/search'

type ClearbitPerson = {
  id: string
  name: {
    givenName?: string
    familyName?: string
    fullName?: string
  }
  email?: string
  phone?: string
  title?: string
  linkedin?: string
  location?: string
  company?: {
    name?: string
    site?: string
    metrics?: {
      employeesRange?: string
      employees?: number
      annualRevenue?: number
    }
    industry?: string
  }
}

type ClearbitResponse = {
  results: ClearbitPerson[]
}

export function buildClearbitQuery(filters: ProspectFiltersInput) {
  const query: Record<string, unknown> = {}

  if (filters.industries?.length) {
    query.industry = filters.industries.join(',')
  }

  if (filters.titles?.length) {
    query.title = filters.titles.join(',')
  }

  if (filters.locations?.length) {
    query.location = filters.locations.join(',')
  }

  if (filters.employeeCount?.min) {
    query.employees_greater_than = filters.employeeCount.min
  }
  if (filters.employeeCount?.max) {
    query.employees_less_than = filters.employeeCount.max
  }

  if (filters.keywords?.length) {
    query.q = filters.keywords.join(' ')
  }

  return query
}

export async function fetchClearbitProspects(filters: ProspectFiltersInput) {
  const apiKey = await getIntegrationSecret('clearbit', 'api_key')
  if (!apiKey) {
    throw new Error('Clearbit API key not configured')
  }

  const query = new URLSearchParams(buildClearbitQuery(filters) as Record<string, string>)
  const response = await fetch(`${CLEARBIT_URL}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  })

  if (!response.ok) {
    const body = await response.text()
    logger.error('Clearbit fetch failed', {
      status: response.status,
      body
    })
    throw new Error(`Clearbit request failed with ${response.status}`)
  }

  const data = (await response.json()) as ClearbitResponse
  return data.results ?? []
}


