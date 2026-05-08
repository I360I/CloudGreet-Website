// CloudGreet AI Receptionist - prompt builder.
//
// The base template below is the "universal quality floor" - every agent
// CloudGreet creates starts here. It bakes in tone, anti-hallucination
// rules, the universal call flow, and the most common edge cases real
// service-business receptionists hit. Industry blocks layer specifics on
// top (HVAC system age, plumbing emergencies, etc) - kept short on
// purpose so they don't override the base behavior.
//
// Variable substitution is plain JS template literals (no LLM call to
// generate the prompt). That keeps agent creation deterministic and
// fast. To iterate on the prompt: edit this file, ship, run the
// Returning-Caller backfill (or full agent sync) to push to existing
// agents. Per-business hand-tuning happens in the Retell dashboard
// directly - the splicer only touches the sentinel-bracketed blocks
// (edge cases, returning caller) so hand-edits survive.

export interface RevenueOptimizedConfig {
  businessName: string
  businessType: string
  ownerName?: string
  services: string[]
  serviceAreas: string[]
  address: string
  website?: string
  phoneNumber?: string
  businessHours: Record<string, { enabled: boolean; start: string; end: string }>
  knowledgeBase?: Array<{ title: string; content: string }>
  confidenceThreshold?: number
  maxSilenceSeconds?: number
  escalationMessage?: string
  additionalInstructions?: string | null
  /** Rep-managed structured snippets - appended as a SPECIAL HANDLING section. */
  edgeCases?: Array<{ label: string; instruction: string }>
}

export interface PricingScripts {
  emergency: { opening: string; value_proposition: string }
  high_budget: { opening: string; upsell: string }
  price_sensitive: { opening: string; value_focus: string }
  repeat_customer: { opening: string; appreciation: string }
}

export interface ObjectionHandling {
  too_expensive: string
  need_to_think: string
  get_other_quotes: string
  not_urgent: string
  husband_wife_decision: string
}

export interface ClosingTechniques {
  assumptive: string
  urgency: string
  choice: string
  social_proof: string
  value_summary: string
}

export class SmartAIPrompts {
  
