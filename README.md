# 🎉 **CloudGreet - AI Voice SaaS Platform**

> **Complete multi-tenant SaaS platform where businesses can get their own AI voice assistants with automated phone calls, calendar booking, and payment processing.**

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-green.svg)](https://github.com/your-repo)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.32-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg)](https://supabase.com/)

---

## 🚀 **Quick Start**

### **1. Install & Setup**
```bash
# Clone the repository
git clone https://github.com/your-username/cloudgreet.git
cd cloudgreet

# Install dependencies
npm install

# Run interactive setup
npm run setup

# Start development server
npm run dev
```

### **2. Test Everything**
```bash
# Test all APIs
npm test

# Visit your app
open http://localhost:3000
```

**That's it! Your SaaS platform is ready for clients to sign up! 🎉**

---

## ✨ **What CloudGreet Does**

### **🤖 AI Voice Agents**
- Create custom voice assistants for your business
- Natural conversation with customers
- Automated call handling and routing
- Voice synthesis with Azure Speech Services

### **📞 Phone Integration**
- Automated phone number purchasing
- Direct integration with voice agents
- Call logging and analytics
- Multi-tenant phone management

### **📅 Calendar Booking**
- Automatic appointment scheduling
- Google Calendar integration
- Customer booking management
- Reminder notifications

### **💳 Payment Processing**
- Stripe integration for billing
- Automated payment collection
- Subscription management
- Revenue tracking

### **📧 Email Automation**
- Welcome emails for new customers
- Booking confirmations
- Automated follow-ups
- Smart notification system

### **📊 Analytics Dashboard**
- Real-time call statistics
- Revenue tracking
- Customer analytics
- Performance metrics

---

## 🏗️ **Architecture**

### **Frontend**
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons

### **Backend**
- **Next.js API Routes** for backend logic
- **NextAuth.js** for authentication
- **Supabase** for database and auth
- **Stripe** for payments

### **AI & Voice**
- **Azure Speech Services** for voice synthesis
- **Azure Communication Services** for phone
- **Custom conversation scripts** for business logic

### **Integrations**
- **Google Calendar API** for scheduling
- **Resend** for email services
- **ElevenLabs** (optional) for enhanced voice

---

## 📋 **API Endpoints**

### **Authentication**
```
POST /api/auth/register     # User registration
POST /api/auth/login        # User login
```

### **Voice Agents**
```
POST /api/create-azure-voice-agent    # Create AI voice agent
POST /api/azure-phone-integration     # Purchase phone number
```

### **Calendar**
```
POST /api/calendar/google-calendar     # Google Calendar integration
POST /api/calendar/universal-calendar  # Universal calendar booking
```

### **Payments**
```
POST /api/stripe/create-customer      # Create Stripe customer
POST /api/stripe/create-subscription  # Create subscription
POST /api/stripe/charge-booking       # Charge for appointments
```

### **Email**
```
POST /api/send-onboarding             # Send welcome emails
POST /api/notifications/smart         # Smart notifications
```

### **Analytics**
```
GET  /api/analytics/stats            # Dashboard statistics
GET  /api/analytics/recent-activity  # Recent activity feed
```

### **Automation**
```
POST /api/automated-onboarding       # Complete setup automation
```

---

## 🔧 **Configuration**

### **Required Services**
1. **Supabase** - Database and authentication
2. **Stripe** - Payment processing
3. **Resend** - Email services
4. **Azure** - Voice services and phone numbers
5. **Google Calendar** - Calendar integration

### **Environment Variables**
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
NEXTAUTH_URL=your-domain
NEXTAUTH_SECRET=your-secret

# Payments
STRIPE_SECRET_KEY=sk_live_your-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret

# Email
RESEND_API_KEY=re_your-key

# Voice Services
AZURE_COMMUNICATION_CONNECTION_STRING=your-connection-string
AZURE_COMMUNICATION_RESOURCE_NAME=your-resource-name
AZURE_SPEECH_KEY=your-speech-key
AZURE_SPEECH_REGION=eastus

# Calendar
GOOGLE_CALENDAR_API_KEY=your-google-key
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CALENDAR_CLIENT_EMAIL=your-service-account
GOOGLE_CALENDAR_ID=your-calendar-id
```

---

## 🚀 **Deployment**

### **Vercel (Recommended)**
```bash
# Deploy to Vercel
npx vercel

# Set environment variables in Vercel dashboard
# Deploy!
```

### **Other Platforms**
- **Netlify** - Static site hosting
- **Railway** - Full-stack deployment
- **DigitalOcean** - VPS deployment
- **AWS** - Cloud deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 📚 **Documentation**

- **[Quick Start Guide](./QUICK_START_GUIDE.md)** - Get up and running in 5 minutes
- **[Environment Setup](./ENVIRONMENT_SETUP.md)** - Complete API key configuration
- **[Azure Setup Guide](./AZURE_COMPLETE_SETUP_GUIDE.md)** - Azure services setup
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Production deployment
- **[Production Status](./FINAL_PRODUCTION_STATUS.md)** - Production readiness report

---

## 🧪 **Testing**

### **API Testing**
```bash
# Test all APIs
npm test

# Test specific endpoint
curl -X POST http://localhost:3000/api/system-status
```

### **Manual Testing**
1. Register a new user
2. Create a voice agent
3. Purchase a phone number
4. Test calendar integration
5. Process a payment
6. Check analytics dashboard

---

## 🔒 **Security**

- ✅ **Row Level Security** on all database tables
- ✅ **CSRF Protection** on all forms
- ✅ **Secure Headers** for all responses
- ✅ **Input Validation** on all API endpoints
- ✅ **Authentication Required** for sensitive operations
- ✅ **Environment Variable Validation** for all services

---

## 📊 **Monitoring**

### **Health Checks**
- Visit `/api/system-status` for service health
- Monitor error rates and response times
- Set up alerts for service failures

### **Analytics**
- Real-time dashboard at `/dashboard`
- Call logs and statistics
- Revenue tracking
- User activity monitoring

---

## 🆘 **Troubleshooting**

### **Common Issues**

1. **"Service not configured" errors**
   ```bash
   # Run setup script
   npm run setup
   ```

2. **Database connection errors**
   - Verify Supabase URL and keys
   - Run database setup script
   - Check Row Level Security policies

3. **Authentication issues**
   - Verify NextAuth configuration
   - Check NEXTAUTH_SECRET is set
   - Ensure NEXTAUTH_URL matches your domain

### **Getting Help**
- Check the logs in your terminal
- Visit `/api/system-status` for service health
- Run `npm test` to test all endpoints
- Review the documentation guides

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎯 **Roadmap**

- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] White-label solution
- [ ] Enterprise features

---

## 🙏 **Acknowledgments**

- **Next.js** for the amazing framework
- **Supabase** for the database and auth
- **Stripe** for payment processing
- **Azure** for voice services
- **Vercel** for deployment platform

---

## 📞 **Support**

- **Documentation**: Check the guides in this repository
- **Issues**: Open an issue on GitHub
- **Email**: support@cloudgreet.com

---

**Built with ❤️ for businesses who want to automate their customer communication.**

**Ready to transform your business with AI? [Get started now!](#-quick-start)** 🚀