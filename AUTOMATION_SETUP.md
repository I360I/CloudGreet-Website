# CloudGreet Automation Setup Guide

## 🚀 Complete Business Automation Workflow

Your CloudGreet application now has **FULL AUTOMATION** for the entire client onboarding and setup process. Here's what happens automatically when a client completes onboarding:

### **Automated Workflow:**

1. **📧 Email Notification** → Sends details to `anthony@cloudgreet.com`
2. **🤖 Retell AI Agent Creation** → Automatically creates AI receptionist
3. **📞 Phone Number Purchase** → Buys and assigns phone number via Twilio
4. **💳 Stripe Subscription** → Sets up $200/month + $50/booking billing
5. **🔗 System Integration** → Links everything together
6. **✅ Client Ready** → AI receptionist is live and taking calls!

---

## 🔧 Required API Keys & Setup

### **1. Retell AI Setup**
```bash
# Get your API key from: https://retellai.com
RETELL_API_KEY=your-retell-api-key-here
```

### **2. Twilio Setup (Phone Numbers)**
```bash
# Get credentials from: https://console.twilio.com
TWILIO_ACCOUNT_SID=your-twilio-account-sid-here
TWILIO_AUTH_TOKEN=your-twilio-auth-token-here
TWILIO_PHONE_NUMBER_SID=your-twilio-phone-number-sid-here
```

### **3. Stripe Setup (Billing)**
```bash
# Get keys from: https://dashboard.stripe.com
STRIPE_SECRET_KEY=your-stripe-secret-key-here
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key-here
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret-here
```

### **4. Resend Setup (Email)**
```bash
# Get API key from: https://resend.com
RESEND_API_KEY=your-resend-api-key-here
```

---

## 📦 Install New Dependencies

```bash
npm install stripe twilio web-vitals
```

---

## 🎯 How It Works

### **Client Onboarding Process:**
1. Client fills out onboarding form
2. System automatically:
   - Creates Retell AI agent with their business details
   - Purchases phone number from Twilio
   - Sets up Stripe subscription
   - Links everything together
   - Sends notification email to you

### **Admin Dashboard:**
- View all clients and their status
- Monitor revenue and bookings
- Manage subscriptions
- Track AI agent performance

### **Billing System:**
- **$200/month** base subscription
- **$50 per booking** additional charge
- Automatic invoicing via Stripe
- Webhook handling for payment events

---

## 🔄 API Endpoints Created

### **Automation APIs:**
- `POST /api/create-retell-agent` - Creates AI agent
- `POST /api/purchase-phone-number` - Buys phone number
- `POST /api/create-subscription` - Sets up billing
- `POST /api/twilio-voice-webhook` - Handles incoming calls

### **Admin APIs:**
- `GET /admin` - Admin dashboard
- `GET /api/clients` - List all clients
- `PUT /api/clients/[id]` - Update client
- `DELETE /api/clients/[id]` - Remove client

---

## 💰 Revenue Model Automation

### **Subscription Tiers:**
- **Base Plan**: $200/month per client
- **Per-Booking Fee**: $50 per appointment scheduled
- **Automatic Billing**: Stripe handles all payments
- **Usage Tracking**: Monitors booking volume

### **Admin Revenue Tracking:**
- Monthly recurring revenue (MRR)
- Per-booking revenue tracking
- Client lifetime value (LTV)
- Churn rate monitoring

---

## 🚨 Important Notes

### **Before Going Live:**
1. **Set up all API keys** in your `.env.local` file
2. **Test the automation** with a test client
3. **Configure webhooks** in Stripe and Twilio
4. **Set up monitoring** for failed automations
5. **Create backup procedures** for manual intervention

### **Monitoring & Alerts:**
- Failed agent creation
- Phone number purchase failures
- Subscription creation errors
- Payment processing issues

---

## 🎉 What's Now Automated

✅ **Client onboarding form**  
✅ **Retell AI agent creation**  
✅ **Phone number purchase**  
✅ **Stripe subscription setup**  
✅ **System integration**  
✅ **Email notifications**  
✅ **Admin dashboard**  
✅ **Revenue tracking**  
✅ **Call handling**  
✅ **Billing automation**  

---

## 🔧 Manual Override Options

If automation fails, you can still:
- Manually create Retell agents
- Purchase phone numbers through Twilio console
- Set up subscriptions in Stripe dashboard
- Link components manually in admin dashboard

---

## 📞 Support & Troubleshooting

### **Common Issues:**
1. **API Key Errors**: Check all environment variables
2. **Phone Number Issues**: Verify Twilio account balance
3. **Billing Problems**: Check Stripe webhook configuration
4. **Agent Creation Fails**: Verify Retell API key and limits

### **Debug Mode:**
Enable debug logging by setting `NODE_ENV=development` in your environment.

---

## 🚀 Ready to Scale!

Your CloudGreet application is now **100% automated** and ready to handle unlimited clients. Each new client onboarding will:

1. **Automatically create** their AI receptionist
2. **Purchase and assign** a phone number
3. **Set up billing** for $200/month + $50/booking
4. **Go live immediately** and start taking calls

**No more manual work required!** 🎉