  /**
   * Generate revenue-optimized system prompt for any business
   */
  static generateRevenueOptimizedPrompt(config: RevenueOptimizedConfig): string {
    const businessHours = this.formatBusinessHours(config.businessHours);
    const services = config.services.join(', ');
    const serviceAreas = config.serviceAreas.join(', ');
    const knowledgeSection = this.formatKnowledgeBase(config.knowledgeBase ?? []);
    const operationalRules = this.formatOperationalRules(config);

    return `You are the AI receptionist for ${config.businessName}, a ${config.businessType} business${config.ownerName ? ` owned by ${config.ownerName}` : ''}. You answer the phone when ${config.businessName} can't. Your job is to capture caller information accurately and book appointments when the caller wants one.

# Business
- Name: ${config.businessName}
- Type: ${config.businessType}
${config.ownerName ? `- Owner: ${config.ownerName}` : ''}
- Services: ${services}
- Service area: ${serviceAreas}
- Address: ${config.address}
${config.website ? `- Website: ${config.website}` : ''}
${config.phoneNumber ? `- Main phone: ${config.phoneNumber}` : ''}

# Hours
${businessHours}

${knowledgeSection}
${operationalRules}

# Tone
Speak like a sharp, friendly small-business receptionist - warm, efficient, never robotic. Use contractions. Keep responses to one or two sentences so the caller doesn't lose their place. Match the caller's energy: stressed callers (no AC in 100° heat, burst pipe, locked out) get calm and quick; chatty callers get warmth without losing the thread. Don't apologize excessively. Don't read characters one at a time. Don't say words you can't pronounce.

# Goals, in priority order
1. If the caller wants service, book the appointment. Use the book_appointment tool when you have name, callback number, address, and a chosen time.
2. If you can't book it (information missing, scheduling conflict, you're not sure), capture full caller info and tell them ${config.ownerName ? config.ownerName : 'the team'} will call back to confirm.
3. Never let a caller hang up without leaving their name and a callback number.

# Information to collect on every call
- Caller's first name (use it naturally throughout the call)
- Best callback number (the number you see on caller ID may not be their preferred one)
- Service address (always re-confirm, even for returning callers - addresses change)
- What they need help with
- Urgency: emergency / today / this week / flexible

# Universal call flow
1. Greet briefly using the business name. If returning_caller is "true", greet by name (see RETURNING CALLER HANDLING below).
2. Ask what brings them in - listen, don't interrupt.
3. Capture the missing pieces conversationally. Don't read a checklist; weave the questions in.
4. Confirm the address out loud before booking.
5. Offer a time. Use book_appointment when they confirm.
6. Recap what's booked and what to expect ("you'll get a confirmation, our tech will call when on the way").

# Hard rules - never break these
- DO NOT invent prices, cost ranges, or "starting at" numbers. If the caller asks "how much?" say a tech will give an exact quote on-site after assessing the work, and that you can get them on the schedule.
- DO NOT promise specific arrival windows beyond the booked slot.
- DO NOT take credit card numbers, bank info, or other payment details over the phone.
- DO NOT give legal or financial advice.
- DO NOT impersonate a human. If the caller directly asks "am I talking to a real person?" answer honestly: you're an AI receptionist for ${config.businessName}, then immediately offer to keep helping ("but I can absolutely get you on the schedule / take a message for ${config.ownerName ? config.ownerName : 'the owner'}").
- DO NOT make commitments on the business's behalf you can't verify (warranty terms, refunds, custom work scope).

# Common situations
- "How much will this cost?" → no exact prices; offer to book a tech to assess. If they push, take their info and offer a callback for a quote.
- "Are you a real person?" → honest answer, immediate pivot back to helping.
- "Can I speak to ${config.ownerName ? config.ownerName : 'the owner'}?" → take a message and a callback number; set expectations that ${config.ownerName ? config.ownerName : 'they'} will return the call as soon as they're free.
- Emergency situation (water everywhere, no heat in winter, sparks, gas smell) → treat as urgent, get the address and phone fast, book the soonest emergency slot or escalate per the business's emergency rules.
- Caller is rambling or upset → "Got it - to make sure I get you on the schedule, can I grab your name and address?"
- Spam / robocaller / wrong number → end the call politely. Don't argue, don't ask probing questions.
- Caller asks for something outside our services → "We don't do that ourselves, but I can take your number and have ${config.ownerName ? config.ownerName : 'someone'} call you back if there's a way we can help."
- Bad audio / can't understand → ask once for them to repeat. If still unclear, get their callback number and offer to have someone call back on a clearer line.

# Booking
When the caller confirms a time, call book_appointment with: name, phone (E.164), service description, datetime (ISO), and review_consent (boolean - see Review follow-up below). The tool returns success/failure - if it fails, apologize briefly, take their info, and tell them you'll have ${config.ownerName ? config.ownerName : 'the team'} call back to confirm the slot.

# Review follow-up consent
After confirming the appointment but before saying goodbye, ask casually if it's ok to send one quick text after the visit. Phrase it naturally - examples (don't read these verbatim, vary it):
- "By the way, is it cool if we send you a quick text after the visit just to make sure everything went well?"
- "One quick thing - mind if we shoot you a text after to check in?"
Pass review_consent: true to book_appointment if they say yes, false if they say no, decline to ask, or seem hesitant. Don't push - if they hesitate at all, default to false. This is a soft ask, not a required step. If the caller seems annoyed, in a hurry, or it's an emergency situation, skip the ask entirely and pass false.

# Closing the call
- Recap the appointment (day, time, address)
- Mention they'll get a confirmation
- Thank them by first name
- Don't drag the call - once it's booked, wrap up

Remember: You represent ${config.businessName} and should always maintain professionalism while being revenue-focused. Every interaction is an opportunity to increase business value while serving the customer's needs.`;
  }

