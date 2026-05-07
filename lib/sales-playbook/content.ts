/**
 * Sales rep playbook content - the "need to knows" reps land in on day 1.
 *
 * Edit these strings (or split each into its own .md file later) to update
 * what reps see at /sales/playbook. No DB, no admin UI - this ships with
 * the codebase so a rep onboarding tomorrow has something to read while
 * the polished video version is still in production.
 *
 * Tone: written for someone who has sold SaaS before but is new to AI
 * receptionists for service businesses. Direct, no fluff. Numbers are
 * defaults the rep can flex within.
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
CloudGreet is an AI receptionist that answers a contractor's missed calls 24/7, books jobs straight onto their calendar, and shows every call (transcript, recording, outcome) in their dashboard - so they stop losing $5K-$15K a month to voicemails.

**Why it works**
The average HVAC, plumbing, electrical, or roofing shop misses 30-50% of inbound calls (in the truck, on a roof, after hours, lunch break). Every missed call is a job a competitor books instead. A human receptionist costs $3-5K/mo. CloudGreet is $200-500/mo and never sleeps.

**What it actually does on a call**
1. Picks up on ring 1
2. Greets caller in the contractor's voice/style
3. Captures: name, phone, address, service type, urgency
4. Books an appointment on Cal.com / Google Calendar / their existing booking link
5. Logs the full call (transcript, recording, outcome) to the contractor's dashboard the second the call ends
6. If it can't answer something, it offers a callback

**What it doesn't do**
It doesn't pretend to be human. It doesn't replace technicians, dispatchers, or office managers. It doesn't quote prices unless the owner explicitly tells it to.

**Who it's for**
Solo and small-shop service businesses with 1-15 employees. HVAC, plumbing, electrical, roofing, pest control, landscaping, painting, handyman, law firms (yes), small medical/dental, anyone who lives or dies on inbound calls.`,
  },

  {
    id: 'pricing',
    title: 'Pricing',
    blurb: 'What to charge, where to flex, and the floor.',
    body: `**Standard pricing (default offer)**
- **Setup fee:** $500 one-time
- **Monthly:** $300/mo

**When to flex up**
- Multiple locations, multi-line phone tree, custom integrations beyond Cal.com → $400-500/mo
- Setup fee can go to $750-1000 if they want a custom voice clone or a complex script

**When to flex down**
- Tiny solo operator, struggling cash flow, willing to do a video testimonial → drop monthly to $200, keep setup
- Never drop setup below $250. If they won't pay setup, they won't take onboarding seriously

**Hard floor (Stripe minimum)**
- $50/mo absolute minimum on the platform. Below that the math doesn't work for us.

**The 50/50 split (your earnings)**
- You earn 50% of every dollar paid for the first 3 months past your last close
- Months 3-6 past last close → 25% trailing
- 6+ months past last close → 0%, client transfers
- One new close resets the trailing clock back to 50% on every active client

**Translation**
On a $300/mo + $500 setup deal you make:
- $250 immediately (50% of setup)
- $150/mo recurring while you stay active
- Year 1 total per close: ~$2,050 if you keep closing`,
  },

  {
    id: 'discovery-questions',
    title: 'Discovery questions',
    blurb: 'The 7 questions that qualify a contractor in 5 minutes.',
    body: `Ask these in order. If they answer the first three honestly, you're 80% closed.

**1. "How many calls would you say you miss in a typical week?"**
The honest ones say 5-20. If they say "none" they're either lying or they have a receptionist - find out which.

**2. "When you miss a call, what happens?"**
You're listening for: voicemail nobody checks, callback two hours later, prospect calls competitor. Their own answer is your pitch.

**3. "What's a job worth to you on average?"**
HVAC: $300-800 service, $5-15K install. Plumbing: $200-600. Roofing: $8-25K. Now do the math out loud: "So if you're missing 10 calls a week and one in three would've booked, that's $X/mo walking out the door."

**4. "Who answers the phone when you can't?"**
Spouse, voicemail, answering service ($300+/mo), or nobody. CloudGreet is cheaper than every option except nobody, and nobody is the option that's costing them money.

**5. "Do you use Cal.com, Google Calendar, Calendly, or anything for booking?"**
You need to know what the agent will book into. If they say "a paper notebook" - that's fine, every booking shows up in their dashboard with the caller's name, phone, and requested time so they can copy it down.

**6. "What time do you typically start and stop taking calls?"**
Sets up the after-hours pitch. "So calls coming in after 6pm just go to voicemail?"

**7. "If I could show you a way to capture every one of those missed calls for less than the cost of one job a month, would you want to see it work?"**
This is the ask. Soft yes → demo. Hard no → ask why and either handle the objection or move on.`,
  },

  {
    id: 'objections',
    title: 'Objections',
    blurb: 'The strongest reframe + the 10 things you\'ll hear.',
    body: `**THE FRAME TO LEAD WITH (use this every chance you get)**
Think of CloudGreet as a safety net, not a replacement. Right now, your missed calls go to voicemail and the prospect calls your competitor. That's a 100% loss. With CloudGreet, maybe one in fifty calls the AI fumbles - the prospect hangs up annoyed and calls your competitor anyway. Same outcome on the bad ones. But on the other 49? You just booked a job you would've lost. The downside is identical. The upside is huge. You're not betting on the AI being perfect; you're betting that "imperfect AI" beats "voicemail."

This reframe handles 70% of objections before they come up. Use it early.

---

**1. "AI sounds robotic / customers will hate it."**
Fair concern. Two answers: (1) we use Retell + voice cloning so it sounds like a real person, not Siri. (2) I'll send you a recording of one handling a real call - you tell me which lines are AI. I'm right 9 times out of 10 they can't tell. And remember the safety net frame: even if some callers do hate it, that's no worse than voicemail - which they also hate.

**2. "I already have an answering service."**
What's it cost you? (Usually $300-500/mo.) Does it book jobs onto your calendar or just take messages? CloudGreet does both for less - and every call lands in your dashboard the second it ends, not 4 hours later.

**3. "I'd rather just hire a receptionist."**
Hiring's $35-50K/yr fully loaded plus benefits and PTO. CloudGreet is $300/mo and works 24/7 including Saturdays at 9pm when your competitor is asleep. We can pause your subscription the month you hire someone.

**4. "What if it gets something wrong?"**
The safety-net frame is the answer here. Right now your missed calls go nowhere - that's a 100% loss. Even if the AI flubs one in fifty, the worst case is that one prospect goes to your competitor, which is exactly what happens today on every miss. The other 49 are jobs you would've lost. Plus: every call is transcribed in your dashboard within 30 seconds so you can call back if anything's off, and the agent never invents prices or commits you to anything outside the script.

**5. "I'm not technical."**
You don't need to be. We do the entire setup. You answer 8 questions about your business in a form, we build the agent, you approve it, we go live. ~3 days end to end.

**6. "Can I try it for free?"**
We do a paid pilot, not a free trial. Reason: free trials get ignored. The first month is fully refundable if it doesn't book a single job. That's the same risk profile as free with much better adoption.

**7. "How is this different from [competitor]?"**
Two things: a real-time call log in your dashboard with every transcript and recording (most just send a vague summary email hours later), and the agent learns your business from a 10-minute form, not a 2-hour onboarding call. We're cheaper than the named competitors too.

**8. "I get like 2 calls a day, this is overkill."**
If you get 2 calls a day and miss one, that's one missed job. What's a job worth? If it pays for the month, the math works.

**9. "Send me some info and I'll think about it."**
The kiss of death. Counter: "Happy to. Quick question first - if I send you a 2-minute recording of CloudGreet booking a job on your behalf, can we get back on a 15-minute call Thursday to either close it or kill it?"

**10. "Let me talk to my [partner / spouse / business coach]."**
"Of course. While you do, can I send the link so they can hear the demo too? It's easier than you describing it." Then schedule the follow-up before you hang up.`,
  },

  {
    id: 'scripts',
    title: 'Cold-call scripts',
    blurb: 'Three openers - hard, soft, educational. Pick by mood.',
    body: `**THE HARD OPENER (use when you're confident)**
"Hey [name], it's [your name] with CloudGreet. Quick reason for the call - I work with HVAC contractors in [their city] who are losing $5-10K a month to missed calls. I built something that fixes it for $300 a month. Worth 60 seconds to see if it'd work for you?"

If yes → run discovery.
If no → "Got it - last question, are you missing calls or are you fully staffed up?" Their answer either tees up the pitch again or kills it cleanly.

**THE SOFT OPENER (use when you want to feel out the situation)**
"Hey [name], [your name] from CloudGreet - is this a bad time? ... Quick context: I help service businesses like yours stop losing customers to voicemail. Two questions and I'm out of your hair: how many calls do you miss a week, and what happens when one comes in after hours?"

This puts them in control and you learn enough in 90 seconds to decide whether to pitch or hang up.

**THE EDUCATIONAL OPENER (use when they're skeptical or technical)**
"Hey [name], not a sales call - I'm doing some research on how [HVAC/plumbing/etc] companies in [city] handle after-hours calls. Got 90 seconds for two questions?"

Walk them through the same discovery. Then: "I appreciate it. The reason I asked: I work with a tool that books those after-hours calls automatically. Here's a 2-minute recording of one in action. Worth a 15-minute follow-up if it does what you need?"

**Voicemail script (always leave one - 2x return rate vs no message)**
"Hey [name], [your name] with CloudGreet. Calling about your missed-call problem - we work with [3 local references in their trade if you have them] and have something that's saving them about $8K a month. Number's [your number]. Worth 5 minutes when you've got a second."

**Text follow-up (send 30 seconds after voicemail)**
"Hey [name] - just left a vm. Recording of CloudGreet booking a real HVAC job: [link]. Worth a 5-min call? I'm free [day] [time] or [day] [time]. - [your name]"`,
  },

  {
    id: 'demo-flow',
    title: 'Demo flow',
    blurb: 'How to run the 15-minute demo without losing them.',
    body: `**Setup (1 min)**
"Before I show you, two things. One: you can interrupt me anytime, this isn't a presentation. Two: by the end of this 15 minutes I want to know if it's a fit or not - I'm not chasing you for two months."

**Live call (4 min)**
Dial the demo number on speaker. Let it answer. Walk through booking a fake job using their actual business name. Don't narrate - let it sound natural.

When the call ends, pull up the dashboard - they'll see the transcript, recording, caller info, and the booked appointment all in one place. This is the moment most prospects close themselves.

**The "what if" tour (4 min)**
Cover the three things every prospect worries about:
- "What if it doesn't know the answer?" → show edge-case handling
- "What if it screws up my pricing?" → show how it never quotes unless the owner explicitly enables it
- "What if my customers want a human?" → show the callback request flow

**The numbers (3 min)**
Pull up a calculator on screen. Plug in their numbers from discovery: missed calls/week, average job value, close rate. Show the monthly $ they're losing. Subtract $300 (CloudGreet cost). The delta is their "I'd be an idiot not to do this" number.

**The ask (3 min)**
"Two ways we can go from here. (1) I send you the link, you get on the phone with our team this week and we have you live by [day]. (2) You think about it and we lose touch. Which one?"

If 1: send the payment link on the call. Don't hang up until they've clicked.
If 2: schedule the follow-up before you hang up. "Thursday 2pm or Friday 10am - which works?"

**Things that kill demos**
- Talking through the live call (let it speak for itself)
- Showing every feature (show 3, not 30)
- Discussing pricing before the value math is on screen
- Letting them say "I'll think about it" without giving you a hard date`,
  },

  {
    id: 'objection-economics',
    title: 'The math you should memorize',
    blurb: 'Five numbers that close deals.',
    body: `**Memorize these. Use them in every call.**

**1. Missed-call rate: 30-50%**
The industry average for service trades. A contractor who pushes back on this number doesn't actually know how many they miss - that's its own pitch.

**2. Conversion rate on answered calls: ~30%**
Roughly 1 in 3 answered inbound calls becomes a booked job. Use this for the math.

**3. Average job values**
- HVAC service call: $300-500
- HVAC install: $5,000-15,000
- Plumbing call: $200-600
- Plumbing big job (water heater, repipe): $1,500-8,000
- Electrical service: $200-500
- Electrical big job (panel upgrade): $1,500-4,000
- Roofing repair: $400-1,500
- Roofing replacement: $8,000-25,000

**4. CloudGreet cost: $300/mo + $500 setup**
Anchor here.

**5. The close-the-deal sentence**
"You're missing about [missed calls/week] calls a week. One in three would book. Average job is $[their number]. That's $[do the math out loud] a month walking out the door. CloudGreet costs $300. So you're choosing between losing $X or paying $300 to keep it. Which one feels better?"

**Worked example for HVAC**
- 12 missed calls/week × 4 weeks = 48 missed/mo
- 30% would have booked = 14 missed jobs/mo
- $400 average ticket = $5,600/mo in lost revenue
- CloudGreet: $300/mo
- Net: $5,300/mo recovered, or 17x ROI in month 1

You don't need to be right. You need to make them do the math themselves.`,
  },

  {
    id: 'closing',
    title: 'Closing',
    blurb: 'Five techniques in priority order.',
    body: `**1. Assumptive close (try first)**
"Cool, I'll send the payment link to this email - is [their email] still good?" Then send it. 60% of soft yeses close on the assumptive close because there's no decision moment.

**2. Either/or close**
"Want to start with the standard $300 plan or the $400 plan with the multi-line setup?" You're not asking IF they'll buy, you're asking WHICH they'll buy.

**3. Risk-reversal close**
"First month is fully refundable if it doesn't book a single job. That's our problem to solve, not yours." Use this when they're stuck on "what if it doesn't work."

**4. Urgency close (only when true)**
"We're locking in setup fees at $500 through the end of [month] - going to $750 after that for new accounts." Don't lie about this. If you say it, set a calendar reminder to actually raise it.

**5. The "kill or close" close (last resort)**
"I want to be respectful of your time. Either this is a fit and we go this week, or it's not and I stop following up. Which is it?" Surprisingly often this gets the close, because the prospect was waiting for permission to just decide.

**The send sequence after a yes**
1. Click "Send payment link" in the lead detail
2. Auto-copies to your clipboard - paste it in the live conversation (text/email)
3. Stay on the line/chat until they confirm payment came through
4. Confirm a date/time for the customization call
5. Tell them to expect an email from CloudGreet within 1 hour
6. Update lead status to **proposal_sent** if it isn't already

**After the close**
Don't disappear. Text them within 24 hours: "Hey [name], welcome aboard. Your customization form should've landed in your inbox - if you can knock it out today the team can have you live by [day]. Hit me back with any questions." This drops your churn by ~20%.`,
  },

  {
    id: 'process',
    title: 'Day-to-day rhythm',
    blurb: 'What a productive day looks like.',
    body: `**Morning (8:30 - 9:30)**
- Open /sales — review owed banner, check today's follow-ups, check Cal.com bookings
- Knock out follow-ups first (highest close rate; warmest leads)
- Update statuses as you go - one-tap

**Mid-morning (9:30 - 12:00)**
- New cold calls. Aim for 30 dials. Use the dialer in /sales/leads.
- After every call, log status (Called / VM / Interested / Demo set / DNC)
- Voicemails auto-schedule a +2-day follow-up at 9 AM

**Lunch + reset (12:00 - 1:00)**
- Walk away. Sales is a marathon.

**Afternoon (1:00 - 4:00)**
- Demos and proposal sends
- Cal.com bookings show up on your overview
- Send payment links the same call you book the demo

**Late afternoon (4:00 - 5:30)**
- Follow-ups #2 (people who said "send me info" earlier)
- Cold calls #2 if you have steam

**End of day**
- Check /sales/earnings - see the owed number tick up
- Schedule tomorrow's first 5 calls before you sign off

**Weekly rhythm**
- Monday: pipeline review, set close target for the week
- Tuesday-Thursday: heads-down dialing
- Friday: payouts hit your bank, customization-form check-ins on this week's closes

**Numbers to hit (week 1-2)**
- 100 dials/day
- 10 conversations/day
- 2 demos/day
- 1 close/week (ramping)

**Numbers to hit (steady state, week 4+)**
- 50-80 dials/day
- 15 conversations/day
- 3-4 demos/day
- 3-5 closes/week`,
  },
]
