'use client'

import { SetterShell } from '../_components/SetterShell'
import { DialerCockpit } from '../_components/DialerCockpit'

export default function SetterDialerPage() {
  // Full-screen call cockpit. SetterShell only mounts the floating
  // Dialer panel on /setter/leads*, so the cockpit's engine instance is
  // the only Telnyx session on this route. Desktop tool - mobile keeps
  // the tel: link fallback on the leads list.
  return (
    <SetterShell activeLabel="Leads">
      <div className="hidden lg:block min-h-[calc(100vh-0px)]">
        <DialerCockpit />
      </div>
      <div className="lg:hidden px-6 py-16 text-center text-sm text-slate-500">
        The call cockpit is a desktop tool - on mobile, dial straight from the leads list.
      </div>
    </SetterShell>
  )
}
