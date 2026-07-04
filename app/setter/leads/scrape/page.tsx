'use client'

import { SetterShell } from '../../_components/SetterShell'
import { SetterScraperWorkspace } from '../../_components/SetterScraperWorkspace'

export default function SetterScrapePage() {
  // Setter-styled fork of the shared ScraperWorkspace (v5 redesign) -
  // /sales/leads/scrape keeps rendering the untouched shared component.
  return (
    <SetterShell activeLabel="Leads">
      <SetterScraperWorkspace />
    </SetterShell>
  )
}
