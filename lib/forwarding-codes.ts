/**
 * Per-carrier conditional / unconditional call forwarding codes.
 *
 * Sources verified at research time (2026): each carrier's official support
 * page. Star codes change occasionally — flag mismatches in customer support
 * if a contractor reports they don't work.
 */

export type LineType = 'cell_main' | 'cell_second_sim' | 'desk_landline' | 'voip'

export type ForwardingMode = 'missed_only' | 'always'

export type CarrierId =
 | 'verizon_wireless'
 | 'att_wireless'
 | 'tmobile'
 | 'spectrum'
 | 'comcast_business'
 | 'verizon_landline'
 | 'att_landline'
 | 'ringcentral'
 | 'google_voice'
 | 'openphone'
 | 'vonage'
 | 'grasshopper'
 | 'other'

export type CarrierInstruction = {
 label: string                // "Forward when busy"
 dialString: string           // "*67*1XXXXXXXXXX#" — destination already substituted
 cancelString: string         // "##67#"
 note?: string
}

export type CarrierGuide = {
 id: CarrierId
 name: string
 supportsLineTypes: LineType[]
 instructions: (destination: string, mode: ForwardingMode) => CarrierInstruction[]
 portalUrl?: string           // for VoIP carriers without star codes
 manualNote?: string          // shown in place of dial buttons
}

function digitsOnly(num: string) {
 return num.replace(/[^0-9]/g, '')
}

/** Convert to bare 10-digit (US) where applicable. */
function tenDigit(num: string) {
 const d = digitsOnly(num)
 return d.length === 11 && d.startsWith('1') ? d.slice(1) : d
}

/** Convert to 1+10-digit. */
function elevenDigit(num: string) {
 const d = digitsOnly(num)
 return d.length === 10 ? `1${d}` : d
}

