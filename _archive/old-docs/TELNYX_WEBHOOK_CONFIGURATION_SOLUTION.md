# Telnyx Webhook Configuration Solution

## Problem
The Telnyx API is returning the error:
```
Invalid value for connection_id (Call Control App ID) - The requested connection_id (Call Control App ID) is either invalid or does not exist. Only Call Control Apps with valid webhook URL are accepted.
```

## Root Cause
The Voice API Application (connection_id: 2786691125270807749) in your Telnyx account does not have a valid webhook URL configured, or the webhook URL is not accessible.

## Solution Steps

### 1. Access Telnyx Mission Control Portal
- Go to https://portal.telnyx.com/
- Log in with your Telnyx account credentials

### 2. Navigate to Voice API Applications
- In the left sidebar, click on "Voice" → "Voice API Applications"
- Find the application with ID: `2786691125270807749`
- Click on it to edit

### 3. Configure Webhook URL
- In the application settings, find the "Webhook URL" field
- Set the webhook URL to: `https://cloudgreet.com/api/telnyx/voice-webhook`
- Make sure the webhook URL is **publicly accessible** (not localhost)
- Save the configuration

### 4. Verify Webhook Accessibility
The webhook endpoint `https://cloudgreet.com/api/telnyx/voice-webhook` must:
- Be publicly accessible (not behind a firewall)
- Accept POST requests
- Return a 200 OK status
- Be deployed to production (not just localhost)

### 5. Test the Configuration
After configuring the webhook URL in Telnyx:
1. Wait 2-3 minutes for the configuration to propagate
2. Test the click-to-call API again
3. The call should now be initiated successfully

## Alternative Solution: Use a Different Connection ID
If the current connection ID doesn't work, you can:
1. Create a new Voice API Application in Telnyx
2. Configure it with the correct webhook URL
3. Update the `TELNYX_CONNECTION_ID` environment variable

## Current Status
- ✅ Code is correct (using `connection_id` parameter)
- ✅ API key is configured
- ✅ Webhook endpoint exists and returns 200 OK
- ❌ **Telnyx dashboard configuration missing**

## Next Steps
1. **You need to manually configure the webhook URL in your Telnyx dashboard**
2. This cannot be done programmatically - it requires manual configuration
3. Once configured, the phone system will work immediately

## Verification
After configuring the webhook URL in Telnyx, test with:
```bash
curl -X POST http://localhost:3000/api/click-to-call/initiate \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15551234567", "businessName": "Test Company"}'
```

Expected result: `{"message": "Call initiated successfully!", "call_id": "...", "status": "..."}`
