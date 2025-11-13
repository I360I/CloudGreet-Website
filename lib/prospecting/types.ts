export type ProspectFiltersInput = {
  industries?: string[]
  titles?: string[]
  locations?: string[]
  keywords?: string[]
  employeeCount?: {
    min?: number
    max?: number
  }
}

export type ProspectRecord = {
  external_id: string
  provider: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  company_name: string | null
  job_title: string | null
  industry: string | null
  website: string | null
  city: string | null
  state: string | null
  country: string | null
  employee_range: string | null
  revenue_range: string | null
  source_url: string | null
}


