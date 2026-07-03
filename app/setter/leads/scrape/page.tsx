'use client'

import { SetterShell } from '../../_components/SetterShell'
import { ScraperWorkspace } from '@/app/_shared/rep-workspace/ScraperWorkspace'

export default function SetterScrapePage() {
  return (
    <SetterShell activeLabel="Leads">
      <ScraperWorkspace leadsHref="/setter/leads" />
    </SetterShell>
  )
}
