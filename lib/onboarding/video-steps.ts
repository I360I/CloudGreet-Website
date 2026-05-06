/**
 * Async onboarding walkthrough - one entry per video step.
 *
 * Anthony records the videos and drops the URLs (Loom share link, Mux
 * playback URL, plain MP4, whatever) into `videoUrl` here. Until a URL
 * is set, the page renders a "Video coming soon" placeholder so the
 * step list still works end-to-end.
 *
 * Editing this file is the entire authoring surface - no DB changes
 * required to add/remove/reorder a step. Progress is stored per-business
 * keyed by the `key` field, so renaming a key resets that step's
 * progress (intentional - if a step changes meaningfully, the customer
 * should re-watch it).
 */

export type VideoStep = {
  key: string
  title: string
  /** One sentence under the title. */
  blurb: string
  /** Embeddable URL (Loom /embed/, Mux player, mp4, etc.). Empty = placeholder. */
  videoUrl: string
  /** Estimated runtime, shown in the list ("3 min"). */
  durationLabel: string
  /** Action checklist the customer should complete after watching. */
  actions: string[]
  /** Optional in-app deep link to the relevant settings page. */
  cta?: { label: string; href: string }
}

export const VIDEO_STEPS: VideoStep[] = [
  {
    key: 'welcome',
    title: 'Welcome - what CloudGreet does',
    blurb: 'A 2-minute tour of the product and what setup will look like.',
    videoUrl: '',
    durationLabel: '~2 min',
    actions: [
      'Watch the welcome video',
      'Decide who on your team owns this setup (you only need one person)',
    ],
  },
  {
    key: 'carrier-forwarding',
    title: 'Forward your business line',
    blurb: 'How to set conditional call forwarding on your carrier so missed calls reach CloudGreet.',
    videoUrl: '',
    durationLabel: '~4 min',
    actions: [
      'Find your carrier and line type in the Setup page',
      'Dial the forwarding code on the device that owns the number',
      'Confirm the test call lands on CloudGreet',
    ],
    cta: { label: 'Open forwarding setup', href: '/dashboard/onboarding' },
  },
  {
    key: 'calcom',
    title: 'Connect Cal.com',
    blurb: 'Hook up your calendar so the AI can book real appointments without double-booking.',
    videoUrl: '',
    durationLabel: '~3 min',
    actions: [
      'Create or sign in to Cal.com',
      'Generate an API key and paste it into the Calendar settings',
      'Pick which event type CloudGreet should book on',
    ],
    cta: { label: 'Open calendar settings', href: '/dashboard/settings' },
  },
  {
    key: 'services-pricing',
    title: 'Services and pricing',
    blurb: 'Tell the AI what you actually do and what it costs so quotes are accurate.',
    videoUrl: '',
    durationLabel: '~5 min',
    actions: [
      'List every service you offer (one per line)',
      'Add base pricing or "starts at" ranges',
      'Note any service area or job-size limits',
    ],
    cta: { label: 'Edit services', href: '/dashboard/settings' },
  },
  {
    key: 'agent-customization',
    title: 'Customize the agent',
    blurb: 'Pick the voice, the greeting, and add the FAQs your customers always ask.',
    videoUrl: '',
    durationLabel: '~4 min',
    actions: [
      'Choose a voice and greeting that matches your brand',
      'Add 5-10 frequently asked questions and the answers',
      'Note anything the AI should never promise',
    ],
    cta: { label: 'Open agent settings', href: '/dashboard/settings' },
  },
  {
    key: 'test-call',
    title: 'Make a test call',
    blurb: 'Dial in like a customer would, walk through a booking, and listen to the recording.',
    videoUrl: '',
    durationLabel: '~3 min',
    actions: [
      'Call your CloudGreet number from a phone that is NOT forwarded',
      'Pretend to be a real customer - book a job',
      'Review the call transcript and recording in the dashboard',
    ],
    cta: { label: 'View calls', href: '/dashboard/calls' },
  },
  {
    key: 'go-live',
    title: 'Go live',
    blurb: 'The forwarding flip and what to watch in the first 48 hours.',
    videoUrl: '',
    durationLabel: '~2 min',
    actions: [
      'Confirm forwarding is on for the right line type (busy/no-answer vs. all calls)',
      'Save CloudGreet support in your phone in case anything looks off',
      'Check the dashboard tomorrow morning - first 24h is the most informative',
    ],
  },
]

export type VideoProgress = Record<
  string,
  { watched?: boolean; completed?: boolean; updated_at?: string }
>

export function isStepDone(step: VideoStep, progress: VideoProgress): boolean {
  const p = progress[step.key]
  return !!(p?.watched && p?.completed)
}

export function totalDone(progress: VideoProgress): number {
  return VIDEO_STEPS.reduce((n, s) => n + (isStepDone(s, progress) ? 1 : 0), 0)
}
