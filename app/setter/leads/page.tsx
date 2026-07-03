'use client'

import { SetterShell } from '../_components/SetterShell'
import { LeadsWorkspace } from '@/app/_shared/rep-workspace/LeadsWorkspace'

export default function SetterLeadsPage() {
  // No leadDetailBase - setters don't have a lead detail page yet
  // (explicit v1 scope boundary). Business names render as plain text
  // instead of a link; the list row already surfaces contact/phone/email/
  // notes preview/follow-up/touch-count.
  return (
    <SetterShell activeLabel="Leads">
      <LeadsWorkspace scrapeHref="/setter/leads/scrape" />
    </SetterShell>
  )
}
