'use client'

import { DialerCockpit } from '../_components/DialerCockpit'

export default function SetterDialerPage() {
  // Full-screen call cockpit - a view over the layout-level
  // DialerSessionProvider, so navigating to other tabs mid-session
  // keeps the call + queue alive. Desktop tool - mobile keeps the
  // tel: link fallback on the leads list.
  return (
    <>
      <div className="hidden lg:block h-screen overflow-hidden">
        <DialerCockpit />
      </div>
      <div className="lg:hidden px-6 py-16 text-center text-sm text-slate-500">
        The call cockpit is a desktop tool - on mobile, dial straight from the leads list.
      </div>
    </>
  )
}
