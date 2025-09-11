# 🚀 **CloudGreet Deployment Guide**

## **Production Deployment Made Easy**

### **Prerequisites**
- ✅ All APIs tested and working
- ✅ Environment variables configured
- ✅ Database set up with proper tables
- ✅ All services (Stripe, Azure, etc.) configured

---

## **🎯 Deployment Options**

### **Option 1: Vercel (Recommended)**

#### **Step 1: Prepare Your Code**
```bash
# Make sure everything is committed to Git
git add .
git commit -m "Production ready CloudGreet system"
git push origin main
```

#### **Step 2: Deploy to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your CloudGreet repository
5. Configure environment variables (see below)
6. Deploy!

#### **Step 3: Set Environment Variables in Vercel**
Go to Project Settings > Environment Variables and add:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-32-character-secret

# Stripe
STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Resend
RESEND_API_KEY=re_your-resend-key

# Azure
AZURE_COMMUNICATION_CONNECTION_STRING=your-connection-string
AZURE_COMMUNICATION_RESOURCE_NAME=your-resource-name
AZURE_SPEECH_KEY=your-speech-key
AZURE_SPEECH_REGION=eastus

# Google Calendar
GOOGLE_CALENDAR_API_KEY=your-google-key
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CALENDAR_CLIENT_EMAIL=your-service-account
GOOGLE_CALENDAR_ID=your-calendar-id

# Optional
ELEVENLABS_API_KEY=your-elevenlabs-key
RETELL_API_KEY=your-retell-key
CRON_SECRET=your-cron-secret
ADMIN_PASSWORD=your-admin-password
```

---

### **Option 2: Netlify**

#### **Step 1: Build Configuration**
Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### **Step 2: Deploy**
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables in Site Settings
5. Deploy!

---

### **Option 3: Railway**

#### **Step 1: Deploy**
1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add environment variables
4. Deploy automatically!

---

## **🔧 Post-Deployment Configuration**

### **1. Update Webhook URLs**

#### **Stripe Webhooks**
1. Go to Stripe Dashboard > Webhooks
2. Update endpoint URL to: `https://your-domain.com/api/stripe/webhook`
3. Select events: `customer.created`, `payment_intent.succeeded`, `invoice.payment_succeeded`

#### **Azure Webhooks**
1. Update Azure Communication Services webhook URLs
2. Point to your production domain

### **2. Update CORS Settings**

#### **Supabase**
1. Go to Supabase Dashboard > Settings > API
2. Add your production domain to allowed origins

#### **Google Calendar**
1. Update OAuth redirect URIs
2. Add your production domain

### **3. SSL Certificates**
- Vercel: Automatic SSL
- Netlify: Automatic SSL
- Railway: Automatic SSL
- Custom domains: Configure SSL certificates

---

## **📊 Monitoring & Maintenance**

### **Health Monitoring**
- Set up monitoring for `/api/system-status`
- Monitor error rates and response times
- Set up alerts for service failures

### **Database Monitoring**
- Monitor Supabase usage and limits
- Set up database backups
- Monitor query performance

### **Performance Optimization**
- Enable Vercel Analytics
- Monitor Core Web Vitals
- Optimize images and assets

---

## **🔒 Security Checklist**

### **Environment Variables**
- ✅ All API keys are production keys (not test keys)
- ✅ Secrets are properly encrypted
- ✅ No sensitive data in code repository

### **Authentication**
- ✅ NextAuth properly configured
- ✅ Session management working
- ✅ User permissions set correctly

### **API Security**
- ✅ Rate limiting implemented
- ✅ CORS properly configured
- ✅ Input validation on all endpoints

### **Database Security**
- ✅ Row Level Security enabled
- ✅ Proper user permissions
- ✅ No sensitive data exposed

---

## **🚀 Go Live Checklist**

### **Pre-Launch**
- [ ] All APIs tested in production
- [ ] Database properly configured
- [ ] All services connected
- [ ] Error handling working
- [ ] Analytics tracking enabled
- [ ] SSL certificates active
- [ ] Domain configured
- [ ] Webhooks updated

### **Launch Day**
- [ ] Monitor system status
- [ ] Check error logs
- [ ] Verify all integrations
- [ ] Test user registration
- [ ] Test payment processing
- [ ] Test voice agent creation
- [ ] Test calendar integration

### **Post-Launch**
- [ ] Monitor performance
- [ ] Check user feedback
- [ ] Monitor error rates
- [ ] Update documentation
- [ ] Plan scaling strategy

---

## **📈 Scaling Considerations**

### **Database Scaling**
- Monitor Supabase usage
- Consider database optimization
- Plan for data archiving

### **API Scaling**
- Monitor API rate limits
- Consider caching strategies
- Plan for load balancing

### **Storage Scaling**
- Monitor file storage usage
- Plan for CDN implementation
- Consider image optimization

---

## **🆘 Troubleshooting**

### **Common Deployment Issues**

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies installed
   - Check for TypeScript errors

2. **Environment Variable Issues**
   - Verify all variables set correctly
   - Check for typos in variable names
   - Ensure production keys are used

3. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check network connectivity
   - Verify database permissions

4. **API Integration Issues**
   - Check webhook URLs
   - Verify API keys are correct
   - Check service status pages

### **Getting Help**
- Check deployment platform logs
- Monitor `/api/system-status` endpoint
- Review error logs in production
- Test individual API endpoints

---

## **🎉 You're Live!**

Your CloudGreet system is now running in production with:
- ✅ All APIs working properly
- ✅ Professional error handling
- ✅ Real-time analytics
- ✅ Secure authentication
- ✅ Scalable architecture

**Start accepting customers and growing your business!** 🚀
