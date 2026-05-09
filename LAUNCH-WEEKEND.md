# CloudGreet — Launch Weekend Plan

This is your weekend. Not a polish backlog, not a wishlist. The exact
list of things you need to do, in order, with what success looks like
and what to do if something breaks.

Two reps. First cohort of 3–10 contractors. Recoverable surface area.
The thing you can't recover from is not shipping.

---

## Tonight (15 min) — environment is correct

Confirm in Vercel → Settings → Environment Variables that all of these
are set. The system-health page (`/admin/system-health`) tells you which
are missing in real time, but here's the manual checklist:

- [ ] `TELNYX_API_KEY`
- [ ] `TELNYX_PUBLIC_KEY` (full PEM block — without this, every Telnyx
      webhook is rejected)
- [ ] `TELNYX_MESSAGING_PROFILE_ID`
- [ ] `CLOUDGREET_NOTIFICATIONS_FROM` (your toll-free or local number,
      `+1XXXXXXXXXX` format)
- [ ] `RETELL_API_KEY`
- [ ] `RETELL_WEBHOOK_SECRET`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `SUPPORT_EMAIL` = `anthony@cloudgreet.com`
- [ ] `FOUNDER_EMAIL` = `anthony@cloudgreet.com`
- [ ] `RESEND_REPLY_TO` = `anthony@cloudgreet.com`
- [ ] `ANTHROPIC_API_KEY` (used by the agent builder)
- [ ] `OPENAI_API_KEY` (fallback model + Telnyx tools)
- [ ] `GOOGLE_PLACES_API_KEY` (used by the agent-prompt scraper)
- [ ] `JWT_SECRET` — **rotate to a fresh value tonight.** This kills any
      tokens that may have been served from the old cache leak. Everyone
      will be logged out and have to log back in. Good.
- [ ] `SLACK_WEBHOOK_URL` (so completion pings land in your channel)
- [ ] `SLACK_AGENT_COMPLETE_MENTIONS` (set to Aaron's `<@U…>` mention
      string from `/admin/sales/[aaron's-id]` Slack panel)

Then Vercel → Deployments → "Redeploy" the latest production deploy to
pick up any env changes.

---

## Tonight (5 min) — Telnyx wiring is live

1. Open `/admin/telnyx-health` on cloudgreet.com.
2. **Section 1 — env vars**: should be all green. If `TELNYX_PUBLIC_KEY`
   is red, the SMS webhook rejects every event. Fix before going to bed.
3. **Section 2 — webhook URLs**: copy the `Inbound SMS` URL with the
   button. In Telnyx → Messaging → your messaging profile → Inbound
   Settings → Webhook URL: paste it. Save.
4. Voice URL: leave blank. Your setup uses Retell-direct, not
   Telnyx-bridged voice.
5. **Section 3 — verify**: text `STOP` from your phone to your
   CloudGreet number. Click Refresh. Your number should appear in the
   "recent opt-outs" list within ~5 seconds. If it doesn't, the webhook
   URL in Telnyx is wrong.

---

## Saturday morning (90 min) — walk your own product as a fake customer

The most valuable test you can run. Most founders skip this. Don't.

Use a different browser profile or incognito. Different email.

1. Sign up at cloudgreet.com using a payment link from a real test close.
2. Pay with a real card (Stripe will prove the checkout works end-to-end).
3. Land in `/dashboard/onboarding`. Connect a fresh Cal.com (free
   account, takes 2 min).
4. Pick an event type. Confirm it saves.
5. Tap the forwarding code from your phone (use a phone you don't
   actively need for the rest of the test — forwarding will take it over).
6. Place a test call to the contractor's existing number from a different
   phone. Speak to the AI. Try to book an appointment. Use a fake address,
   a real callback number you own.
7. After the call: check Cal.com — did the appointment show up?
8. Check `/dashboard` — is the call listed?
9. Wait for the review SMS to land on your phone (will fire at 9 AM ET
   the next morning since the cron is daily on Hobby plan).

**Every place you stumble** — write it down. Copy unclear, button missing,
field labelled wrong, error you didn't expect. That's where the first
contractor will stumble, and they won't tell you. They'll just churn.

When you're done, undial the forwarding code (`*73` on Spectrum, varies
by carrier).

---

## Saturday afternoon (30 min) — the agent quality test

Different test, focused on what comes out of the AI's mouth.

1. Pick one real upcoming demo from `/admin/agents-due`. Or create a
   throwaway close from `/admin/sales` if you don't have one queued.
2. Click into the workspace. Hit **Build draft**.
3. Wait for the prompt to generate. Read it. Edit the parts that sound
   robotic, generic, or wrong.
4. Click **Approve & copy for Retell**. Build the agent in Retell using
   that prompt. Pick an ElevenLabs-passthrough voice (Aria, Cassidy, etc).
5. Make a real phone call to the test number Retell gives you.
6. Try common scenarios:
   - "How much for a quote?" — does it dodge price gracefully?
   - "Can I talk to the owner?" — does it offer a callback?
   - Pretend you're stressed (water leak in summer, no AC) — does it
     match urgency?
   - Ask something it shouldn't know — does it say "let me have someone
     call you back" or invent an answer?
