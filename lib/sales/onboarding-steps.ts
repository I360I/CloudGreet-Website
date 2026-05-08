/**
 * Async rep onboarding - step config.
 *
 * Source of truth for the 7-step gated flow at /sales/onboarding. Drop
 * a Loom/Mux/MP4 URL into the empty videoUrl field for each step as
 * the videos get recorded - no DB change required.
 *
 * Step ordering is the array order. The doc's spec keeps Stripe Connect
 * as step 3 because we want the rep payment-ready before they see the
 * dashboard or learn the pitch. The Stripe step is special-cased in the
 * UI: the "Mark complete" button is disabled until
 * sales_reps.stripe_connect_payouts_enabled is true.
 *
 * The script outline strings here are NOT what the rep sees as the
 * primary content - the video is. They render below the video as a
 * "What this video covers" reference so a rep skimming for a fact
 * doesn't have to rewatch the whole thing.
 */

export type StepKey =
  | 'welcome'
  | 'compensation'
  | 'stripe-connect'
  | 'dashboard-walkthrough'
  | 'sales-pitch'
  | 'demo-flow'
  | 'quiz'

export type OnboardingStep = {
  key: StepKey
  number: number
  title: string
  goal: string
  durationLabel: string
  videoUrl: string
  /** Bullet points from the video script - shown as a reference list. */
  outline: string[]
  /**
   * Step 3 ('stripe-connect') is gated by Stripe Connect payouts being
   * enabled. Step 7 ('quiz') replaces the normal "mark complete" with
   * a quiz UI. Other steps are simple watch + click.
   */
  kind: 'standard' | 'stripe-connect' | 'quiz'
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'welcome',
    number: 1,
    title: 'Welcome & product intro',
    goal: 'Context on what CloudGreet is and who buys it.',
    durationLabel: '3-5 min',
    videoUrl: '',
    kind: 'standard',
    outline: [
      'Founder intro - who built CloudGreet and why',
      'What CloudGreet does (24/7 AI receptionist, books appointments)',
      'Live demo: hear the AI handle a call end-to-end',
      'Who buys this: HVAC, plumbing, roofing, legal, auto - service businesses losing money to missed calls',
      'Why it sells: average service business misses 30% of calls',
    ],
  },
  {
    key: 'compensation',
    number: 2,
    title: 'How you get paid',
    goal: 'The 50/50 split, weekly Stripe payouts, and the trailing-commission structure.',
    durationLabel: '3-5 min',
    videoUrl: '',
    kind: 'standard',
    outline: [
      '50/50 split on every dollar (setup fees AND monthly recurring)',
      'You set your own pricing per close - recommended start: $500/mo + $500 setup',
      'Math: 5 closes/mo at recommended pricing = $1,250/mo recurring + $1,250 in setup',
      'Bigger fish: $2,000/mo law firm = $1,000/mo recurring forever, off one deal',
      'Friday auto-payouts via Stripe Connect - no invoicing, no chasing',
      'Trailing commission: 0-3 mo inactive = full 50% MRR; 3-6 mo = 25%; 6 mo+ = clients transfer to CG',
      'Any new close resets the clock back to month 0',
      '1099 contractor; Stripe auto-files at year-end if you cross $600',
    ],
  },
  {
    key: 'stripe-connect',
    number: 3,
    title: 'Connect Stripe for payouts',
    goal: 'Get payment-ready before you start working leads.',
    durationLabel: '2-3 min',
    videoUrl: '',
    kind: 'stripe-connect',
    outline: [
      'Click "Connect bank account" - Stripe Connect Express handles KYC, SSN, bank linking',
      'Wait for the green check showing payouts are enabled',
      'If Stripe asks for extra documents, complete them in their flow',
      'Payouts run Friday at 9 AM ET / 6 AM PT',
    ],
  },
  {
    key: 'dashboard-walkthrough',
    number: 4,
    title: 'Tour of the rep dashboard',
    goal: 'Get comfortable with every page so you can use it without thinking.',
    durationLabel: '5-10 min',
    videoUrl: '',
    kind: 'standard',
    outline: [
      'Login at /login',
      'Overview: owed banner, call list, in-flight deals, sidebar nav',
      'Leads: scrape new leads, 200+ daily limit, contractor licensing databases',
      'Lead detail: status pills, call button, notes thread, follow-up scheduler',
      '"Send booking link": provisions a client account and emails the prospect',
      '"Send payment link": punch in pricing, generates Stripe checkout',
      'Closes: track in-flight deals',
      'Clients: closed clients, monthly revenue, agent status',
      'Earnings: real-time MRR, lifetime commission, owed-this-Friday',
      'Settings: booking URL (Cal.com or Calendly) and personal Cal API key',
    ],
  },
  {
    key: 'sales-pitch',
    number: 5,
    title: 'The pitch & objection handling',
    goal: 'A battle-tested script you can use on day one.',
    durationLabel: '5-10 min',
    videoUrl: '',
    kind: 'standard',
    outline: [
      'Cold call openers (aggressive, soft, educational)',
      'Discovery: how many calls do you miss, who answers after hours, etc.',
      'The pitch: problem → solution → proof → ask',
      'Pricing: when to bring up money, anchor at $500/mo, when to flex',
      'Objection: "Too expensive" → run the math on missed calls',
      'Objection: "I have a receptionist" → ask about after-hours coverage',
      'Objection: "We don\'t get many calls" → ask if they want to grow',
      'Objection: "Sounds like a scam" → offer the live demo',
      'Objection: "Let me think about it" → schedule a follow-up demo with the booking link',
      'Closing: assumptive, alternative, urgency',
    ],
  },
  {
    key: 'demo-flow',
    number: 6,
    title: 'Running the demo & rough-draft handoff',
    goal: 'How a demo turns into a close, plus the customization-form handoff.',
    durationLabel: '5-10 min',
    videoUrl: '',
    kind: 'standard',
    outline: [
      'Schedule via your booking link',
      'Pre-demo prep: review the lead, scrape extra context',
      '1 min rapport · 5 min live agent demo · 3 min dashboard · 3 min pricing · 3 min close',
      'Frame the demo agent as a ROUGH DRAFT - "We customize before going live"',
      'On a yes: send payment link, walk through Stripe checkout',
      'On "let me think": set follow-up, send recap email',
      'On a no: ask why, learn, move on',
      'After the close, send the customization form. The platform handles the rest.',
      'Your job ends at form submission. We build, polish, and run the go-live call.',
    ],
  },
  {
    key: 'quiz',
    number: 7,
    title: 'Knowledge quiz',
    goal: 'Pass at 80% to unlock the full dashboard.',
    durationLabel: '~10 min',
    videoUrl: '',
    kind: 'quiz',
    outline: [
      '10 multiple-choice questions covering steps 1-6',
      'No time limit, unlimited retakes',
      'Pass threshold: 80% (8 of 10)',
      'Failed questions are flagged so you can rewatch the relevant video',
    ],
  },
]

export function getStep(n: number): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((s) => s.number === n)
}
