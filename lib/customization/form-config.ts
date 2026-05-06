/**
 * Customization form - section + field definitions.
 *
 * Source of truth for the post-close form the client fills out at
 * /dashboard/customize. The server stores answers as a flat record
 * keyed by `field.id` on businesses.customization (jsonb), so adding
 * or renaming a field is a code change here - no migration.
 *
 * Sections are rendered in the order listed. Within a section, fields
 * are rendered in the order listed.
 *
 * Per the pre-demo doc, the form has 8 sections covering everything
 * needed to build a polished Retell agent without having to call the
 * client for follow-ups.
 */

export type FieldKind =
  | 'text'        // single-line string
  | 'longtext'    // multi-line string
  | 'list'        // array of strings (one per line in textarea)
  | 'yesno'       // 'yes' | 'no' | ''
  | 'select'      // string from `options`
  | 'kv-list'     // array of {key,value} - used for "service: price" rows
  | 'time-grid'   // hours of operation, weekly schedule

export type FormField = {
  id: string
  label: string
  kind: FieldKind
  /** Displayed under the input, italic. */
  hint?: string
  /** Required to submit (not just save). */
  required?: boolean
  /** For 'select' kind. */
  options?: string[]
  /** For 'kv-list' kind. */
  keyLabel?: string
  valueLabel?: string
}

export type FormSection = {
  id: string
  title: string
  blurb: string
  fields: FormField[]
}

export const FORM_SECTIONS: FormSection[] = [
  {
    id: 'basics',
    title: 'Business basics',
    blurb: 'The core info the agent will say back to callers.',
    fields: [
      { id: 'business_name', label: 'Business name (exactly as you want the agent to say it)', kind: 'text', required: true },
      { id: 'owner_name',    label: 'Owner name', kind: 'text' },
      { id: 'forward_phone', label: 'Phone number to forward to a human', kind: 'text', hint: 'When the AI hands off - your cell or office line.', required: true },
      { id: 'address',       label: 'Address', kind: 'text' },
      { id: 'hours',         label: 'Hours of operation', kind: 'time-grid', hint: 'The agent uses this to answer "are you open?" questions.', required: true },
    ],
  },
  {
    id: 'services',
    title: 'Services',
    blurb: 'What you do, what you don\'t do, and where you do it.',
    fields: [
      { id: 'services_offered', label: 'Services you offer', kind: 'list', hint: 'One per line.', required: true },
      { id: 'services_not_offered', label: 'Services you DON\'T offer', kind: 'list', hint: 'So the agent doesn\'t waste your time on calls you can\'t take.' },
      { id: 'service_area',     label: 'Service area (zip codes / cities)', kind: 'list', hint: 'One per line.' },
      { id: 'emergency_services', label: 'Do you offer emergency / after-hours services?', kind: 'yesno' },
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing',
    blurb: 'How the agent should handle "how much does it cost?"',
    fields: [
      { id: 'price_over_phone', label: 'Do you give pricing over the phone?', kind: 'yesno', required: true },
      { id: 'price_list',       label: 'Common services + prices', kind: 'kv-list', keyLabel: 'Service', valueLabel: 'Price', hint: 'If you said yes above. Otherwise leave blank.' },
      { id: 'price_no_response', label: 'If a caller asks for a price and you don\'t give them, what should the agent say?', kind: 'longtext', hint: 'e.g. "We do all quotes in person, I\'ll get someone to call you back."' },
      { id: 'free_estimates',   label: 'Do you offer free estimates?', kind: 'yesno' },
    ],
  },
  {
    id: 'booking',
    title: 'Booking & scheduling',
    blurb: 'How the agent should book real appointments on your calendar.',
    fields: [
      { id: 'appt_types',       label: 'Appointment types the agent should book', kind: 'list', hint: 'e.g. consultation, service call, quote.' },
      { id: 'appt_length_min',  label: 'How long is each appointment? (minutes)', kind: 'text', hint: 'Just a number, e.g. 60.' },
      { id: 'booking_info',     label: 'Info needed to book', kind: 'list', hint: 'name, phone, address, problem description, etc.' },
    ],
  },
  {
    id: 'faq',
    title: 'Common questions',
    blurb: 'Top questions callers ask + how the agent should answer.',
    fields: [
      { id: 'faqs', label: 'FAQs (5-10 recommended)', kind: 'kv-list', keyLabel: 'Question', valueLabel: 'Answer' },
    ],
  },
  {
    id: 'edge-cases',
    title: 'Edge cases',
    blurb: 'How to handle the awkward calls.',
    fields: [
      { id: 'rude_caller',         label: 'What if a caller is rude or aggressive?', kind: 'longtext' },
      { id: 'asks_for_owner',      label: 'What if they ask for you specifically?', kind: 'longtext' },
      { id: 'wants_to_complain',   label: 'What if they want to file a complaint?', kind: 'longtext' },
      { id: 'competitor',          label: 'What if they sound like a competitor checking pricing?', kind: 'longtext' },
      { id: 'spanish',             label: 'What if they speak Spanish or another language?', kind: 'longtext' },
    ],
  },
  {
    id: 'voice',
    title: 'Voice & personality',
    blurb: 'How the agent should sound.',
    fields: [
      { id: 'tone', label: 'Formal or casual?', kind: 'select', options: ['Formal', 'Casual', 'Friendly professional'], required: true },
      { id: 'voice_gender', label: 'Voice preference', kind: 'select', options: ['No preference', 'Female', 'Male'] },
      { id: 'industry_terms', label: 'Industry terms or phrases the agent should know', kind: 'list', hint: 'One per line.' },
      { id: 'never_say', label: 'Anything the agent should NEVER say', kind: 'longtext' },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    blurb: 'What you already use that we should plug into.',
    fields: [
      { id: 'crm',          label: 'CRM (if any)', kind: 'select', options: ['None', 'Jobber', 'Housecall Pro', 'ServiceTitan', 'HubSpot', 'Salesforce', 'Other'] },
      { id: 'calendar',     label: 'Calendar system', kind: 'select', options: ['Google Calendar', 'Cal.com', 'Calendly', 'Outlook', 'None / Other'] },
      { id: 'lead_destination', label: 'Where should new leads go?', kind: 'select', options: ['Email', 'Text / SMS', 'Both', 'CRM'] },
    ],
  },
]

export const ALL_FIELDS: { section: FormSection; field: FormField }[] = FORM_SECTIONS.flatMap(
  (s) => s.fields.map((f) => ({ section: s, field: f })),
)

/** True if every required field has a non-empty value. */
export function isComplete(answers: Record<string, any>): boolean {
  for (const { field } of ALL_FIELDS) {
    if (!field.required) continue
    const v = answers[field.id]
    if (v === undefined || v === null) return false
    if (typeof v === 'string' && v.trim() === '') return false
    if (Array.isArray(v) && v.length === 0) return false
    if (field.kind === 'time-grid' && (typeof v !== 'object' || Object.keys(v).length === 0)) return false
  }
  return true
}