export const CARRIERS: CarrierGuide[] = [
 {
  id: 'verizon_wireless',
  name: 'Verizon (wireless)',
  supportsLineTypes: ['cell_main', 'cell_second_sim'],
  instructions: (dest, mode) => {
   const n = tenDigit(dest)
   if (mode === 'always') {
    return [{
     label: 'Forward every call',
     dialString: `*72${n}`,
     cancelString: '*73',
    }]
   }
   return [{
    label: 'Forward when missed (busy / no-answer / off)',
    dialString: `*71${n}`,
    cancelString: '*73',
    note: 'iPhone users — turn off Live Voicemail (Settings → Phone) before dialing, or *71 won\'t stick.',
   }]
  },
 },
 {
  id: 'att_wireless',
  name: 'AT&T (wireless)',
  supportsLineTypes: ['cell_main', 'cell_second_sim'],
  instructions: (dest, mode) => {
   const n = elevenDigit(dest)
   if (mode === 'always') {
    return [{
     label: 'Forward every call',
     dialString: `**21*${n}#`,
     cancelString: '##21#',
    }]
   }
   return [
    { label: 'Forward when no answer', dialString: `*61*${n}#`, cancelString: '#61#' },
    { label: 'Forward when busy', dialString: `*67*${n}#`, cancelString: '#67#' },
   ]
  },
 },
 {
  id: 'tmobile',
  name: 'T-Mobile',
  supportsLineTypes: ['cell_main', 'cell_second_sim'],
  instructions: (dest, mode) => {
   const n = tenDigit(dest)
   if (mode === 'always') {
    return [{ label: 'Forward every call', dialString: `**21*${n}#`, cancelString: '##21#' }]
   }
   return [
    { label: 'Forward when no answer', dialString: `**61*${n}#`, cancelString: '##61#' },
    { label: 'Forward when busy', dialString: `**67*${n}#`, cancelString: '##67#' },
   ]
  },
 },
 {
  id: 'spectrum',
  name: 'Spectrum Business Voice',
  supportsLineTypes: ['desk_landline'],
  instructions: (dest, mode) => {
   const n = tenDigit(dest)
   if (mode === 'always') {
    return [{ label: 'Forward every call', dialString: `*72${n}`, cancelString: '*73' }]
   }
   return [
    { label: 'Forward when no answer', dialString: `*92${n}#`, cancelString: '*93' },
    { label: 'Forward when busy', dialString: `*90${n}#`, cancelString: '*91' },
   ]
  },
 },
 {
  id: 'comcast_business',
  name: 'Comcast Business Voice',
  supportsLineTypes: ['desk_landline'],
  instructions: (dest, mode) => {
   const n = tenDigit(dest)
   if (mode === 'always') {
    return [{ label: 'Forward every call', dialString: `*72${n}`, cancelString: '*73' }]
   }
   return [
    { label: 'Forward when no answer', dialString: `*92${n}#`, cancelString: '*93' },
    { label: 'Forward when busy', dialString: `*90${n}#`, cancelString: '*91' },
   ]
  },
 },
 {
  id: 'verizon_landline',
  name: 'Verizon Landline (POTS)',
  supportsLineTypes: ['desk_landline'],
  instructions: (dest, mode) => {
   const n = tenDigit(dest)
   if (mode === 'always') {
    return [{ label: 'Forward every call', dialString: `*72${n}`, cancelString: '*73' }]
   }
   return [{
    label: 'Forward when missed',
    dialString: `*71${n}`,
    cancelString: '*73',
    note: 'Default ring count before "no answer" is set by Verizon — typically 4 rings (~24s). Call Verizon to change.',
   }]
  },
 },
 {
  id: 'att_landline',
  name: 'AT&T Landline (POTS)',
  supportsLineTypes: ['desk_landline'],
  instructions: (dest, mode) => {
   const n = tenDigit(dest)
   if (mode === 'always') {
    return [{ label: 'Forward every call', dialString: `*72${n}`, cancelString: '*73' }]
   }
   return [{
    label: 'Forward when missed',
    dialString: `*71${n}`,
    cancelString: '*73',
   }]
  },
 },
 {
  id: 'ringcentral',
  name: 'RingCentral',
  supportsLineTypes: ['voip'],
  instructions: () => [],
  portalUrl: 'https://service.ringcentral.com/',
  manualNote:
   'In RingCentral: Phone System → Users → (your user) → Call Handling & Forwarding → add "Forward to other phones" with the AI number. Set ring count, save.',
 },
 {
  id: 'google_voice',
  name: 'Google Voice',
  supportsLineTypes: ['voip'],
  instructions: () => [],
  portalUrl: 'https://voice.google.com/',
  manualNote:
   'Google Voice → Settings (gear icon) → Calls → Call forwarding → Add a phone, paste the AI number. Star codes do not work on Google Voice.',
 },
 {
  id: 'openphone',
  name: 'OpenPhone',
  supportsLineTypes: ['voip'],
  instructions: () => [],
  portalUrl: 'https://my.openphone.com/',
  manualNote:
   'OpenPhone → Workspace settings → Phone numbers → (your number) → Call routing → Forward to external number.',
 },
 {
  id: 'vonage',
  name: 'Vonage Business',
  supportsLineTypes: ['voip'],
  instructions: () => [],
  portalUrl: 'https://admin.vonage.com/',
  manualNote:
   'Vonage Admin Portal → Phone System → Extensions → (your extension) → Call Forwarding → set Always / On Busy / On No Answer rules.',
 },
 {
  id: 'grasshopper',
  name: 'Grasshopper',
  supportsLineTypes: ['voip'],
  instructions: () => [],
  portalUrl: 'https://app.grasshopper.com/',
  manualNote:
   'Grasshopper → Settings → Numbers → (your number) → Call Forwarding → add the AI number.',
 },
 {
  id: 'other',
  name: 'Other / not sure',
  supportsLineTypes: ['cell_main', 'cell_second_sim', 'desk_landline', 'voip'],
  instructions: () => [],
  manualNote:
   "We'll set this up with you on a quick call. Tap the support link below.",
 },
]

export function findCarrier(id: string | null | undefined): CarrierGuide | undefined {
 if (!id) return undefined
 return CARRIERS.find((c) => c.id === id)
}

export function carriersForLineType(lineType: LineType): CarrierGuide[] {
 return CARRIERS.filter((c) => c.supportsLineTypes.includes(lineType))
}

export const LINE_TYPES: { id: LineType; label: string; description: string }[] = [
 { id: 'cell_main', label: 'My cell phone', description: 'One line for personal and business' },
 { id: 'cell_second_sim', label: 'Second SIM on my cell', description: 'Dual-SIM with a separate business line' },
 { id: 'desk_landline', label: 'Desk phone or landline', description: 'A wired phone at the shop' },
 { id: 'voip', label: 'Virtual / VoIP number', description: 'Google Voice, RingCentral, OpenPhone, etc.' },
]
