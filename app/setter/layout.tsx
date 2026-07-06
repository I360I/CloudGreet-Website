'use client'

import { usePathname } from 'next/navigation'
import { SetterShell } from './_components/SetterShell'
import { DialerSessionProvider } from './_components/DialerSessionProvider'

/**
 * One shell + one dialer session for the whole setter app. Mounting the
 * DialerSessionProvider here (instead of inside the cockpit page) is
 * what lets a live call session survive navigating between tabs.
 *
 * accept-invite is the one public /setter route - no session, no shell.
 */
export default function SetterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  if (pathname.startsWith('/setter/accept-invite')) {
    return <>{children}</>
  }
  return (
    <DialerSessionProvider>
      <SetterShell>{children}</SetterShell>
    </DialerSessionProvider>
  )
}
