# CloudGreet Production Deployment Guide

## 🚀 Production Deployment Checklist

### 1. Environment Variables Setup

Create a `.env.production` file with all required variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secure-secret-key

# Azure Speech Services
AZURE_SPEECH_KEY_1=your-azure-speech-key-1
AZURE_SPEECH_KEY_2=your-azure-speech-key-2
AZURE_SPEECH_REGION=eastus

# Azure Communication Services
AZURE_COMMUNICATION_CONNECTION_STRING=your-azure-connection-string
AZURE_COMMUNICATION_RESOURCE_NAME=your-resource-name

# Retell AI
RETELL_API_KEY=your-retell-api-key

# Resend Email
RESEND_API_KEY=your-resend-api-key

# Stripe
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
```

### 2. Database Setup

Run the complete database setup:

```sql
-- Run SUPABASE_COMPLETE_SETUP.sql in your Supabase dashboard
-- This creates all tables, indexes, and RLS policies
```

### 3. Vercel Deployment

1. **Connect to Vercel:**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Set Environment Variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   # ... add all other environment variables
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### 4. Domain Configuration

1. **Add Custom Domain:**
   - Go to Vercel Dashboard
   - Add your custom domain
   - Update DNS records

2. **Update NEXTAUTH_URL:**
   ```bash
   vercel env add NEXTAUTH_URL production
   # Enter: https://your-domain.com
   ```

### 5. SSL and Security

1. **Enable HTTPS:** Vercel automatically provides SSL
2. **Security Headers:** Already configured in `next.config.js`
3. **Rate Limiting:** Implemented in API routes

### 6. Monitoring Setup

1. **Health Check Endpoint:**
   - Available at: `https://your-domain.com/api/health`
   - Monitor system status and performance

2. **Error Monitoring:**
   - Built-in error logging in `app/lib/monitoring.ts`
   - Consider integrating Sentry for production

### 7. API Integrations

#### Azure Communication Services
1. Create Azure Communication Services resource
2. Purchase phone numbers
3. Configure call routing to webhooks

#### Retell AI
1. Create Retell AI account
2. Configure webhook endpoints
3. Test voice agent creation

#### Stripe
1. Set up Stripe account
2. Configure webhook endpoints
3. Test payment processing

### 8. Testing Production

1. **Health Check:**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Test User Registration:**
   ```bash
   curl -X POST https://your-domain.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"password123","business_name":"Test Business","business_type":"hvac","phone":"+1234567890"}'
   ```

3. **Test Phone Integration:**
   ```bash
   curl -X POST https://your-domain.com/api/azure-phone-integration \
     -H "Content-Type: application/json" \
     -d '{"business_name":"Test Business","business_type":"hvac","area_code":"555","country":"US","voice_enabled":true,"sms_enabled":true}'
   ```

### 9. Performance Optimization

1. **Database Indexing:** Already configured in setup SQL
2. **Caching:** Implemented in API routes
3. **CDN:** Vercel automatically provides global CDN
4. **Image Optimization:** Next.js automatic optimization

### 10. Backup and Recovery

1. **Database Backups:** Supabase automatic backups
2. **Code Backups:** Git repository
3. **Environment Variables:** Store securely in Vercel

## 🔧 Production Maintenance

### Daily Tasks
- Monitor health check endpoint
- Check error logs
- Verify API integrations

### Weekly Tasks
- Review performance metrics
- Update dependencies
- Test critical user flows

### Monthly Tasks
- Security audit
- Performance optimization
- Backup verification

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors:**
   - Check Supabase credentials
   - Verify RLS policies
   - Check network connectivity

2. **API Integration Failures:**
   - Verify API keys
   - Check webhook endpoints
   - Review rate limits

3. **Performance Issues:**
   - Monitor memory usage
   - Check database queries
   - Review API response times

### Support Contacts
- Supabase: support@supabase.com
- Azure: Azure Support Portal
- Retell AI: support@retellai.com
- Vercel: support@vercel.com

## 📊 Monitoring Dashboard

Access your production monitoring at:
- Health Check: `https://your-domain.com/api/health`
- System Status: `https://your-domain.com/api/system-status`
- Analytics: `https://your-domain.com/dashboard`

## 🎯 Production Readiness Checklist

- [ ] All environment variables configured
- [ ] Database schema deployed
- [ ] SSL certificate active
- [ ] Custom domain configured
- [ ] API integrations tested
- [ ] Health monitoring active
- [ ] Error logging configured
- [ ] Performance optimized
- [ ] Security headers enabled
- [ ] Backup strategy implemented

Your CloudGreet platform is now production-ready! 🚀

