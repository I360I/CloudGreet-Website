'use client'

import { SalesShell } from '../_components/SalesShell'
import { LeadsWorkspace } from '@/app/_shared/rep-workspace/LeadsWorkspace'

export default function SalesLeadsPage() {
  return (
    <SalesShell activeLabel="Leads">
      <LeadsWorkspace scrapeHref="/sales/leads/scrape" leadDetailBase="/sales/leads" />
    </SalesShell>
  )
}