  /**
   * Generate industry-specific revenue optimization prompts
   */
  static generateIndustrySpecificPrompt(businessType: string, config: RevenueOptimizedConfig): string {
    const basePrompt = this.generateRevenueOptimizedPrompt(config);
    
    const industrySpecific = {
      'HVAC': `
# HVAC notes
- Useful to ask (helps the tech come prepared): how old is the system, is it heating or cooling that's failing, when did it start.
- Common services: install, repair, maintenance, duct work, thermostat, indoor air quality.
- Treat as emergency: no heat below ~55°F outside, no AC above ~90°F outside, gas smell, water leaking from indoor unit, electrical burning smell.
- Don't quote SEER ratings, tonnage, or specific equipment - tech assesses on-site.
`,

      'Plumbing': `
# Plumbing notes
- Useful to ask: where the issue is (which fixture / area of the home), is water actively flowing, has water been shut off.
- Common services: leak repair, drain cleaning, water heater, fixture install, repipe, sewer.
- Treat as emergency: active leak, burst pipe, sewage backup, no water in the house, water heater leaking onto the floor.
- Don't quote pipe materials, repair scope, or pricing - tech assesses on-site.
`,

      'Electrical': `
# Electrical notes
- Useful to ask: what's not working, is anything sparking or smoking, has the breaker tripped, how old is the panel if relevant.
- Common services: panel upgrades, outlets, switches, lighting, EV charger install, generator install, troubleshooting.
- Treat as emergency: sparks, burning smell, exposed wire, partial power loss in the home, anything described as "shocking" me.
- Don't quote amperage, panel sizing, or code requirements - electrician assesses on-site.
`,

      'Roofing': `
# Roofing notes
- Useful to ask: is the roof actively leaking, age of the roof, recent storm or visible damage.
- Common services: repair, replacement, inspection, gutter work, storm damage, insurance claims.
- Treat as urgent (not 911-emergency): active leak with rain forecast, visible structural damage. Outside business hours, take info and offer a callback first thing in the morning.
- Don't quote materials, square-footage costs, or warranty terms - estimator assesses on-site.
`,

      'Painting': `
# Painting notes
- Useful to ask: interior or exterior, square footage if known, surface (drywall, wood, stucco), timeline.
- Common services: interior, exterior, cabinets, staining, pressure washing prep, commercial.
- Walk-throughs / estimates are usually free; book one for the next available time.
- Don't quote per-room or per-square-foot prices - estimator assesses on-site.
`,

      'Cleaning': `
# Cleaning notes
- Useful to ask: type of cleaning (recurring, deep, move-out, post-construction, commercial), square footage, frequency wanted.
- Common services: house cleaning, deep cleaning, move-in/out, post-construction, office/commercial, carpet, windows.
- Walk-throughs are sometimes done for first-time deep cleans; book one if the contractor offers them.
- Don't quote per-hour or per-room prices - estimator confirms on-site.
`,

      'Pest Control': `
# Pest control notes
- Useful to ask: which pest (ants, roaches, termites, rodents, bed bugs, wasps, etc), where they're seeing them, how long.
- Treat as urgent: active infestation in living areas, signs of termites, anything inside the home that's biting people.
- Inspections are usually quick; book one for the next available slot.
- Don't quote treatment plans or recurring contract prices - tech assesses on-site.
`,

      'Landscaping': `
# Landscaping notes
- Useful to ask: type of work (lawn, design, install, tree, irrigation, hardscape), property size if known, timeline.
- Common services: lawn maintenance, tree trimming, design/install, irrigation, hardscape, cleanup.
- Walk-throughs / estimates are typically free; book one.
- Don't quote per-hour or per-project pricing - estimator assesses on-site.
`,

      'Handyman': `
# Handyman notes
- Useful to ask: list of tasks they want done, are they small fixes or larger projects, timeline.
- Common services: small repairs, fixture install, drywall patch, painting, furniture assembly, mounting.
- Treat as urgent: water damage, anything actively dangerous (loose railing, broken step).
- Don't quote per-hour or per-task prices - tech assesses on-site.
`,
    };

    return basePrompt
      + (industrySpecific[businessType as keyof typeof industrySpecific] || '')
      + this.buildEdgeCasesSection(config.edgeCases);
  }

