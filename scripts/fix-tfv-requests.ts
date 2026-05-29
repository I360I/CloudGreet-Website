/**
 * Patches the two pending CloudGreet TFV requests so they actually
 * match the conversational-booking use case (the original submissions
 * had useCase: "2FA" which is why Telnyx kicked back +18885030906 with
 * "Opt in does not match use case summary"). Steve's number
 * (+18336940507) is still in Telnyx review with the same mismatch
 * waiting to be flagged - fix it before it bounces too.
 *
 * Telnyx's PATCH for TFV is really a PUT - every required field must
 * be in the body. We GET the existing record, merge corrections, then
 * PATCH back.
 */

const IDS = [
  'e594201f-d19c-52d3-86e2-ae02ad161b1b', // +18885030906 (rejected)
  '9dca4314-965e-5726-850c-5854c0ba70a4', // +18336940507 (Steve, still pending)
]

const OVERRIDES = {
  useCase: 'Mixed',
  messageVolume: '1,000',
  useCaseSummary:
    'CloudGreet AI receptionist for SmartRide (Columbus OH transportation). Existing customers TEXT THE BUSINESS NUMBER FIRST to request airport pickups, point-to-point rides, and hourly transport. All replies are reactive customer care - no proactive marketing. AI collects pickup details, returns an upfront quote, owner confirms with customer. Strictly transactional customer-initiated booking.',
  productionMessageContent:
    'First reply (sent only after customer texts in): "SmartRide via CloudGreet - Reply STOP to opt out, HELP for help. Msg & data rates may apply. How can we help with your ride?"\n\nQuote: "That CMH to 3310 Morse Rd ride around 4pm runs about $50 plus tax. Send to Steve to confirm?"\n\nConfirmation: "Confirmed - Steve picks you up at CMH baggage claim 3 at 4pm tomorrow."',
  optInWorkflow:
    'Customer-initiated. (1) Customer either calls the SmartRide business line or texts the toll-free number directly. (2) If they call, the AI receptionist tells them they can also text this same number for quotes. (3) Customer sends the FIRST inbound text - that is the opt-in action. (4) The very first system reply contains: business ID, "Reply STOP to opt out, HELP for help", and "Msg & data rates may apply". No proactive outbound. STOP honored automatically.',
  optInKeywords: 'START, YES, UNSTOP',
  optInConfirmationResponse:
    'You are subscribed to SmartRide ride request messages via CloudGreet. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to cancel.',
  helpMessageResponse:
    'SmartRide ride request line via CloudGreet. Reply STOP to opt out. Support: anthony@cloudgreet.com. Msg & data rates may apply.',
  additionalInformation:
    'CloudGreet is the ISV/platform. SmartRide (Columbus OH transportation) is the operational end client. Same CloudGreet brand as verified TFV 1a1b8412-b454-5d55-b0df-e4cb69b3d828 (+18888630537). ~100 msgs/month per number. Customers initiate every conversation. STOP/HELP automatic.',
  isvReseller: 'CloudGreet',
}

async function main() {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) throw new Error('TELNYX_API_KEY not set')

  for (const id of IDS) {
    console.log(`\n=== ${id} ===`)
    const gRes = await fetch(`https://api.telnyx.com/v2/messaging_tollfree/verification/requests/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!gRes.ok) {
      console.error(`GET failed ${gRes.status}: ${await gRes.text()}`)
      continue
    }
    const existing = await gRes.json() as Record<string, unknown>

    // Explicit allowlist - Telnyx PATCH rejects unknown fields with
    // "not well-formed". Build from existing + overrides.
    const allow = [
      'businessName','corporateWebsite','businessAddr1','businessAddr2',
      'businessCity','businessState','businessZip',
      'businessContactFirstName','businessContactLastName','businessContactEmail','businessContactPhone',
      'messageVolume','phoneNumbers','useCase','useCaseSummary',
      'productionMessageContent','optInWorkflowImageURLs','additionalInformation',
      'isvReseller','webhookUrl','doingBusinessAs','entityType',
      'optInConfirmationResponse','helpMessageResponse',
      'privacyPolicyURL','termsAndConditionURL','ageGatedContent',
      'optInKeywords','optInWorkflow',
    ]
    const merged: Record<string, unknown> = {}
    for (const k of allow) {
      if (k in (existing as any)) merged[k] = (existing as any)[k]
    }
    Object.assign(merged, OVERRIDES)
    // Normalize: drop nulls, trim multi-line whitespace artefacts that
    // crept in from the original web form.
    const body: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(merged)) {
      if (v === null || v === undefined) continue
      if (typeof v === 'string') body[k] = v.replace(/\s+/g, ' ').trim() || undefined
      else body[k] = v
    }
    // Preserve intentional newlines in productionMessageContent + optInWorkflow.
    body.productionMessageContent = OVERRIDES.productionMessageContent
    body.optInWorkflow = OVERRIDES.optInWorkflow

    console.log(`  before: useCase=${existing.useCase}  status=${existing.verificationStatus}  reason=${existing.reason || '(none)'}`)
    console.log(`  prodMsg=${(OVERRIDES.productionMessageContent.length)}ch  optIn=${(OVERRIDES.optInWorkflow.length)}ch  summary=${(OVERRIDES.useCaseSummary.length)}ch`)

    const pRes = await fetch(`https://api.telnyx.com/v2/messaging_tollfree/verification/requests/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const txt = await pRes.text()
    if (!pRes.ok) {
      console.error(`  PATCH FAILED ${pRes.status}: ${txt}`)
      continue
    }
    const j = JSON.parse(txt)
    console.log(`  after:  useCase=${j?.useCase}  status=${j?.verificationStatus}  reason=${j?.reason || '(none)'}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
