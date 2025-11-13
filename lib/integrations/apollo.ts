import { logger } from '@/lib/monitoring'
import { getIntegrationSecret } from '@/lib/integrations/service'
import type { ProspectFiltersInput } from '@/lib/prospecting/types'

const APOLLO_API_URL = 'https://api.apollo.io/v1'

type ApolloPerson = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone_numbers?: Array<{ number: string | null }>
  title: string | null
  linkedin_url: string | null
  city: string | null
  state: string | null
  country: string | null
  organization?: {
    name: string | null
    website_url: string | null
    industry: string | null
    estimated_num_employees: number | null
    estimated_annual_revenue: number | null
  }
}

type ApolloSearchResponse = {
  people: ApolloPerson[]
  pagination: {
    total_entries: number
    page: number
    per_page: number
    total_pages: number
  }
}

export function buildApolloPayload(filters: ProspectFiltersInput) {
  const { industries, titles, locations, employeeCount, keywords } = filters
  const payload: Record<string, unknown> = {
    page: 1,
    person_titles: titles,
    person_locations: locations,
    person_keywords: keywords,
    company_industries: industries
  }

  if (employeeCount?.min || employeeCount?.max) {
    payload.company_employee_ranges = [
      {
        min: employeeCount.min,
        max: employeeCount.max
      }
    ]
  }

  return payload
}

export async function fetchApolloProspects(
  filters: ProspectFiltersInput
): Promise<ApolloPerson[]> {
  const apiKey = await getIntegrationSecret('apollo', 'api_key')
  if (!apiKey) {
    throw new Error('Apollo API key not configured')
  }

  const response = await fetch(`${APOLLO_API_URL}/mixed_people/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify(buildApolloPayload(filters))
  })

  if (!response.ok) {
    const body = await response.text()
    logger.error('Apollo fetch failed', {
      status: response.status,
      body
    })
    throw new Error(`Apollo request failed with ${response.status}`)
  }

  const data = (await response.json()) as ApolloSearchResponse
  return data.people ?? []
}


