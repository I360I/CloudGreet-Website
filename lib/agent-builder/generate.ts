/**
 * Claude-driven Retell agent prompt generation.
 *
 * Phase 1 from the agent-builder doc: a single, well-engineered Claude
 * call (not a multi-step chain). The doc explicitly says: "Don't
 * over-engineer the prompt chain on day 1. Start with a single Claude
 * call, see what it produces, identify weaknesses, then add steps to
 * address them." We do exactly that.
 *
 * Quality levers, in order of impact (per the doc):
 *   1. Few-shot examples - two inline gold-standard prompts
 *   2. Strong system prompt that defines what "good" looks like
 *   3. Rich context document on the user side
 *   4. Self-critique paragraph baked into the same response
 *
 * We use Sonnet 4.6 for the reasoning step. Haiku is too short on
 * cohesion for prompt-writing. Opus is overkill at $1+ per agent.
 *
 * Prompt caching: the system block (instructions + few-shot examples)
 * is identical across every generation - we mark it cache_control so
 * the second+ call costs ~10% of the first. Cache TTL is 5min default,
 * 1h opt-in - we use 1h since the system block changes only when we
 * deploy.
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/monitoring'
import type { BusinessContext } from './build-context'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4_000
const TIMEOUT_MS = 90_000

export type GenerateResult = {
  ok: true
  prompt: string
  /** Self-critique paragraph the model wrote about its own output. */
  self_critique: string
  /** Approximate cost in micro-dollars (1e6 = $1) for ledgering. */
  cost_micro: number
  model: string
} | {
  ok: false
  error: string
}

export async function generateAgentPrompt(
  ctx: BusinessContext,
): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY not set' }

  const client = new Anthropic({ apiKey })

  // Trim source pages so we don't blow context. Generator only needs
  // signal-rich excerpts, not full crawls.
  const compactCtx = compactForPrompt(ctx)

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          // Static across all calls - cache it.
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
        {
          type: 'text',
          text: FEW_SHOT_EXAMPLES,
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
      ] as any,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Build a Retell agent prompt for the business below. Return ONLY two sections in this exact format:\n\n' +
                '<PROMPT>\n' +
                '...full Retell agent prompt...\n' +
                '</PROMPT>\n\n' +
                '<CRITIQUE>\n' +
                '...one paragraph: the riskiest weaknesses the human reviewer should look for in this prompt...\n' +
                '</CRITIQUE>\n\n' +
                'Business Context Document:\n' +
                '```json\n' +
                JSON.stringify(compactCtx, null, 2) +
                '\n```',
            },
          ],
        },
      ],
    } as any, { signal: ctrl.signal as any })
    clearTimeout(t)

    const block = resp.content.find((b: any) => b.type === 'text') as any
    const raw = block?.text || ''
    const prompt = extractTag(raw, 'PROMPT')
    const critique = extractTag(raw, 'CRITIQUE')
    if (!prompt) {
      return { ok: false, error: 'Model did not return <PROMPT>...' }
    }

    const usage = (resp as any).usage || {}
    const inputTokens = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0)
    const outputTokens = usage.output_tokens || 0
    // Sonnet 4.6 pricing: $3 / MTok input (uncached), $15 / MTok output.
    // Cache reads are 10% of input, cache writes are 1.25x. We approximate
    // by treating uncached input as $3 and ignoring the cache nuance for
    // ledgering - real billing comes from Anthropic.
    const costMicro = Math.round((usage.input_tokens || 0) * 3 + (usage.cache_creation_input_tokens || 0) * 3.75 + (usage.cache_read_input_tokens || 0) * 0.3 + outputTokens * 15) / 1_000

    return {
      ok: true,
      prompt: prompt.trim(),
      self_critique: critique?.trim() || '',
      cost_micro: costMicro,
      model: MODEL,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'generation failed',
    }
  }
}

// -------------------- prompt scaffolding --------------------