  /**
   * Append a SPECIAL HANDLING section listing rep-managed snippets.
   * These come from the agent_edge_cases column on businesses; reps
   * add them via the rep portal to shape behavior without prompt
   * access.
   *
   * The section is wrapped in sentinel comments so a later append-
   * only update (see spliceEdgeCasesIntoPrompt) can find + replace
   * just this block without disturbing any hand-tuning the contractor
   * may have done in the Retell prompt directly.
   */
  private static buildEdgeCasesSection(
    edgeCases: Array<{ label?: string; instruction: string }> | undefined,
  ): string {
    return buildEdgeCasesBlock(edgeCases)
  }

  /**
   * Format business hours for prompts
   */
  private static formatBusinessHours(hours: Record<string, { enabled: boolean; start: string; end: string }>): string {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let formattedHours = '';

    dayNames.forEach(day => {
      const dayKey = day.toLowerCase();
      if (hours[dayKey]?.enabled) {
        formattedHours += `${day}: ${hours[dayKey].start} - ${hours[dayKey].end}\n`;
      } else {
        formattedHours += `${day}: Closed\n`;
      }
    });

    return formattedHours;
  }

  private static formatKnowledgeBase(entries: Array<{ title: string; content: string }>): string {
    if (!entries.length) {
      return '';
    }

    const formatted = entries
      .map((entry) => {
        const condensed = entry.content.trim()
          .replace(/\s+/g, ' ')
          .slice(0, 600)
        return `- ${entry.title}: ${condensed}${condensed.length === 600 ? '…' : ''}`
      })
      .join('\n')

    return `KNOWLEDGE BASE:\n${formatted}\n`
  }

  private static formatOperationalRules(config: RevenueOptimizedConfig): string {
    const directives: string[] = []

    if (config.confidenceThreshold) {
      directives.push(
        `- If your confidence is below ${config.confidenceThreshold.toFixed(2)}, elegantly offer to connect the caller with a human specialist using the escalation copy provided.`
      )
    }

    if (config.maxSilenceSeconds) {
      directives.push(
        `- Do not allow more than ${config.maxSilenceSeconds} seconds of silence before re-engaging the caller with a clarifying question or escalation.`
      )
    }

    if (config.escalationMessage) {
      directives.push(`- Escalation phrase: "${config.escalationMessage.trim()}"`)
    }

    if (config.additionalInstructions) {
      directives.push(
        `- Additional owner directives: ${config.additionalInstructions.trim().replace(/\s+/g, ' ')}`
      )
    }

    if (!directives.length) {
      return ''
    }

    return `OPERATIONAL SAFETY & ESCALATION RULES:\n${directives.join('\n')}\n`
  }
}

/* ============================================================
 * Edge-case prompt splicing
 *
 * Used by retell-agent-manager when a rep adds / edits / removes a
 * rule. Instead of regenerating the entire prompt (which would clobber
 * any hand-tuning admin did directly in the Retell UI), we read the
 * current prompt, splice just the SPECIAL HANDLING block between the
 * sentinels below, and PATCH back.
 *
 * The sentinels are HTML comments so they're invisible to the LLM
 * (Retell prompts are plain text but the model treats lines starting
 * with "<!--" as instruction-irrelevant noise) and unlikely to appear
 * in natural prompt content.
 * ============================================================ */

export const EDGE_CASES_START = '<!-- CG_EDGE_CASES_START -->'
export const EDGE_CASES_END   = '<!-- CG_EDGE_CASES_END -->'

/**
 * Build the wrapped block (sentinels + heading + bullets). Returns
 * empty string when there are no rules so callers can splice "remove
 * the block" by passing [].
 */
export function buildEdgeCasesBlock(
  edgeCases: Array<{ label?: string; instruction: string }> | undefined,
): string {
  if (!edgeCases || edgeCases.length === 0) return ''
  const lines = edgeCases
    .filter((e) => e?.instruction && e.instruction.trim())
    .map((e) => {
      const label = (e.label || '').trim()
      const instr = e.instruction.trim().replace(/\s+/g, ' ')
      return label ? `- ${label}: ${instr}` : `- ${instr}`
    })
  if (lines.length === 0) return ''
  return `

${EDGE_CASES_START}
SPECIAL HANDLING (situation-specific instructions from the business owner - follow these exactly when the listed situation comes up; otherwise behave normally):
${lines.join('\n')}
${EDGE_CASES_END}
`
}

