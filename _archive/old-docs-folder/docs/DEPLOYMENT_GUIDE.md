# CloudGreet Deployment Guide

## Pre-Deployment Checklist

### Environment Variables
Ensure all required environment variables are set in Vercel:

#### Database
- `DATABASE_URL` - Supabase connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

#### Authentication
- `JWT_SECRET` - Secret key for JWT tokens (generate: `openssl rand -base64 32`)
- `NEXTAUTH_SECRET` - NextAuth secret (generate: `openssl rand -base64 32`)

#### External Services
- `TELNYX_API_KEY` - Telnyx API key
- `TELNYX_CONNECTION_ID` - Telnyx connection ID
- `TELNYX_PHONE_NUMBER` - Telnyx phone number (optional)
- `RETELL_API_KEY` - Retell AI API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

#### Application
- `NEXT_PUBLIC_BASE_URL` - Production URL (e.g., `https://cloudgreet.com`)
- `NEXT_PUBLIC_APP_URL` - Same as BASE_URL
- `NODE_ENV` - Set to `production`

#### Optional (for enhanced features)
- `REDIS_REST_URL` - Upstash Redis REST URL
- `REDIS_REST_TOKEN` - Upstash Redis token
- `SLACK_WEBHOOK_URL` - Slack webhook for alerts
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN for error tracking
- `CRON_SECRET` - Secret for cron job authentication

### Database Setup

1. **Run Migrations**
   ```sql
   -- Run all migration files in order:
   -- migrations/ADD_OPTIMIZATION_FUNCTIONS.sql
   -- migrations/ADD_TRANSACTION_FUNCTIONS.sql
   -- migrations/ADD_JOB_QUEUE.sql
   ```
   
   **Important:** The transaction functions (`create_appointment_safe`, `process_payment_safe`, `complete_onboarding_safe`) are critical for data integrity. These functions ensure atomic operations with automatic rollback on errors and compliance event logging.
   
   **Verification:**
   ```sql
   -- Verify transaction functions exist
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('create_appointment_safe', 'process_payment_safe', 'complete_onboarding_safe');
   ```

2. **Create Admin Account**
   ```sql
   -- Run CREATE_ADMIN_ACCOUNT.sql
   -- Or use Supabase dashboard to create admin user
   ```

3. **Seed Toll-Free Numbers**
   ```sql
   INSERT INTO toll_free_numbers (number, status) VALUES
   ('+18001234567', 'available'),
   ('+18001234568', 'available'),
   -- Add more numbers as needed
   ```

### Vercel Deployment

1. **Connect Repository**
   - Push code to GitHub
   - Import project in Vercel
   - Connect repository

2. **Configure Build Settings**
   - Framework Preset: Next.js
   - Build Command: `npm run build` or `pnpm build`
   - Output Directory: `.next` (default)
   - Install Command: `npm install` or `pnpm install`

3. **Set Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add all required variables (see above)
   - Set for Production, Preview, and Development

4. **Configure Domains**
   - Add custom domain: `cloudgreet.com`
   - Configure DNS records as instructed
   - Enable SSL (automatic with Vercel)

5. **Deploy**
   - Push to `main` branch triggers production deploy
   - Or manually deploy from Vercel dashboard

### Post-Deployment Verification

1. **Health Check**
   ```bash
   curl https://cloudgreet.com/api/health
   # Should return: {"status":"ok"}
   ```

2. **Test Landing Page**
   - Visit: https://cloudgreet.com
   - Verify page loads
   - Test "Call Now" button

3. **Test Registration**
   - Register new account
   - Verify email confirmation (if enabled)
   - Complete onboarding

4. **Test Admin Login**
   - Login at: https://cloudgreet.com/admin/login
   - Verify admin dashboard loads

5. **Test Webhooks**
   - Stripe: Configure webhook URL in Stripe dashboard
   - Retell: Configure webhook URL in Retell dashboard
   - Telnyx: Configure webhook URL in Telnyx dashboard

### Cron Jobs Setup

