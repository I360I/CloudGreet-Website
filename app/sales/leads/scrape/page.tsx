'use client'

import { SalesShell } from '../../_components/SalesShell'
import { ScraperWorkspace } from '@/app/_shared/rep-workspace/ScraperWorkspace'

export default function SalesScrapePage() {
  return (
    <SalesShell activeLabel="Leads">
      <ScraperWorkspace leadsHref="/sales/leads" />
    </SalesShell>
  )
}
