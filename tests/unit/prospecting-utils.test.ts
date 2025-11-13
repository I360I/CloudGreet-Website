import { describe, expect, it } from '@jest/globals'
import { buildApolloPayload } from '@/lib/integrations/apollo'
import { buildClearbitQuery } from '@/lib/integrations/clearbit'

describe('Prospecting integrations', () => {
  const filters = {
    industries: ['HVAC', 'Roofing'],
    titles: ['Owner', 'CEO'],
    locations: ['Austin, TX'],
    keywords: ['commercial'],
    employeeCount: {
      min: 10,
      max: 200
    }
  }

  it('builds Apollo payload with filters', () => {
    const payload = buildApolloPayload(filters)
    expect(payload).toMatchObject({
      company_industries: filters.industries,
      person_titles: filters.titles,
      person_locations: filters.locations,
      person_keywords: filters.keywords
    })

    expect(payload).toHaveProperty('company_employee_ranges')
    const range = (payload as Record<string, unknown>).company_employee_ranges as Array<Record<string, number>>
    expect(range[0].min).toBe(10)
    expect(range[0].max).toBe(200)
  })

  it('builds Clearbit query string with filters', () => {
    const query = buildClearbitQuery(filters)
    expect(query.industry).toBe('HVAC,Roofing')
    expect(query.title).toBe('Owner,CEO')
    expect(query.location).toBe('Austin, TX')
    expect(query.q).toBe('commercial')
    expect(query.employees_greater_than).toBe(10)
    expect(query.employees_less_than).toBe(200)
  })
})


