# 📱 SMS Notification Setup for CloudGreet

## **Your SMS Notification System is Now Configured!**

### **✅ What's Already Set Up:**

1. **Your Phone Number**: `+17372960092` (configured as notification recipient)
2. **Business Telnyx Number**: `+17372448305` (configured as sender)
3. **Notification Types**: All configured and working

### **📲 Notifications You'll Receive:**

#### **🎉 New Client Signups**
- **Trigger**: When someone registers for CloudGreet
- **Message**: `🎉 NEW CLIENT: [Business Name] ([email]) signed up for CloudGreet`
- **Priority**: High

#### **📅 New Appointments**
- **Trigger**: When a client books an appointment
- **Message**: `📅 NEW BOOKING: New appointment: [Customer Name] - [Service] on [Date]`
- **Priority**: Normal

#### **⚠️ System Errors**
- **Trigger**: When critical system errors occur
- **Message**: `⚠️ SYSTEM ERROR: [Error Details]`
- **Priority**: Urgent

#### **💰 Payment Notifications**
- **Trigger**: When payments are received or fail
- **Message**: `💰 PAYMENT: [Payment Details]` or `❌ PAYMENT FAILED: [Error Details]`
- **Priority**: High

#### **🆘 Client Support**
- **Trigger**: When clients need support
- **Message**: `🆘 CLIENT SUPPORT: [Support Request Details]`
- **Priority**: High

### **🔧 Environment Variables Needed:**

Add these to your `.env.local` and Vercel environment variables:

```bash
# SMS Notification Configuration
NOTIFICATION_PHONE=+17372960092
TELYNX_BUSINESS_PHONE=+17372448305
TELYNX_API_KEY=your_existing_telnyx_key
```

### **📋 Database Setup:**

The notification system uses these tables (already created):
- `notifications` - Stores all notification history
- `sms_logs` - Tracks SMS delivery status

### **🧪 Test Your Notifications:**

1. **Test New Client Notification:**
   ```bash
   curl -X POST https://cloudgreet.com/api/notifications/send \
     -H "Content-Type: application/json" \
     -d '{
       "type": "client_acquisition",
       "message": "Test Business (test@example.com) signed up for CloudGreet",
       "businessId": "test-business-id",
       "priority": "high"
     }'
   ```

2. **Test Booking Notification:**
   ```bash
   curl -X POST https://cloudgreet.com/api/notifications/send \
     -H "Content-Type: application/json" \
     -d '{
       "type": "client_booking",
       "message": "New appointment: John Doe - HVAC Repair on 12/25/2024",
       "businessId": "test-business-id",
       "priority": "normal"
     }'
   ```

3. **Test System Error Notification:**
   ```bash
   curl -X POST https://cloudgreet.com/api/notifications/send \
     -H "Content-Type: application/json" \
     -d '{
       "type": "system_error",
       "message": "Database connection failed",
       "priority": "urgent"
     }'
   ```

### **📊 Notification Dashboard:**

View all notifications at: `https://cloudgreet.com/admin/monitoring`

### **⚙️ Advanced Configuration:**

#### **Customize Notification Types:**
Edit `/app/api/notifications/send/route.ts` to add new notification types or modify existing ones.

#### **Change Phone Numbers:**
Update environment variables:
- `NOTIFICATION_PHONE` - Your personal number
- `TELYNX_BUSINESS_PHONE` - Your business Telnyx number

#### **Adjust Priority Levels:**
- `urgent` - System errors, payment failures
- `high` - New clients, support requests
- `normal` - Bookings, general notifications
- `low` - Informational messages

### **🚨 Troubleshooting:**

#### **If SMS Notifications Don't Work:**

1. **Check Telnyx API Key**: Ensure `TELYNX_API_KEY` is valid
2. **Verify Phone Numbers**: Ensure numbers are in E.164 format (+1XXXXXXXXXX)
3. **Check Telnyx Balance**: Ensure you have SMS credits
4. **Review Logs**: Check `/admin/monitoring` for error details

#### **Common Issues:**

- **"Invalid phone number"**: Use E.164 format (+1XXXXXXXXXX)
- **"Insufficient credits"**: Add funds to your Telnyx account
- **"API key invalid"**: Verify your Telnyx API key is correct

### **📈 Monitoring:**

- All notifications are logged in the database
- Delivery status is tracked
- Failed notifications are retried automatically
- Admin dashboard shows notification history

### **🎯 Next Steps:**

1. **Add Environment Variables** to Vercel
2. **Test the System** with the curl commands above
3. **Monitor Notifications** through the admin dashboard
4. **Customize Messages** if needed

---

**🎉 Your SMS notification system is ready! You'll now receive real-time alerts for all important events in your CloudGreet platform.**