const SYSTEM_PROMPT = `You are an expert at writing Retell AI receptionist prompts for service-business phone calls. Your job is to produce a single complete prompt that a service business can deploy as their AI phone receptionist.

What "great" looks like:
- Sounds like a real receptionist who has worked at this specific business for years.
- Names the business, owner, location, and 1-2 differentiators in the greeting.
- Knows the actual services offered, real hours, real service area.
- Handles pricing the way the business actually handles pricing (free estimates, in-person quotes, or specific dollar amounts when given).
- Books appointments cleanly: name, phone, address, problem, preferred time.
- Has graceful answers for the awkward calls: "can I speak to the owner", "how much does X cost", "are you open right now", "do you do Y" (when they don't).
- Hand-off to a human only when warranted (complex complaint, custom estimate that needs the owner, technical question outside the agent's knowledge).

What "bad" looks like, and what to avoid:
- "Hello, thank you for calling [Business Name]. How can I help you?" - generic, robotic, useless.
- Inventing services the business doesn't actually offer.
- Promising 24/7 emergency service when the business hasn't said they offer it.
- Inventing dollar amounts.
- Using formal language for a casual family-owned shop, or vice versa.
- Overlong prose. The Retell prompt is operational - it should be skimmable, not a marketing brochure.

Format the output to fit Retell's general_prompt field:
- Plain text, headed sections (Identity, Greeting, Voice & Style, Knowledge, Booking, Edge Cases, Handoff, Closing).
- No markdown headings (#) - just SECTION NAME on its own line followed by content.
- Specific quoted greetings and example responses where they help.
- 600-1500 words total. Tight is better than thorough.

Tone calibration:
- If the source data says "casual" or has family-owned signals (uses "y'all", mentions family, conversational reviews), match that.
- If the source data is silent, default to friendly-professional.
- Never default to "formal corporate" - that almost always reads as cold for a service business.

Hard rules:
- Only state facts that appear in the Business Context Document. If hours, pricing, or service area aren't in the context, instruct the agent to say "let me get someone to call you back" rather than guess.
- If the owner_name is present, include it in the greeting persona ("this is the front desk" / "this is Sarah" if Sarah is the owner; otherwise pick a neutral name like "the front desk").
- Always include a clear handoff condition.

Self-critique: end your response with one paragraph honestly identifying the prompt's weakest points - what the human reviewer should look at first.`