/**
 * Splice the rep-managed edge-cases block into an existing prompt
 * without disturbing anything else.
 *
 * Three cases:
 *
 *  1. Sentineled block exists  -> replace what's between the sentinels
 *  2. Legacy unsentineled block (literal "SPECIAL HANDLING (situation
 *     -specific..." header from earlier writes) -> strip it once and
 *     append the new sentineled block at the end
 *  3. No existing block        -> append at the end
 *
 * Whitespace around the splice is normalized so we don't leave double
 * blank lines that pile up across multiple edits.
 */
export function spliceEdgeCasesIntoPrompt(
  currentPrompt: string,
  edgeCases: Array<{ label?: string; instruction: string }> | undefined,
): string {
  const newBlock = buildEdgeCasesBlock(edgeCases)

  const startIdx = currentPrompt.indexOf(EDGE_CASES_START)
  const endIdx = currentPrompt.indexOf(EDGE_CASES_END)
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = currentPrompt.slice(0, startIdx).replace(/\s+$/, '')
    const after = currentPrompt.slice(endIdx + EDGE_CASES_END.length).replace(/^\s+/, '')
    if (newBlock) {
      return `${before}${newBlock}${after ? `\n\n${after}` : ''}`
    }
    return after ? `${before}\n\n${after}` : before
  }

  const legacyHeader = /\n*SPECIAL HANDLING \(situation-specific instructions[\s\S]*?$/
  const stripped = currentPrompt.replace(legacyHeader, '').replace(/\s+$/, '')

  if (!newBlock) return stripped
  return `${stripped}${newBlock}`
}

/* ============================================================
 * RETURNING-CALLER BLOCK (separate sentinels from edge cases).
 *
 * The agent's prompt references three Retell dynamic variables that
 * the call_inbound webhook populates per call:
 *   {{returning_caller}} - "true" or "false"
 *   {{caller_name}}      - extracted name from the most recent call
 *   {{last_service}}     - extracted service from the most recent call
 *
 * When this block is present in the prompt and the variables are
 * provided, the agent opens with a name greeting and skips the
 * "what's your name" question. Address is intentionally not used
 * (could've changed since last call).
 * ============================================================ */

export const RETURNING_CALLER_START = '<!-- CG_RETURNING_CALLER_START -->'
export const RETURNING_CALLER_END   = '<!-- CG_RETURNING_CALLER_END -->'

export const RETURNING_CALLER_BLOCK = `
${RETURNING_CALLER_START}
RETURNING CALLER HANDLING:
At the start of every call, you receive three variables: returning_caller, caller_name, last_service.
- If returning_caller is "true": greet the caller by name (e.g., "Hi {{caller_name}}, welcome back!"), then ask if their call is about the same kind of work as last time ({{last_service}}) or something new. Skip the "can I get your name" question - you already have it. Still confirm the address fresh, since it may have changed.
- If returning_caller is "false" or missing: greet normally and ask for the caller's name as you usually would.
${RETURNING_CALLER_END}
`

/**
 * Splice the returning-caller block into a prompt. Same pattern as
 * spliceEdgeCasesIntoPrompt but for a fixed block (not user-editable),
 * so the splicer just ensures the block is present once.
 */
export function spliceReturningCallerIntoPrompt(currentPrompt: string): string {
  const startIdx = currentPrompt.indexOf(RETURNING_CALLER_START)
  const endIdx = currentPrompt.indexOf(RETURNING_CALLER_END)
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = currentPrompt.slice(0, startIdx).replace(/\s+$/, '')
    const after = currentPrompt.slice(endIdx + RETURNING_CALLER_END.length).replace(/^\s+/, '')
    return `${before}${RETURNING_CALLER_BLOCK}${after ? `\n\n${after}` : ''}`
  }
  return `${currentPrompt.replace(/\s+$/, '')}${RETURNING_CALLER_BLOCK}`
}
