# 🚀 **CloudGreet SaaS Platform Quick Start Guide**

## **Get Your Multi-Tenant Platform Running in 5 Minutes**

### **Step 1: Install Dependencies**
```bash
npm install
```

### **Step 2: Run Setup Script**
```bash
node setup.js
```
This interactive script will guide you through setting up all your API keys.

### **Step 3: Set Up Database**
1. Go to your Supabase project dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `database-setup.sql`
4. Run the script

### **Step 4: Start Development Server**
```bash
npm run dev
```

### **Step 5: Test Everything**
```bash
node test-apis.js
```

### **Step 6: Visit Your Platform**
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## **🎯 What You Get**

### **Multi-Tenant SaaS Platform:**
- 🏢 **Your Platform** - Single website where all clients sign up
- 👥 **Client Accounts** - Each client gets their own isolated dashboard
- 🔐 **Data Isolation** - Complete separation between client data
- 📊 **Admin Dashboard** - Monitor all clients from one place

### **Complete AI Voice System for Each Client:**
- ✅ **AI Voice Agents** - Create custom voice assistants
- ✅ **Phone Integration** - Automated phone number purchasing
- ✅ **Calendar Booking** - Automatic appointment scheduling
- ✅ **Payment Processing** - Stripe integration for billing
- ✅ **Email Notifications** - Automated customer communication
- ✅ **Analytics Dashboard** - Real-time call and booking analytics
- ✅ **User Management** - Secure authentication and user accounts

### **Professional Features:**
- ✅ **Multi-tenant Architecture** - Each user has their own data
- ✅ **Real-time Updates** - Live dashboard updates
- ✅ **Error Handling** - Professional error pages and messages
- ✅ **Security** - Row-level security, CSRF protection, secure headers
- ✅ **Scalable** - Built for production deployment

---

## **🔧 API Endpoints**

### **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### **Voice Agents**
- `POST /api/create-azure-voice-agent` - Create AI voice agent
- `POST /api/azure-phone-integration` - Purchase phone number

### **Calendar Integration**
- `POST /api/calendar/google-calendar` - Google Calendar integration
- `POST /api/calendar/universal-calendar` - Universal calendar booking

### **Payment Processing**
- `POST /api/stripe/create-customer` - Create Stripe customer
- `POST /api/stripe/create-subscription` - Create subscription
- `POST /api/stripe/charge-booking` - Charge for appointments

### **Email Services**
- `POST /api/send-onboarding` - Send welcome emails
- `POST /api/notifications/smart` - Smart notifications

### **Analytics**
- `GET /api/analytics/stats` - Dashboard statistics
- `GET /api/analytics/recent-activity` - Recent activity feed

### **Automated Onboarding**
- `POST /api/automated-onboarding` - Complete setup automation

---

## **📋 Required Services**

### **Essential (Required)**
1. **Supabase** - Database and authentication
2. **Stripe** - Payment processing
3. **Resend** - Email services
4. **Azure** - Voice services and phone numbers
5. **Google Calendar** - Calendar integration

### **Optional**
1. **ElevenLabs** - Enhanced voice synthesis
2. **Retell AI** - Alternative voice service

---

## **🔑 API Key Setup**

### **Supabase**
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Get Project URL and API keys from Settings > API

### **Stripe**
1. Create account at [stripe.com](https://stripe.com)
2. Get API keys from Developers > API keys
3. Set up webhooks for your domain

### **Resend**
1. Create account at [resend.com](https://resend.com)
2. Get API key from API Keys section
3. Verify your domain

### **Azure**
1. Create account at [azure.microsoft.com](https://azure.microsoft.com)
2. Create Speech Services resource
3. Create Communication Services resource
4. Get connection strings and API keys

### **Google Calendar**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable Calendar API
4. Create service account
5. Download credentials JSON

---

## **🚀 Deployment**

### **Vercel (Recommended)**
1. Push code to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### **Other Platforms**
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

---

## **📊 Monitoring**

### **Health Check**
Visit `/api/system-status` to check all service connections.

### **Analytics**
- Real-time dashboard at `/dashboard`
- Call logs and statistics
- Revenue tracking
- User activity monitoring

---

## **🆘 Troubleshooting**

### **Common Issues**

1. **"Service not configured" errors**
   - Run `node setup.js` to configure API keys
   - Check environment variables are set correctly

2. **Database connection errors**
   - Verify Supabase URL and keys
   - Run database setup script
   - Check Row Level Security policies

3. **Authentication issues**
   - Verify NextAuth configuration
   - Check NEXTAUTH_SECRET is set
   - Ensure NEXTAUTH_URL matches your domain

4. **Payment processing errors**
   - Verify Stripe keys are correct
   - Check webhook endpoints
   - Ensure using live keys for production

### **Getting Help**
- Check the logs in your terminal
- Visit `/api/system-status` for service health
- Run `node test-apis.js` to test all endpoints

---

## **🎉 You're Ready!**

Your CloudGreet system is now fully operational with:
- ✅ All APIs working properly
- ✅ Professional error handling
- ✅ Real-time analytics
- ✅ Secure authentication
- ✅ Production-ready code

**Start accepting calls and bookings from your customers!** 🚀
