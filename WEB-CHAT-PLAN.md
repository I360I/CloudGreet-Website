# Client-Facing Web Chat — Implementation Plan

A web chat widget each CloudGreet client can put on their site (or share as a
link if they have no site, like Steve). It answers questions about *their*
business, quotes and books into *their* calendar, and sends *their* leads to
*them*. Sold as a churn-reducer: a visible client-facing asset, a new lead
channel on top of phone + SMS, costing pennies (Anthropic only, no telephony).

---

## 1. The core idea: it's the SMS agent over HTTP

We do **not** build a new agent. `lib/sms-agent.ts` is already a per-business
Anthropic tool-use loop with Steve's real tools. Web chat reuses the same brain
and swaps the transport.

| Piece | SMS agent today | Web chat |
| --- | --- | --- |
| Identity | customer phone number (carrier-provided) | a generated `session_id` (web visitor has no phone) |
| Transport | Telnyx in/out | HTTP request/response to the browser |
| System prompt | `buildSystemPrompt()` (SMS channel rules) | same builder, **new `channel: 'web'` branch** |
| Tools | `lookupDriveTime`, `computeQuote`, `sendDispatchRequest`, `saveCustomerEmail`, `book_appointment` | **same tools, unchanged** (`lib/quote-engine.ts`) |
| Booking write | `createBooking()` with the business's `cal_com_*` keys | identical |
| Owner notification | `sendDispatchRequest` texts Steve | identical (Steve still gets the text) |
| Storage | `sms_conversations` + `sms_agent_messages` | new `web_conversations` + `web_messages` |
| Rate limit | per-conversation inbound cap | per-session + per-IP + per-business global |

Booking, quoting, and owner-notification all come for free because they're
already business-scoped and channel-agnostic.

---

## 2. THE CATCH (this is the real work for "future clients")

`buildSystemPrompt()` in `lib/sms-agent.ts:472` is **hard-coded to SmartRide**.
Its own comment says so: *"SmartRide-specific full prompt ... until we wire
per-business prompt overrides."* The pricing, service area, vehicle, and "Steve"
are literals in the function.

Consequence:
- **Steve today:** trivial. Reuse that prompt as-is, add a web-channel block. Done.
- **Every future client:** blocked on a prerequisite — **per-business prompt /
  knowledge overrides.** Until that exists, a second client's web chat would
  describe Steve's transport business. This gap is pre-existing (it affects the
  SMS agent too); web chat just makes it the thing standing between you and
  "works for any client."

So the honest sequencing is: **Phase 1 ships Steve. Phase 2 is the multi-tenant
prompt/KB system, which is what actually unlocks "future clients."**

---

## 3. Identity & conversation model (the one genuinely new design)

A web visitor has no phone number, which the SMS agent leans on everywhere
(passes it to Steve, skips asking for it, keys the conversation by it). For web:

- **Session:** browser generates a `session_id` (uuid in localStorage) sent with
  every message. Conversation is keyed `(business_id, session_id)`.
- **Contact capture:** because we don't get a number for free, the **web prompt
  must collect name + phone (+ optional email) in-chat before dispatch/booking.**
  The SMS prompt's "do not ask for their phone, we already have it" rule is
  *inverted* on web.
- **Web channel rules:** markdown renders fine in the browser, so unlike SMS the
  web prompt can use light formatting and slightly longer replies.