1. **Vercel Cron Jobs**
   - Go to Project Settings > Cron Jobs
   - Add cron job:
     - Path: `/api/cron/process-jobs`
     - Schedule: `0 * * * *` (every hour) or `*/5 * * * *` (every 5 minutes) for faster processing
     - Secret: Set `CRON_SECRET` environment variable
   
   **Note:** The job queue processes background tasks like email and SMS sending. Jobs are queued when:
   - Contact form submissions are made
   - Admin sends messages to clients
   - SMS messages are sent via API
   
   **Job Types:**
   - `send_email` - Email notifications (contact forms, admin messages)
   - `send_sms` - SMS messages (manual sends, admin messages)
   - `process_webhook` - Webhook processing
   - `sync_calendar` - Calendar synchronization
   - `generate_report` - Report generation
   - `cleanup_old_data` - Data cleanup

2. **Verify Cron Jobs**
   - Check Vercel logs for cron job execution
   - Verify jobs are being processed:
   ```sql
   -- Check pending jobs
   SELECT COUNT(*) FROM background_jobs WHERE status = 'pending';
   
   -- Check failed jobs
   SELECT * FROM background_jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
   ```

### Monitoring Setup

1. **Sentry (Optional)**
   - Sign up at https://sentry.io
   - Create project
   - Add `NEXT_PUBLIC_SENTRY_DSN` to environment variables
   - Install: `npm install @sentry/nextjs`
   - Configure in `next.config.js`

2. **Slack Alerts (Optional)**
   - Create Slack app
   - Create incoming webhook
   - Add `SLACK_WEBHOOK_URL` to environment variables

3. **Vercel Analytics**
   - Enable in Project Settings > Analytics
   - View metrics in Vercel dashboard

### Redis Setup (Required for Production)

**Why Redis?** Rate limiting uses Redis for distributed rate limiting across serverless functions. Without Redis, rate limiting falls back to in-memory storage which doesn't work across multiple function instances.

1. **Upstash Redis (Recommended for Serverless)**
   - Sign up at https://upstash.com
   - Create Redis database
   - Copy REST URL and token
   - Add to environment variables:
     - `REDIS_REST_URL` - e.g., `https://your-redis.upstash.io`
     - `REDIS_REST_TOKEN` - Your Upstash token
   - Install dependency: `npm install @upstash/redis`
   
   **Note:** The application automatically uses Redis if `REDIS_REST_URL` and `REDIS_REST_TOKEN` are set. If not configured, it falls back to in-memory rate limiting (not suitable for production).

2. **Verify Redis Connection**
   ```bash
   # Check health endpoint
   curl https://cloudgreet.com/api/health
   # Should show Redis status in response
   ```

3. **Rate Limiting Configuration**
   - **Strict:** 5 requests per 15 minutes (public call initiation)
   - **Auth:** 10 requests per 15 minutes (login/register)
   - **Moderate:** 100 requests per 15 minutes (contact forms, general APIs)
   - **Lenient:** 1000 requests per 15 minutes (internal APIs)

### Rollback Procedure

If deployment fails:

1. **Vercel Rollback**
   - Go to Deployments
   - Find last working deployment
   - Click "..." > "Promote to Production"

2. **Database Rollback**
   - If migrations caused issues, rollback:
   ```sql
   -- Rollback specific migration
   DROP FUNCTION IF EXISTS function_name;
   ```

3. **Environment Variable Rollback**
   - Revert environment variable changes in Vercel
   - Redeploy

### Troubleshooting

#### Build Failures
- Check build logs in Vercel
- Verify all dependencies in `package.json`
- Check for TypeScript errors: `npm run type-check`

#### Runtime Errors
- Check function logs in Vercel
- Verify environment variables are set
- Check database connectivity

#### Webhook Failures
- Verify webhook URLs are correct
- Check webhook signatures
- Review webhook logs

#### Performance Issues
- Enable Redis for rate limiting
- Check database query performance
- Review Vercel Analytics

### Support

For deployment issues:
- Check Vercel documentation: https://vercel.com/docs
- Review application logs in Vercel dashboard
- Contact support: founders@cloudgreet.com


