'use client'

import { SetterShell } from '../_components/SetterShell'
import { SetterLeadsWorkspace } from '../_components/SetterLeadsWorkspace'

export default function SetterLeadsPage() {
  // Setter-styled fork of the shared LeadsWorkspace (v5 redesign) -
  // /sales/leads keeps rendering the untouched shared component.
  return (
    <SetterShell activeLabel="Leads">
      <SetterLeadsWorkspace />
    </SetterShell>
  )
}
