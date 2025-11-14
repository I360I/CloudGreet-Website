# Retell AI Integration Guide

**Purpose:** Complete guide for setting up and verifying Retell AI integration  
**Status:** Integration code complete, requires configuration

---

## Overview

CloudGreet uses Retell AI for voice conversations. The system:
1. Receives calls via Telnyx
2. Routes to Retell AI agent
3. Retell AI uses GPT-4 for conversations
4. Tool calls handle appointment booking
5. Webhooks store call data

---

## Integration Status

### ✅ Complete (Code)
- Webhook handler: `/api/retell/voice-webhook`
- Session token generation: `/api/retell/session-token`
- Outbound calls: `/api/retell/outbound`
- Tool call handlers: book_appointment, send_booking_sms, lookup_availability
- Calendar sync integration
- Stripe billing integration

### ⚠️ Requires Setup
- Retell AI agent configuration
- Webhook URL configuration
- Tool call configuration
- Phone number linking

---

## Setup Instructions

### 1. Retell AI Dashboard Setup

#### Create AI Agent
1. Log into Retell AI dashboard
2. Go to "Agents" → "Create Agent"
3. Configure agent:
   - **Name:** CloudGreet Agent (or business-specific name)
   - **Model:** GPT-4 or GPT-4o
   - **Voice:** Choose voice (nova recommended)
   - **Language:** English

#### Configure System Prompt
Use a business-specific prompt. Example:
```
You are an AI receptionist for {business_name}, a {business_type} company.
Your role is to:
- Answer calls professionally and warmly
- Qualify leads by understanding their needs
- Schedule appointments when requested
- Provide information about services
- Escalate to human if needed

Business hours: {business_hours}
Services: {services}
Greeting: {greeting_message}
```

#### Enable Tool Calls
1. In agent settings, enable "Function Calling" or "Tool Calls"
2. Configure tools:
   - `book_appointment` - Books appointment
   - `send_booking_sms` - Sends SMS confirmation
   - `lookup_availability` - Checks available time slots

### 2. Webhook Configuration

#### Set Webhook URL
1. In Retell dashboard → Agent settings → Webhooks
2. Set webhook URL: `https://cloudgreet.com/api/retell/voice-webhook`
3. Generate webhook secret
4. Save secret to environment variable: `RETELL_WEBHOOK_SECRET`

#### Webhook Events
The webhook handles:
- `ping` - Health check (returns {ok: true})
- `tool_call` - Tool execution requests

### 3. Link Phone Numbers

#### Via Telnyx
1. In Telnyx dashboard, configure phone number
2. Set call routing to Retell AI
3. Link to Retell agent ID
4. Configure webhook for call events

#### Via Retell Dashboard
1. Go to "Phone Numbers" in Retell
2. Add phone number (purchased via Telnyx)
3. Link to agent
4. Configure call routing

### 4. Environment Variables

Required:
```bash
RETELL_API_KEY=your_retell_api_key
RETELL_WEBHOOK_SECRET=your_webhook_secret
```

Optional:
```bash
NEXT_PUBLIC_RETELL_API_KEY=your_retell_api_key  # For client-side if needed
```

---

## Tool Call Configuration

### book_appointment
**Purpose:** Books an appointment when customer requests it

**Parameters:**
- `name` - Customer name
- `phone` - Customer phone number
- `service` - Service type requested
- `datetime` - Appointment date/time (ISO format)
- `business_id` - Business UUID

**What Happens:**
1. Appointment saved to database
2. Google Calendar event created (if connected)
3. $50 Stripe fee charged automatically
4. SMS confirmation sent to customer
5. Returns appointment ID

### send_booking_sms
**Purpose:** Sends SMS confirmation for booking

**Parameters:**
- `phone` - Customer phone number
- `appt_id` - Appointment ID

**What Happens:**
1. SMS sent via Telnyx
2. Includes TCPA compliance text
3. Returns success status

### lookup_availability
**Purpose:** Checks available time slots

**Parameters:**
- (Currently returns default slots - can be enhanced)

**What Happens:**
1. Returns next 3 business days
2. Time slots: 10am and 2pm each day
3. Can be enhanced to check actual calendar availability

---

## Verification Steps

### 1. Test Webhook
```bash
curl -X POST https://cloudgreet.com/api/retell/voice-webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "ping"}'
```

Expected: `{"ok": true}`

### 2. Test Tool Call
```bash
curl -X POST https://cloudgreet.com/api/retell/voice-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "tool_call": {
      "name": "book_appointment",
      "arguments": {
        "name": "Test Customer",
        "phone": "+1234567890",
        "service": "Consultation",
        "datetime": "2025-01-26T10:00:00Z",
        "business_id": "your-business-id"
      }
    }
  }'
```

Expected: `{"success": true, "appointment_id": "..."}`

### 3. Test Phone Call
1. Call the configured phone number
2. Verify AI answers
3. Test appointment booking conversation
4. Verify appointment created in database
5. Check Stripe for $50 charge
6. Verify SMS received

---

## Troubleshooting

### Webhook Not Receiving Events
- Verify webhook URL is correct
- Check Vercel function logs
- Verify webhook secret matches
- Check Retell dashboard for webhook status

### Tool Calls Not Working
- Verify tool calls enabled in Retell agent settings
- Check tool names match exactly
- Verify business_id is valid
- Check database for appointment records

### Calls Not Routing to AI
- Verify phone number linked to Retell agent
- Check Telnyx call routing configuration
- Verify Retell agent is active
- Check call logs in Retell dashboard

### Calendar Not Syncing
- Verify Google Calendar OAuth configured
- Check business has calendar_connected = true
- Verify google_access_token is valid
- Check logs for calendar errors (non-blocking)

### Stripe Charges Not Working
- Verify STRIPE_SECRET_KEY is set
- Check business has stripe_customer_id
- Verify customer has payment method
- Check Stripe dashboard for failed charges

---

## Monitoring

### Key Metrics
- Call volume
- Tool call success rate
- Appointment booking rate
- Webhook response times
- Error rates

### Logs to Monitor
- Retell webhook logs
- Tool call execution logs
- Appointment creation logs
- Stripe charge logs
- Calendar sync logs

---

## Best Practices

1. **Error Handling:** All tool calls have try/catch with logging
2. **Non-Blocking:** Calendar/Stripe failures don't block appointment creation
3. **Idempotency:** Tool calls can be safely retried
4. **Logging:** All actions logged for debugging
5. **Compliance:** SMS includes TCPA compliance text

---

## Status

**Code Status:** ✅ Complete  
**Configuration Status:** ⚠️ Requires setup  
**Production Ready:** ✅ Yes (after configuration)

---

*Last updated: 2025-01-25*













