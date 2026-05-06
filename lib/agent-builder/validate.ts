/**
 * Static validation for a generated Retell prompt.
 *
 * Phase 1 validation per the doc - cheap pre-checks that catch the most
 * common failure modes (missing business name, hallucinated 24/7
 * service, generic greeting, template placeholders left behind, output
 * too short / too long). Dynamic validation (test calls) is Phase 3.
 *
 * Each check returns ok: boolean + a short detail string. The result
 * is shown in /admin/agents-due so the human spot-checker can see at
 * a glance which knobs need a closer look.
 */

import type { BusinessContext } from './build-context'

export type ValidationCheck = {
  name: string
  ok: boolean
  /** Short, one-line explanation. */
  detail: string
  /** 'critical' = block approval; 'warning' = surface but allow. */
  level: 'critical' | 'warning'
}

export type ValidationResult = {
  passed: boolean
  word_count: number
  checks: ValidationCheck[]
}

const TEMPLATE_PLACEHOLDER_RE = /\[(?:business name|owner|hours|phone|address|service area|insert|name)\]/i
const GENERIC_GREETING_RE = /how (?:can|may) i (?:help|assist) you (?:today)?\??/i

export function validatePrompt(
  prompt: string,
  ctx: BusinessContext,
): ValidationResult {
  const checks: ValidationCheck[] = []
  const lower = prompt.toLowerCase()
  const wordCount = prompt.split(/\s+/).filter(Boolean).length

  // 1. Business name actually appears in the prompt.
  const name = ctx.business.name
  const nameOk = !!name && lower.includes(name.toLowerCase())
  checks.push({
    name: 'business_name_present',
    ok: nameOk,
    detail: nameOk
      ? `"${name}" appears in the prompt`
      : `Business name "${name}" not found in the generated prompt`,
    level: 'critical',
  })

  // 2. No template placeholders left.
  const placeholderMatch = prompt.match(TEMPLATE_PLACEHOLDER_RE)
  checks.push({
    name: 'no_template_placeholders',
    ok: !placeholderMatch,
    detail: placeholderMatch
      ? `Found unfilled placeholder: "${placeholderMatch[0]}"`
      : 'No template placeholders detected',
    level: 'critical',
  })

  // 3. Greeting is not the generic "how can I help you" line.
  // Look only at the first 400 characters - that's where the greeting lives.
  const greetingZone = prompt.slice(0, 800)
  const generic = GENERIC_GREETING_RE.test(greetingZone) && !/this is/i.test(greetingZone)
  checks.push({
    name: 'specific_greeting',
    ok: !generic,
    detail: generic
      ? 'Greeting reads as generic ("how can I help you today?")'
      : 'Greeting looks specific to the business',
    level: 'warning',
  })

  // 4. Hours are referenced if we have them.
  if (ctx.business.hours && Object.keys(ctx.business.hours).length > 0) {
    const hoursMentioned = /\b(hours|open|close|mon|tue|wed|thu|fri|sat|sun|am|pm)\b/i.test(prompt)
    checks.push({
      name: 'hours_referenced',
      ok: hoursMentioned,
      detail: hoursMentioned
        ? 'Prompt references operating hours'
        : 'Business hours are known but the prompt never mentions them',
      level: 'warning',
    })
  }

  // 5. At least one offered service is named.
  if (ctx.services.offered.length > 0) {
    const namedAny = ctx.services.offered.some((s) =>
      lower.includes(s.toLowerCase().slice(0, Math.min(s.length, 20))),
    )
    checks.push({
      name: 'services_named',
      ok: namedAny,
      detail: namedAny
        ? 'At least one offered service is named in the prompt'
        : 'None of the offered services appear by name',
      level: 'critical',
    })
  }

  // 6. No fabricated 24/7 emergency claim unless source data hints at it.
  const claims247 = /24\/?7|24[-\s]hour/i.test(prompt)
  if (claims247) {
    const sourceMentions247 = ctx.sources.website?.pages.some((p) =>
      /24\/?7|24[-\s]hour|after[-\s]hours/i.test(p.text),
    ) || /emergency|after.hours/i.test(JSON.stringify(ctx.services.offered))
    checks.push({
      name: 'no_fabricated_24_7',
      ok: !!sourceMentions247,
      detail: sourceMentions247
        ? 'Prompt claims 24/7 service AND source data mentions it'
        : 'Prompt claims 24/7 service but no source data supports that',
      level: 'critical',
    })
  }

  // 7. Word count in a reasonable band (500-2000 per the doc; we lean slightly
  // looser since markdown-style formatting can inflate counts).
  const inBand = wordCount >= 400 && wordCount <= 2200
  checks.push({
    name: 'word_count',
    ok: inBand,
    detail: `${wordCount} words` + (inBand ? '' : wordCount < 400 ? ' (too thin)' : ' (too long)'),
    level: 'warning',
  })

  // 8. Has the structural sections we asked for.
  const hasGreeting = /\bgreeting\b/i.test(prompt) || /^"[^"]+"\s*$/m.test(prompt.slice(0, 800))
  const hasBooking = /\bbooking|appointment|schedul/i.test(prompt)
  const hasHandoff = /\bhandoff|hand[-\s]?off|transfer\b/i.test(prompt)
  const hasEdge = /\bedge case|objection|complaint/i.test(prompt)
  checks.push({
    name: 'has_required_sections',
    ok: hasGreeting && hasBooking && hasHandoff && hasEdge,
    detail: [
      hasGreeting ? null : 'no greeting section',
      hasBooking ? null : 'no booking flow',
      hasHandoff ? null : 'no handoff rule',
      hasEdge ? null : 'no edge cases',
    ].filter(Boolean).join(', ') || 'all required sections present',
    level: 'critical',
  })

  const passed = checks.every((c) => c.level !== 'critical' || c.ok)
  return { passed, word_count: wordCount, checks }
}