## Pre-Deployment Checklist

### Environment Variables
Ensure all required environment variables are set in Vercel:

#### Database
- `DATABASE_URL` - Supabase connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

#### Authentication
- `JWT_SECRET` - Secret key for JWT tokens (generate: `openssl rand -base64 32`)
- `NEXTAUTH_SECRET` - NextAuth secret (generate: `openssl rand -base64 32`)

#### External Services
- `TELNYX_API_KEY` - Telnyx API key
- `TELNYX_CONNECTION_ID` - Telnyx connection ID
- `TELNYX_PHONE_NUMBER` - Telnyx phone number (optional)
- `RETELL_API_KEY` - Retell AI API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

#### Application
- `NEXT_PUBLIC_BASE_URL` - Production URL (e.g., `https://cloudgreet.com`)
- `NEXT_PUBLIC_APP_URL` - Same as BASE_URL
- `NODE_ENV` - Set to `production`

#### Optional (for enhanced features)
- `REDIS_REST_URL` - Upstash Redis REST URL
- `REDIS_REST_TOKEN` - Upstash Redis token
- `SLACK_WEBHOOK_URL` - Slack webhook for alerts
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN for error tracking
- `CRON_SECRET` - Secret for cron job authentication

### Database Setup

1. **Run Migrations**
   ```sql
   -- Run all migration files in order:
   -- migrations/ADD_OPTIMIZATION_FUNCTIONS.sql
   -- migrations/ADD_TRANSACTION_FUNCTIONS.sql
   -- migrations/ADD_JOB_QUEUE.sql
   ```
   
   **Important:** The transaction functions (`create_appointment_safe`, `process_payment_safe`, `complete_onboarding_safe`) are critical for data integrity. These functions ensure atomic operations with automatic rollback on errors and compliance event logging.
   
   **Verification:**
   ```sql
   -- Verify transaction functions exist
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('create_appointment_safe', 'process_payment_safe', 'complete_onboarding_safe');
   ```

2. **Create Admin Account**
   ```sql
   -- Run CREATE_ADMIN_ACCOUNT.sql
   -- Or use Supabase dashboard to create admin user
   ```

3. **Seed Toll-Free Numbers**
   ```sql
   INSERT INTO toll_free_numbers (number, status) VALUES
   ('+18001234567', 'available'),
   ('+18001234568', 'available'),
   -- Add more numbers as needed
   ```

### Vercel Deployment

1. **Connect Repository**
   - Push code to GitHub
   - Import project in Vercel
   - Connect repository

2. **Configure Build Settings**
   - Framework Preset: Next.js
   - Build Command: `npm run build` or `pnpm build`
   - Output Directory: `.next` (default)
   - Install Command: `npm install` or `pnpm install`

3. **Set Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add all required variables (see above)
   - Set for Production, Preview, and Development

4. **Configure Domains**
   - Add custom domain: `cloudgreet.com`
   - Configure DNS records as instructed
   - Enable SSL (automatic with Vercel)

5. **Deploy**
   - Push to `main` branch triggers production deploy
   - Or manually deploy from Vercel dashboard

### Post-Deployment Verification

1. **Health Check**
   ```bash
   curl https://cloudgreet.com/api/health
   # Should return: {"status":"ok"}
   ```

2. **Test Landing Page**
   - Visit: https://cloudgreet.com
   - Verify page loads
   - Test "Call Now" button

3. **Test Registration**
   - Register new account
   - Verify email confirmation (if enabled)
   - Complete onboarding

4. **Test Admin Login**
   - Login at: https://cloudgreet.com/admin/login
   - Verify admin dashboard loads

5. **Test Webhooks**
   - Stripe: Configure webhook URL in Stripe dashboard
   - Retell: Configure webhook URL in Retell dashboard
   - Telnyx: Configure webhook URL in Telnyx dashboard

### Cron Jobs Setup

