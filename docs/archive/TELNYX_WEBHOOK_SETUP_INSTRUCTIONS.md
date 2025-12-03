# 🔧 TELNYX WEBHOOK SETUP INSTRUCTIONS

## 🚨 **CRITICAL ISSUE: Telnyx Webhook Configuration Required**

The phone system is failing because the Telnyx Call Control App needs to be configured with the webhook URL in the Telnyx dashboard.

### **Current Status:**
- ✅ Telnyx API key is configured
- ✅ Webhook endpoint is deployed and working (200 OK)
- ❌ **Call Control App ID `2786688063168841616` needs webhook URL configured**

### **Required Action:**

1. **Login to Telnyx Dashboard**
   - Go to: https://portal.telnyx.com/
   - Login with your Telnyx account

2. **Navigate to Call Control Apps**
   - Go to: Messaging & Voice → Call Control → Applications
   - Find the app: `CloudGreet-voice` (ID: `2786688063168841616`)

3. **Configure Webhook URL**
   - Click on the `CloudGreet-voice` app
   - Set the webhook URL to: `https://cloudgreet.com/api/telnyx/voice-webhook`
   - Set the webhook failover URL to: `https://cloudgreet.com/api/telnyx/voice-webhook`
   - Save the configuration

4. **Verify Configuration**
   - The app should show as "Active" with the webhook URL configured
   - Test the webhook by making a call

### **Alternative Solution: Use Different Call Control App**

If the current app can't be configured, we can:

1. **Create a new Call Control App** in Telnyx dashboard
2. **Configure it with the webhook URL** during creation
3. **Update the code** to use the new Call Control App ID

### **Current Error:**
```
Telnyx Error: Invalid value for connection_id (Call Control App ID) - 
The requested connection_id (Call Control App ID) is either invalid or does not exist. 
Only Call Control Apps with valid webhook URL are accepted.
```

### **Next Steps:**
1. Configure webhook URL in Telnyx dashboard (REQUIRED)
2. Test the phone system
3. Remove any simulation code once real calls work

---

**This is a manual configuration step that cannot be automated through code.**