New tables (mirror the SMS ones, don't pollute them):

```sql
create table public.web_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  session_id text not null,
  captured_name text, captured_phone text, captured_email text,
  report_token text default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now(),
  last_inbound_at timestamptz, updated_at timestamptz default now(),
  unique (business_id, session_id)
);
create table public.web_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.web_conversations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  body text, tool_calls jsonb,
  created_at timestamptz default now()
);
```

---

## 4. Data model: businesses table additions

```sql
alter table public.businesses
  add column if not exists chat_slug text unique,           -- 'smartride'
  add column if not exists web_chat_enabled boolean not null default false,
  add column if not exists web_chat_greeting text,          -- optional custom hello
  add column if not exists web_chat_accent text;            -- optional brand color
```

Public lookups resolve a business by `chat_slug` (never expose the uuid in the
embed/link). Only `web_chat_enabled = true` businesses respond.

---

## 5. Routes

- **`POST /api/c/[slug]/chat`** — public. Resolves business by `chat_slug`,
  rejects if `web_chat_enabled` is false, runs the shared tool loop
  (refactored out of `handleInboundSms` into a `runAgentTurn({channel:'web'})`
  helper so SMS and web share one implementation), persists to `web_messages`,
  returns `{ reply }`. Rate-limited per session + IP + business.
- **`GET /c/[slug]`** — public hosted page. Full-screen branded chat (business
  name, optional accent/greeting). This is Steve's no-website install.
- **`GET /embed.js`** — tiny loader script. `<script src=".../embed.js"
  data-biz="smartride"></script>` injects the floating bubble (an iframe of
  `/c/[slug]?embed=1`) into any client site. Iframe keeps their CSS and ours
  isolated.
- **(optional) `GET /r/[report_token]`** — reuse the existing login-free report
  pattern so the owner can see a web conversation, same as text-to-book reports.

---

## 6. UI

- **Reuse `app/components/landing/ChatWidget.tsx`** ink design as the base. Two
  render modes:
  - **Hosted (`/c/[slug]`):** full-screen / centered card, business name in the
    header, always open. The link Steve shares.
  - **Embed (`/c/[slug]?embed=1`):** the floating-bubble version inside the
    iframe that `embed.js` injects.
- Per-business branding: header shows `business_name`; optional `web_chat_accent`
  recolors the send button / user bubble; optional `web_chat_greeting` overrides
  the first message. No mascot.

---

## 7. Refactor (keep it DRY, no copy-paste of the agent)

Extract the model loop from `handleInboundSms` into a transport-agnostic core:

```
runAgentTurn({
  businessId, channel: 'sms' | 'web',
  conversationId, history, userText,
  contact: { phone?, name?, email? },   // sms passes phone; web passes captured
}) -> { reply, toolCalls, outcomeKind }
```

`handleInboundSms` becomes: load business → Telnyx specifics → `runAgentTurn` →
send via Telnyx. The web route becomes: resolve slug → `runAgentTurn` → JSON.
`buildSystemPrompt` gains a `channel` param that switches the channel-rules and
contact-collection blocks. **This refactor is the bulk of the careful work**;
everything else is plumbing.

---

## 8. Abuse, cost, safety

- Public + costs Anthropic per message. Reuse the landing concierge's pattern:
  per-session cap (e.g. 30 / 5 min), per-IP cap, per-business daily global cap.
  Silent-drop on the per-session cap (same reasoning as the SMS agent).
- `book_appointment` / `sendDispatchRequest` already have their own caps
  (dispatch is 3/hr in SMS) — keep them.
- Web visitors are anonymous: never let the agent read back data it wasn't given
  in this session. The prompt already only knows what's in the brief + tools.
- One bad actor can only burn Anthropic tokens, not place calls/texts beyond the
  dispatch cap (which texts Steve, who'd notice).

---

## 9. Per-client setup runbook (what you do for each business)

1. Business is already onboarded (has `cal_com_*` keys + an agent prompt). For
   Steve this is already true.
2. `update businesses set chat_slug='smartride', web_chat_enabled=true where id=…`
3. (Phase 2 clients) author their per-business prompt/KB override — the scrape
   feeds this; reuse the same source the voice/SMS agent will use.
4. Hand the client either the link (`cloudgreet.com/c/smartride`) or the one-line
   `<script>` tag. They paste it in their Google Business Profile, text
   signature, Instagram bio, email footer, or website.

---

## 10. Phasing

- **Phase 1 — Steve (1 build):** new tables, the `runAgentTurn` refactor with a
  `channel:'web'` branch reusing the existing SmartRide prompt, `POST
  /api/c/[slug]/chat`, the `/c/[slug]` hosted page, rate limits, owner
  notifications (free via `sendDispatchRequest`). Outcome: a real link Steve
  shares today; validates the churn thesis.
- **Phase 2 — multi-tenant:** per-business prompt/KB overrides (the real
  unblocker), `embed.js` widget, admin UI to set `chat_slug` / toggle / branding,
  optional per-business report viewer.
- **Phase 3 — polish:** typing presence, transcript email to owner, "leave your
  number and we'll call you" tie-in to the existing demo-call path, analytics.

---

## 11. Decisions to confirm before building

- **Hosted URL shape:** `cloudgreet.com/c/[slug]` vs a subdomain
  (`chat.cloudgreet.com/[slug]`) vs per-client domain later. Path is simplest.
- **Booking on web:** real Cal.com booking in-chat (like the landing concierge),
  or capture-and-let-Steve-confirm? For SmartRide, dispatch (`sendDispatchRequest`
  to Steve) is probably the right default since he quotes/confirms rides himself.
- **Contact gate:** require name + phone before the agent will quote/dispatch, or
  let it answer freely and only gate at booking? (Recommend: answer freely, gate
  at dispatch/booking.)
- **Who gets notified:** confirm web leads/bookings should ping Steve exactly the
  way SMS dispatch does today.