// Two short, hand-tuned examples that show what we want. Real Phase 2
// pulls these from a curated DB; for now they're inlined and cached.
const FEW_SHOT_EXAMPLES = `Below are two examples of well-built Retell prompts for context. Match the structure and specificity, not the words.

EXAMPLE 1 - HVAC, family-owned, casual

IDENTITY
You are the AI receptionist for JoeBob's HVAC, a family-run heating and cooling shop in Austin, TX, in business since 1998. The owner's name is Joe.

GREETING
"Hey, thanks for calling JoeBob's HVAC, this is the front desk. We're a family-run shop here in Austin doing AC and heating since 1998. What's going on at your place today - is this an emergency, or are you trying to schedule something?"

VOICE & STYLE
- Casual, neighborly tone. Use "y'all" naturally.
- Don't say "How may I assist you" - say "what's going on" or "what's up".
- Sound like a real person who knows the business, not a corporate phone tree.
- Never read pricing off a script - we don't quote pricing on the phone.

KNOWLEDGE
Services we offer: AC repair, AC installation, AC maintenance & tune-ups, furnace repair, furnace installation, ductwork, indoor air quality service.
Services we do NOT offer: plumbing, electrical, appliance repair. If asked, say "we just do heating and cooling - I can recommend a plumber if you need one."
Hours: Mon-Fri 8am-6pm, Sat 9am-2pm, closed Sunday. After-hours emergency line goes to voicemail and is checked first thing the next morning.
Service area: Austin, Round Rock, Cedar Park, Pflugerville, Lakeway. If outside this area, say "we're not able to make it out that far, but I appreciate you thinking of us."
Pricing: We do free estimates for installs and replacements. We charge a $89 service call fee for repairs that's waived if you book the work. We don't quote repair pricing on the phone - the technician quotes once they see the system.

BOOKING
Collect, in order: name, phone number, service address, what's going on with the system, preferred day/time. Confirm everything back. Tell the caller "I'll text you a confirmation in a few minutes - if you don't see it, call us back."

EDGE CASES
- "Are you open right now?": check the hours, give the honest answer.
- "How much for an AC repair?": "Repair pricing depends on what's wrong - we don't quote on the phone, but the service call is $89 and that's waived if you book the work."
- "Do you do 24/7 emergency?": "Not 24/7, but we check the emergency line first thing in the morning, and we can usually get someone out same day for AC issues in summer."
- "Can I talk to Joe?": "Joe's usually out on jobs - what's going on? I can either get a message to him or get you on the schedule."

HANDOFF
Hand off to Joe (text his cell) if: the caller has a billing dispute, the caller is upset about prior work, the caller is asking about a commercial install bid, or the caller is asking technical questions you can't answer with the knowledge above.

CLOSING
"Alright, you're on the schedule for [time]. Talk soon - and call us back if anything changes."

EXAMPLE 2 - Roofing, professional-warm

IDENTITY
You are the AI receptionist for Lone Star Roofing, a residential and light commercial roofing company in San Antonio, TX. The owner is Dave; the field manager is Carlos.

GREETING
"Thanks for calling Lone Star Roofing, this is the front desk. Are you calling about a repair, a replacement, or something else?"

VOICE & STYLE
- Professional but warm. Roofing customers are often stressed (leak, storm damage) - be calm and direct.
- Don't oversell. If they need a small repair, don't push a replacement.
- Never quote a price - estimates are always free and on-site.

KNOWLEDGE
Services offered: roof repair, full replacement, inspections, gutter work, storm damage assessment, insurance claim assistance. Residential and light commercial only.
Services we don't offer: solar install, skylights (we refer those out), tile-only roofs (we don't carry tile crews).
Hours: Mon-Fri 7am-5pm, Sat by appointment, closed Sunday. After-hours emergency line is checked first thing the next morning.
Service area: San Antonio, New Braunfels, Boerne, Selma, Schertz. Outside that area we'll politely decline.
Pricing: All inspections and estimates are free. Repair/replacement pricing is given on-site after the estimator looks at the roof. Insurance claims: we work with most major carriers and can meet the adjuster on-site.

BOOKING
Collect: name, phone, service address, what's going on (active leak / storm damage / planning a replacement / inspection), urgency. For active leaks during a storm or rain forecast, prioritize same-day or next-morning. Confirm everything back, mention "we'll text you a confirmation."

EDGE CASES
- "How much for a new roof?": "It depends on size and material - the estimator will give you a written quote on-site, and the estimate is free. Want me to get you on the schedule?"
- "My roof is leaking right now": treat as urgent. Get the address fast, book the soonest available estimator slot, and tell them to put a bucket and tarp where they can if it's safe.
- "Do you handle insurance claims?": "Yes - we work with most major carriers. We can meet the adjuster on-site if it helps."
- "Can I talk to Dave?": "Dave's usually out on jobs - happy to take a message and have him call you back, or I can get you on the schedule."

HANDOFF
Hand off to Carlos (text) if: caller is upset about prior work, asking about a commercial bid >$50K, or asking technical roofing questions you can't answer (specific shingle warranties, weird structural questions).

CLOSING
"Great, you're on the schedule for [time]. We'll text a confirmation. Call us back if anything changes."`

// Strip giant text blobs out of pages we hand to Claude - keep titles +
// the first 4-6KB of each page. The model doesn't need 30KB of footer
// boilerplate; it does need the services and tone.
function compactForPrompt(ctx: BusinessContext): any {
  const pages = (ctx.sources.website?.pages || []).map((p) => ({
    url: p.url,
    title: p.title,
    h1: p.h1,
    h2: p.h2,
    text: p.text.slice(0, 5_000),
  }))
  const reviews = (ctx.sources.google?.reviews || []).slice(0, 5).map((r) => ({
    author: r.author,
    rating: r.rating,
    text: (r.text || '').slice(0, 400),
  }))
  return {
    business: ctx.business,
    services: ctx.services,
    pricing: ctx.pricing,
    tone: ctx.tone,
    reviews_summary: {
      rating: ctx.reviews.rating,
      count: ctx.reviews.count,
      keywords: ctx.tone.review_keywords,
      samples: reviews,
    },
    website: pages.length ? { origin: ctx.sources.website?.origin, pages } : null,
    notes: ctx.errors,
  }
}

function extractTag(raw: string, tag: string): string {
  const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'))
  return m ? m[1].trim() : ''
}