7. Listen to the recording in admin. Read the transcript. If you'd be
   embarrassed to demo this to Aaron, the prompt needs more work.

---

## Sunday (1 hour, with Aaron on a call)

Walk Aaron through his exact day-one path. Where he hesitates, that's
where the UI needs help text or a fix.

1. He logs in at `/sales/login`.
2. He reads `/sales/playbook` — does it answer his questions?
3. He scrapes leads at `/sales/leads`. Picks one. Calls it.
4. The lead is interested. He clicks the **Send booking link** action.
5. The prospect books a demo time. Aaron can see the demo on
   `/sales/closes` for that lead.
6. Day of demo: prospect calls in. Aaron hears it through the agent.
7. Prospect agrees to terms. Aaron sends the payment link from
   `/sales/closes` detail panel — picks pricing inline, hits Generate.
8. Prospect pays. Status flips to `paid` automatically (Stripe webhook).
9. Aaron's commission shows up on `/sales/earnings`.

You watch all of this. If Aaron asks "wait, where do I…?" — that's a UX
problem you fix immediately or document as a known gotcha.

---

## Monday — launch-day routine

Open these tabs at the start of every workday for the first two weeks:

1. **`/admin/system-health`** — refresh once an hour. Watch:
   - "Stuck after paid" — must stay at 0
   - "Calls under 30s %" — must stay below 15%
   - Telnyx balance — top up if under $50
   - Failed review SMS — investigate any new entries
2. **`/admin/agents-due`** — your build queue. Demo today? Make sure
   the agent is ready with the test number pasted before the demo time.
3. **Slack channel where completion pings land** — every "Agent
   complete" message means a rep just shipped a client. Aaron should be
   @-mentioned automatically.
4. **Stripe dashboard → Payments** — watch for any failed charges.
5. **Vercel logs** — only if something looks wrong on `/admin/system-health`.

---

## If something breaks — recovery quick reference

| What broke | What to do |
|---|---|
| Contractor can't connect Cal.com | Admin → `/admin/clients/[id]` → manually paste their API key. Or worst case, the agent texts customers a callback request instead of auto-booking. Not the end of the world. |
| Phone forwarding doesn't activate | Their existing line still works. You're a value-add, not a replacement. Carrier rep can dial the code from the line if the contractor can't. Carrier-specific codes are in `lib/forwarding-codes.ts`. |
| Agent says something weird on a call | `/admin/clients/[id]` → edit prompt → save. Retell propagates instantly. Call the contractor, apologize personally, demo the fix. |
| Stripe checkout fails | Manually invoice via Stripe dashboard. Mark the close paid manually from `/admin/sales/closes`. |
| Review SMS doesn't deliver | Check `/admin/telnyx-health` for the Telnyx error. Most likely toll-free verification still pending — feature is broken silently for a few more days but the core product works. |
| You signed in and saw someone else's data | This was the cache leak. It's fixed. If it ever recurs, rotate `JWT_SECRET` immediately and redeploy. |
| A rep tells you their commission is wrong | `/admin/sales/[rep-id]` shows their full ledger. Manually adjust via Supabase if needed. Tell them you're on it; trust > everything else this early. |

---

## What I'm building for you tonight while you read this

- **Universal CloudGreet behavior layer** for the agent prompt. Every
  agent built from now on inherits the do-not-repeat / do-not-transfer-
  eagerly / email readback / numbers-as-words rules from the critique
  earlier. ~2 hours of work, immediate quality bump on every call.
- **Test-phone propagation.** When you click "Mark ready" with the
  Retell test number, it auto-updates `phone_numbers` and `ai_agents`
  so the client's onboarding flips out of "agent is being built"
  automatically. One paste, not two. ~30 min.

Both will be live before Saturday morning. You'll see them in the
weekend test.

---

## What I am NOT doing this weekend (and why)

- **Omni-channel (chat/SMS/email agents)** — multi-week project, not a
  Monday-launch item.
- **Retell Assure integration** — wait until you have 5+ live clients
  generating call volume.
- **ElevenLabs migration** — voice quality on Retell is fine via
  ElevenLabs-passthrough voices. The migration would be a launch
  derailer.
- **Lakera / prompt-injection guardrails** — your blast radius is small
  (agent can only book appointments). Defensive prompt language in the
  universal behavior layer covers 95%.
- **Templates library** — nice future enhancement, not a Monday blocker.
- **Remaining audit residue** (impersonation logging, payment-link
  idempotency, generic error wrapping) — real items, none currently
  exploitable. Post-launch.

The temptation when you're overwhelmed is to do more. The right move is
to do less, but make every line of it real.

---

## The framing

You have two reps. Probably three to ten contractors in the first
cohort. That's a small enough surface area to recover from anything
that breaks. You're not launching to 1000 users where bad press kills
you. You're launching to a tight cohort where you can call any one of
them personally if shit goes sideways.

The companies that succeed don't ship perfect launches. They ship
functional launches and pick up the phone fast when something breaks.
You're built for that.

Don't let perfectionism win this weekend. Walk the five steps above.
Trust the work. Ship Monday.