1. **Vercel Cron Jobs**
   - Go to Project Settings > Cron Jobs
   - Add cron job:
     - Path: `/api/cron/process-jobs`
     - Schedule: `0 * * * *` (every hour) or `*/5 * * * *` (every 5 minutes) for faster processing
     - Secret: Set `CRON_SECRET` environment variable
   
   **Note:** The job queue processes background tasks like email and SMS sending. Jobs are queued when:
   - Contact form submissions are made
   - Admin sends messages to clients
   - SMS messages are sent via API
   
   **Job Types:**
   - `send_email` - Email notifications (contact forms, admin messages)
   - `send_sms` - SMS messages (manual sends, admin messages)
   - `process_webhook` - Webhook processing
   - `sync_calendar` - Calendar synchronization
   - `generate_report` - Report generation
   - `cleanup_old_data` - Data cleanup

2. **Verify Cron Jobs**
   - Check Vercel logs for cron job execution
   - Verify jobs are being processed:
   ```sql
   -- Check pending jobs
   SELECT COUNT(*) FROM background_jobs WHERE status = 'pending';
   
   -- Check failed jobs
   SELECT * FROM background_jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
   ```

### Monitoring Setup

1. **Sentry (Optional)**
   - Sign up at https://sentry.io
   - Create project
   - Add `NEXT_PUBLIC_SENTRY_DSN` to environment variables
   - Install: `npm install @sentry/nextjs`
   - Configure in `next.config.js`

2. **Slack Alerts (Optional)**
   - Create Slack app
   - Create incoming webhook
   - Add `SLACK_WEBHOOK_URL` to environment variables

3. **Vercel Analytics**
   - Enable in Project Settings > Analytics
   - View metrics in Vercel dashboard

### Redis Setup (Required for Production)

**Why Redis?** Rate limiting uses Redis for distributed rate limiting across serverless functions. Without Redis, rate limiting falls back to in-memory storage which doesn't work across multiple function instances.

1. **Upstash Redis (Recommended for Serverless)**
   - Sign up at https://upstash.com
   - Create Redis database
   - Copy REST URL and token
   - Add to environment variables:
     - `REDIS_REST_URL` - e.g., `https://your-redis.upstash.io`
     - `REDIS_REST_TOKEN` - Your Upstash token
   - Install dependency: `npm install @upstash/redis`
   
   **Note:** The application automatically uses Redis if `REDIS_REST_URL` and `REDIS_REST_TOKEN` are set. If not configured, it falls back to in-memory rate limiting (not suitable for production).

2. **Verify Redis Connection**
   ```bash
   # Check health endpoint
   curl https://cloudgreet.com/api/health
   # Should show Redis status in response
   ```

3. **Rate Limiting Configuration**
   - **Strict:** 5 requests per 15 minutes (public call initiation)
   - **Auth:** 10 requests per 15 minutes (login/register)
   - **Moderate:** 100 requests per 15 minutes (contact forms, general APIs)
   - **Lenient:** 1000 requests per 15 minutes (internal APIs)

### Rollback Procedure

If deployment fails:

1. **Vercel Rollback**
   - Go to Deployments
   - Find last working deployment
   - Click "..." > "Promote to Production"

2. **Database Rollback**
   - If migrations caused issues, rollback:
   ```sql
   -- Rollback specific migration
   DROP FUNCTION IF EXISTS function_name;
   ```

3. **Environment Variable Rollback**
   - Revert environment variable changes in Vercel
   - Redeploy

### Troubleshooting

#### Build Failures
- Check build logs in Vercel
- Verify all dependencies in `package.json`
- Check for TypeScript errors: `npm run type-check`

#### Runtime Errors
- Check function logs in Vercel
- Verify environment variables are set
- Check database connectivity

#### Webhook Failures
- Verify webhook URLs are correct
- Check webhook signatures
- Review webhook logs

#### Performance Issues
- Enable Redis for rate limiting
- Check database query performance
- Review Vercel Analytics

### Support

For deployment issues:
- Check Vercel documentation: https://vercel.com/docs
- Review application logs in Vercel dashboard
- Contact support: founders@cloudgreet.com

