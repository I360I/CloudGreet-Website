/**
 * Sales rep playbook content - the "need to knows" reps land in on day 1.
 *
 * Edit these strings (or split each into its own .md file later) to update
 * what reps see at /sales/playbook. No DB, no admin UI - this ships with
 * the codebase so a rep onboarding tomorrow has something to read while
 * the polished video version is still in production.
 *
 * Tone: written for experienced sellers. Substance over scripts - principles,
 * numbers, the logic behind the objection handling. Reps phrase it their own
 * way.
 */

export type PlaybookSection = {
  id: string
  title: string
  blurb: string
  body: string
}

export const PLAYBOOK_SECTIONS: PlaybookSection[] = [
  {
    id: 'product-in-60-seconds',
    title: 'Product in 60 seconds',
    blurb: 'What CloudGreet actually does, in language a contractor will get.',
    body: `**The pitch in one sentence**
CloudGreet is an AI receptionist that answers a contractor's missed calls 24/7, books jobs onto their calendar, and shows every call (transcript, recording, outcome) in their dashboard - so they stop losing $5K-$15K a month to voicemails.

**Why it works**
The average HVAC, plumbing, electrical, or roofing shop misses 30-50% of inbound calls (in the truck, on a roof, after hours, lunch break). Every missed call is a job a competitor books instead. A human receptionist costs $3-5K/mo. CloudGreet is $200-500/mo and never sleeps.

**What it does on a call**
1. Picks up on ring 1
2. Greets in the contractor's voice/style
3. Captures: name, phone, address, service type, urgency
4. Books on Cal.com / Google Calendar / their existing booking link
5. Logs the full call (transcript, recording, outcome) to the dashboard the second the call ends
6. Offers a callback if it can't answer something

**What it doesn't do**
Pretend to be human. Replace techs, dispatchers, or office managers. Quote prices unless the owner explicitly enables it.

**Who it's for**
Solo and small-shop service businesses, 1-15 employees. HVAC, plumbing, electrical, roofing, pest control, landscaping, painting, handyman, law firms, accounting, auto repair - anyone who lives or dies on inbound calls.`,
  },

  {
    id: 'pricing',
    title: 'Pricing',
    blurb: 'What to charge, where to flex, and the floor.',
    body: `**Standard offer**
- Setup: $500 one-time
- Monthly: $300

**Flex up**
- Multiple locations, multi-line phone tree, custom integrations beyond Cal.com → $400-500/mo
- Custom voice clone or complex script → setup $750-1000

**Flex down**
- Solo operator, tight cash, willing to do a video testimonial → $200/mo, keep setup
- Never drop setup below $250. If they won't pay setup, they won't take onboarding seriously.

**Hard floor**
- $50/mo platform minimum.

**Comp (50/50 split)**
- 50% of every dollar paid for the first 3 months past your last close
- Months 3-6 past last close → 25% trailing
- 6+ months past last close → 0%, client transfers
- One new close resets the trailing clock back to 50% on every active client

**Worked example**
$300/mo + $500 setup deal:
- $250 immediately (50% of setup)
- $150/mo recurring while you stay active
- Year 1 per close: ~$2,050 if you keep closing`,
  },

  {
    id: 'discovery-questions',
    title: 'Discovery',
    blurb: 'Seven things to learn in five minutes.',
    body: `Phrase it your way. The point is the answers, not the questions.

**1. Missed calls per week**
You're calibrating. Honest answers land 5-20. "None" usually means they have a receptionist or they're lying.

**2. What happens when one comes in**
Voicemail nobody checks, callback hours later, prospect calls competitor. Their own answer becomes the pitch.

**3. Average job value**
Reference numbers: HVAC $300-800 service / $5-15K install. Plumbing $200-600. Roofing $8-25K. Pull this out for the math later.

**4. Who answers when they can't**
Spouse, voicemail, $300+/mo answering service, or nobody. CloudGreet beats every option except nobody, and nobody is the option that's costing them money.

**5. Booking system**
Cal.com / Google Calendar / Calendly / paper notebook. The agent books into whatever they have - even with no system, the booking lands in their dashboard.

**6. Hours**
Sets up the after-hours angle.

**7. Soft yes / hard no**
Last question is the close-on-discovery: would they want to see it work. Soft yes → demo. Hard no → handle the objection or move on.`,
  },

  {
    id: 'objections',
    title: 'Objections',
    blurb: 'The frame to lead with, plus the ten you\'ll hear.',
    body: `**Lead frame: safety net, not replacement**
Today, missed calls go to voicemail and the prospect calls a competitor. 100% loss. With CloudGreet, maybe one in fifty calls the AI fumbles - same outcome on the bad ones. But on the other 49, you booked a job you would've lost. Downside identical, upside huge. They're not betting on perfect AI; they're betting "imperfect AI" beats "voicemail."

This handles 70% of objections before they come up. Bring it up early.

---

**1. AI sounds robotic / customers will hate it**
Two answers: voice cloning makes it sound like a person, not Siri. Send a recording of one handling a real call - they usually can't pick out the AI lines. Plus the safety-net frame: even if some hate it, no worse than voicemail.

**2. Already have an answering service**
What's it cost? (Usually $300-500.) Does it book jobs onto the calendar or just take messages? CloudGreet does both for less, with calls landing in the dashboard the second they end vs hours later.

**3. Rather hire a receptionist**
$35-50K/yr fully loaded plus benefits and PTO vs $300/mo, working 24/7. We can pause the subscription the month they hire someone.

**4. What if it gets something wrong**
Safety-net frame is the answer. Plus: every call transcribed in the dashboard within 30 seconds so they can call back if anything's off; agent never invents prices or commits them to anything outside the script.

**5. Not technical**
Eight-question form, we build the agent, they approve, we go live. ~3 days end to end.

**6. Free trial**
We do paid pilots, not free trials - free trials get ignored. The bar is one booked job in 30 days, almost nobody fails to clear it. Don't lead with the refund as a sales tool (see Closing); use it only to save a deal that's about to walk.

**7. How is this different from [competitor]**
Real-time call log with transcripts and recordings (most send a vague summary email hours later), and the agent learns the business from a 10-minute form, not a 2-hour onboarding call. Cheaper than the named competitors.

**8. Only 2 calls a day, overkill**
If they get 2 a day and miss one, that's one missed job. If a job pays for the month, the math works.

**9. "Send me info, I'll think about it"**
Counter with a recording + a hard follow-up time. No info-send without a calendar slot.

**10. "Need to talk to my partner/spouse/coach"**
Send the demo so the third party hears it directly. Schedule the follow-up before hanging up.`,
  },

  {
    id: 'scripts',
    title: 'Cold-call openers',
    blurb: 'Three angles - hard, soft, educational.',
    body: `Phrase any of these your way. The angle is the point.

**Hard opener** - confident, fast
Lead with the problem ($5-10K/mo lost to missed calls), the fix ($300/mo), and ask for 60 seconds. If they say no, fall back: are they missing calls or fully staffed up? Either re-tees the pitch or kills it cleanly.

**Soft opener** - feeler
"Bad time?" lowers their guard, then run two discovery questions (missed calls/week, what happens after hours). Decide whether to pitch or hang up after 90 seconds.

**Educational opener** - skeptical or technical prospect
Frame it as research on how local [trade] companies handle after-hours calls. Walk them through discovery. Then pivot: you work with a tool that books those calls, here's a 2-minute recording, want a follow-up.

**Voicemail**
Always leave one (2x return rate). Cover: who you are, the missed-call angle, that you work with local references in their trade, and the callback number. Keep it under 20 seconds.

**Text follow-up (30 sec after voicemail)**
Reference the vm, drop a recording link, propose two specific times. Keep it short.`,
  },

  {
    id: 'demo-flow',
    title: 'Demo flow',
    blurb: 'How to run the 15 minutes without losing them.',
    body: `**Setup (1 min)**
Set the rules: they can interrupt, and by the end you both want a yes/no - no two-month chases.

**Live call (4 min)**
Dial the demo number on speaker. Walk through booking a fake job using their actual business name. Don't narrate - let it sound natural.

When the call ends, pull up the dashboard. Transcript, recording, caller info, booked appointment - all in one place. This is where most prospects close themselves.

**The "what if" tour (4 min)**
Three things every prospect worries about:
- Doesn't know the answer → show edge-case handling
- Screws up pricing → show how it never quotes unless explicitly enabled
- Customer wants a human → show the callback request flow

**The numbers (3 min)**
Calculator on screen. Plug in their discovery numbers (missed calls/week, job value, close rate). Show the monthly $ they're losing. Subtract $300. The delta is their no-brainer number.

**The ask (3 min)**
Two paths: close this week, or you stop following up. Force the decision.

If they close: send the payment link on the call. Stay until they click.
If they need time: hard follow-up before you hang up. Two specific times, pick one.

**Demo killers**
- Talking through the live call
- Showing every feature (3 not 30)
- Pricing before the value math is on screen
- Letting "I'll think about it" land without a hard date`,
  },

  {
    id: 'objection-economics',
    title: 'The math',
    blurb: 'Five numbers that close deals.',
    body: `**1. Missed-call rate: 30-50%**
Industry average for service trades. A contractor who pushes back doesn't actually know how many they miss - that's its own pitch.

**2. Answered-call conversion: ~30%**
Roughly 1 in 3 answered inbounds books. Use this for the math.

**3. Average job values**
- HVAC service: $300-500 / install: $5,000-15,000
- Plumbing call: $200-600 / big job: $1,500-8,000
- Electrical service: $200-500 / panel upgrade: $1,500-4,000
- Roofing repair: $400-1,500 / replacement: $8,000-25,000

**4. CloudGreet cost: $300/mo + $500 setup**
Anchor here.

**5. The close math**
Walk them through it: missed calls × 30% × avg job value = monthly $ lost. Subtract $300. The delta is their loss vs. cost.

**Worked example (HVAC)**
- 12 missed/wk × 4 = 48/mo
- 30% would have booked = 14 missed jobs
- $400 ticket = $5,600/mo lost
- CloudGreet $300/mo → $5,300/mo recovered, 17x ROI month 1

You don't need to be right. You need to make them do the math themselves.`,
  },

  {
    id: 'closing',
    title: 'Closing',
    blurb: 'Five techniques in priority order.',
    body: `**1. Assumptive close (try first)**
Confirm the email and send the payment link. No decision moment. Closes most soft yeses.

**2. Either/or close**
Frame the choice as which plan, not whether to buy. ($300 standard vs $400 multi-line.)

**3. Risk-reversal (last resort - read carefully)**
30-day refund: if CloudGreet books **zero** jobs in 30 days, full refund. Bar is one booking, not "they're happy."

Do NOT lead with this:
- Signals you don't believe in the product
- Anchors them on "money back" instead of "books me jobs"
- Almost never used because almost every account books in week one

Use it only when every other close has failed and they're about to walk. Keep it tight: one booking is the bar, no account has ever missed it.

**4. Urgency (only when true)**
Setup fee locked through end of month, going up after. Don't lie - if you say it, set a calendar reminder to actually raise it.

**5. Kill-or-close (final)**
Force the binary: this is a fit and we go this week, or it's not and you stop following up. Often gets the yes because the prospect was waiting for permission to decide.

**Send sequence after a yes**
1. Click "Send payment link" in the lead detail
2. Auto-copies to clipboard - paste in live conversation
3. Stay on the line until they confirm payment
4. Confirm date/time for customization call
5. Tell them to expect an email from CloudGreet within 1 hour
6. Update lead status to **proposal_sent** if not already

**After the close**
Don't disappear. Within 24 hours, text them: welcome, customization form is in their inbox, knock it out today and they're live by [day]. Drops churn by ~20%.`,
  },

  {
    id: 'edge-cases',
    title: 'Edge cases & how we handle them',
    blurb: 'Real questions that come up mid-call. Know the answer, don\'t guess.',
    body: `Default rule: if you don't know the answer, say so. "Good question - I'd have to check and get back with you." Don't invent specifics, don't promise timelines, don't make up features.

**Multi-location / multi-business owner**
Supported. One agent per business, configurable. They pay per business at the standard rate. Bundle pricing case-by-case - check before quoting a discount.

**Existing phone tree / IVR ("press 1 for service")**
Two paths: replace the IVR entirely (simpler, what we recommend) or sit behind their existing tree as one branch. Both work. Replacing it usually picks up more calls because IVRs themselves cause hangups.

**Non-English callers**
Agent can handle any language. Configurable single-language or bilingual (greets in English, switches based on caller). It's a config choice during onboarding, not on by default.

**They use ServiceTitan / Housecall Pro / Jobber / FieldEdge**
Today the agent books to Cal.com or Google Calendar and the contractor or office manager copies into the CRM. Direct CRM integrations aren't shipped - don't promise a timeline. Two-step works fine for most shops.

**They want to keep their current phone number (porting)**
We forward the existing number to CloudGreet. Published number stays the same; customers never notice. No port required for go-live. If they want to fully port to Telnyx later, that's possible but timing/process - check before quoting.

**They want the AI to quote prices**
Off by default. Owner can enable "give a price range" using ranges they provide. The agent never invents numbers. Hard quotes are not a feature we recommend turning on - it's the most common way the AI fumbles.

**After-hours emergency ("burst pipe at 2am")**
Configurable per business. Common patterns: book an emergency slot + notify the on-call tech, or offer a callback. Specific behavior is set during the customization call - don't promise a specific flow on a sales call.

**Multi-tech dispatch (which tech gets the job?)**
Agent doesn't pick the tech - it books the slot, dispatcher assigns. Round-robin or skills-based routing is the contractor's dispatch process, not ours. Set this expectation early.

**Recurring customers ("hey it's John, you know my address")**
Supported. When a known number calls back, the agent recognizes them, greets them by name, and asks if it's about the same kind of work as last time - based on the most recent extracted name and service from past calls. Address is re-asked on purpose (job sites and addresses change).

**Calendar already full / no slots available**
Agent offers the next available slot or takes a callback request. Specific overflow behavior (waitlist, etc.) is configurable during onboarding.

**Spam / robocalls**
Agent doesn't book without a name and callback number, which kills most spam attempts. Anything more specific (carrier-level filtering, ML scoring) - check before claiming.

**Compliance (TCPA, recording disclosure)**
Agent opens with a recording disclosure. For outbound texts (booking notifications), consent is captured in the customization form. If a contractor wants a deep dive on TCPA specifics, route to anthony@cloudgreet.com.

**"What if your service goes down?"**
Calls fall through to whatever they had before (voicemail or their cell). They're never *worse* off. Don't quote uptime numbers - we don't publish an SLA yet.

**They want to listen live / barge in**
Not a shipped feature. Today: every call is recorded and in the dashboard shortly after it ends. They can listen back, not interrupt mid-call.

**They want a custom voicemail greeting / voice cloning**
Voice customization is possible but specifics (sample length, turnaround, cost) - check before quoting. Don't promise 24 hours unless someone confirms it.

**"My customers are old, they hate AI"**
Two angles: the AI sounds like a person (send a recording), and the agent can be configured to offer "or I can have [owner] call you back" as an opt-out.

**Industries we don't take (healthcare, anything HIPAA)**
We don't onboard medical practices, dental, medspas, therapy, or any healthcare-adjacent business. HIPAA compliance is out of scope. If a prospect is in that bucket, decline politely - "we're not set up for healthcare yet" - and don't book a demo.

**Industries we're newer to (legal, finance)**
We work with them but conservatively - the agent books and routes, doesn't give legal or financial advice. Frame it as a feature.

**Refund situation (post-sale)**
Refund policy is the 30-day, zero-bookings bar from Closing. Route any refund request to anthony@cloudgreet.com - reviewed and honored on my end, no expense to the rep (your commission isn't clawed back). Don't promise refunds you can't authorize, but you also don't need to fight one off to protect your earnings.`,
  },
]
