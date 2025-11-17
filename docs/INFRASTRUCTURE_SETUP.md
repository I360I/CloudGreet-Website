# Infrastructure Setup Guide

## Overview

This document outlines the infrastructure requirements for production deployment of CloudGreet. Some features require external services that need to be configured separately.

## Required Infrastructure

### 1. Redis (For Rate Limiting & Caching) ⚠️ CRITICAL

**Current Status:** Rate limiting uses in-memory storage (won't work in serverless/Vercel)

**Why Needed:**
- Rate limiting state is lost on serverless function restarts
- Multiple serverless instances don't share rate limit state
- In-memory cache is lost between requests

**Options:**

#### Option A: Vercel Edge Config (Recommended for Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Create Edge Config
vercel edge-config create cloudgreet-rate-limits

# Set environment variable
vercel env add EDGE_CONFIG_URL
```

**Update Code:**
- Modify `lib/rate-limiting.ts` to use Vercel Edge Config instead of Map
- Use `@vercel/edge-config` package

#### Option B: Upstash Redis (Serverless Redis)
```bash
# Sign up at https://upstash.com
# Create Redis database
# Get connection URL
```

**Environment Variables:**
```bash
REDIS_URL=redis://default:password@host:port
REDIS_REST_URL=https://host.upstash.io
REDIS_REST_TOKEN=your_token
```

**Update Code:**
- Install: `npm install @upstash/redis`
- Modify `lib/rate-limiting.ts` to use Upstash Redis
- Update `lib/cache/redis-cache.ts` to use Upstash

#### Option C: Redis Cloud / AWS ElastiCache
- Traditional Redis setup
- Requires VPC configuration for Vercel
- More complex but more control

**Priority:** HIGH - Rate limiting is currently broken in production serverless

---

### 2. Background Job Queue ⚠️ IMPORTANT

**Current Status:** Email, SMS, and webhook processing run synchronously

**Why Needed:**
- Email sending can timeout (>10s)
- SMS sending can fail and needs retry
- Webhook processing should be async
- Better user experience (don't wait for email)

**Options:**

#### Option A: Vercel Cron Jobs + Database Queue
```sql
-- Create jobs table
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX idx_jobs_status_created ON background_jobs(status, created_at);
```

**Create API Route:** `/api/cron/process-jobs`
- Runs every minute via Vercel Cron
- Processes pending jobs
- Retries failed jobs

#### Option B: Inngest (Recommended)
```bash
npm install inngest
```

**Benefits:**
- Built for serverless
- Automatic retries
- Webhook support
- Free tier available

**Setup:**
1. Sign up at https://inngest.com
2. Add environment variable: `INNGEST_EVENT_KEY`
3. Create functions in `app/api/inngest/` directory

#### Option C: BullMQ + Redis
- Requires Redis (see above)
- More complex setup
- Better for high-volume

**Priority:** MEDIUM - Current implementation works but can timeout

---

### 3. Monitoring & Alerting ✅ PARTIALLY CONFIGURED

**Current Status:** 
- Sentry integration exists but needs DSN
- Custom logging exists
- No alerting configured

**Setup Sentry:**
```bash
# Get DSN from https://sentry.io
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=cloudgreet
```

**Setup Alerting:**
- Configure Slack webhook in `lib/alerting.ts`
- Set `SLACK_WEBHOOK_URL` environment variable
- Configure email alerts (optional)

**Priority:** LOW - Can add after launch

---

### 4. Database Connection Pooling ✅ HANDLED BY SUPABASE

**Current Status:** Supabase handles connection pooling automatically

**No Action Needed** - Supabase manages this

---

## Migration Priority

### Phase 1 (Before Launch) - CRITICAL
1. ✅ **Redis for Rate Limiting** - Rate limiting is broken without it
   - Estimated time: 1-2 hours
   - Cost: Free tier available (Upstash/Vercel Edge Config)

### Phase 2 (Week 1) - IMPORTANT  
2. ⚠️ **Background Job Queue** - Prevents timeouts
   - Estimated time: 4-6 hours
   - Cost: Free tier available (Inngest)

### Phase 3 (Month 1) - NICE TO HAVE
3. 📊 **Enhanced Monitoring** - Better observability
   - Estimated time: 2-3 hours
   - Cost: Free tier available (Sentry)

---

## Quick Start: Upstash Redis (Recommended)

1. **Sign up:** https://upstash.com
2. **Create database:** Choose region closest to your Vercel region
3. **Get credentials:** Copy REST URL and token
4. **Add to Vercel:**
   ```bash
   vercel env add REDIS_REST_URL
   vercel env add REDIS_REST_TOKEN
   ```
5. **Install package:**
   ```bash
   npm install @upstash/redis
   ```
6. **Update code:** See `lib/rate-limiting-redis.ts` (to be created)

---

## Cost Estimates

### Free Tier (Suitable for MVP)
- **Upstash Redis:** 10,000 commands/day free
- **Vercel Edge Config:** 100 reads/sec free
- **Inngest:** 25,000 events/month free
- **Sentry:** 5,000 events/month free

### Paid Tier (Scale)
- **Upstash Redis:** $0.20 per 100K commands
- **Inngest:** $20/month for 1M events
- **Sentry:** $26/month for 50K events

**Total MVP Cost:** $0/month (free tiers)
**Total Scale Cost:** ~$50-100/month

---

## Implementation Checklist

- [ ] Choose Redis provider (Upstash recommended)
- [ ] Set up Redis database
- [ ] Update `lib/rate-limiting.ts` to use Redis
- [ ] Test rate limiting with multiple requests
- [ ] Choose job queue provider (Inngest recommended)
- [ ] Set up job queue
- [ ] Move email sending to background jobs
- [ ] Move SMS sending to background jobs
- [ ] Test job processing
- [ ] Set up Sentry (optional)
- [ ] Configure alerting (optional)

---

## Notes

- **Rate limiting is currently broken** in production without Redis
- **Email/SMS can timeout** without job queue (but will still work most of the time)
- **All other features work** without additional infrastructure
- **Free tiers are sufficient** for MVP/early stage




## Overview

This document outlines the infrastructure requirements for production deployment of CloudGreet. Some features require external services that need to be configured separately.

## Required Infrastructure

### 1. Redis (For Rate Limiting & Caching) ⚠️ CRITICAL

**Current Status:** Rate limiting uses in-memory storage (won't work in serverless/Vercel)

**Why Needed:**
- Rate limiting state is lost on serverless function restarts
- Multiple serverless instances don't share rate limit state
- In-memory cache is lost between requests

**Options:**

#### Option A: Vercel Edge Config (Recommended for Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Create Edge Config
vercel edge-config create cloudgreet-rate-limits

# Set environment variable
vercel env add EDGE_CONFIG_URL
```

**Update Code:**
- Modify `lib/rate-limiting.ts` to use Vercel Edge Config instead of Map
- Use `@vercel/edge-config` package

#### Option B: Upstash Redis (Serverless Redis)
```bash
# Sign up at https://upstash.com
# Create Redis database
# Get connection URL
```

**Environment Variables:**
```bash
REDIS_URL=redis://default:password@host:port
REDIS_REST_URL=https://host.upstash.io
REDIS_REST_TOKEN=your_token
```

**Update Code:**
- Install: `npm install @upstash/redis`
- Modify `lib/rate-limiting.ts` to use Upstash Redis
- Update `lib/cache/redis-cache.ts` to use Upstash

#### Option C: Redis Cloud / AWS ElastiCache
- Traditional Redis setup
- Requires VPC configuration for Vercel
- More complex but more control

**Priority:** HIGH - Rate limiting is currently broken in production serverless

---

### 2. Background Job Queue ⚠️ IMPORTANT

**Current Status:** Email, SMS, and webhook processing run synchronously

**Why Needed:**
- Email sending can timeout (>10s)
- SMS sending can fail and needs retry
- Webhook processing should be async
- Better user experience (don't wait for email)

**Options:**

#### Option A: Vercel Cron Jobs + Database Queue
```sql
-- Create jobs table
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX idx_jobs_status_created ON background_jobs(status, created_at);
```

**Create API Route:** `/api/cron/process-jobs`
- Runs every minute via Vercel Cron
- Processes pending jobs
- Retries failed jobs

#### Option B: Inngest (Recommended)
```bash
npm install inngest
```

**Benefits:**
- Built for serverless
- Automatic retries
- Webhook support
- Free tier available

**Setup:**
1. Sign up at https://inngest.com
2. Add environment variable: `INNGEST_EVENT_KEY`
3. Create functions in `app/api/inngest/` directory

#### Option C: BullMQ + Redis
- Requires Redis (see above)
- More complex setup
- Better for high-volume

**Priority:** MEDIUM - Current implementation works but can timeout

---

### 3. Monitoring & Alerting ✅ PARTIALLY CONFIGURED

**Current Status:** 
- Sentry integration exists but needs DSN
- Custom logging exists
- No alerting configured

**Setup Sentry:**
```bash
# Get DSN from https://sentry.io
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=cloudgreet
```

**Setup Alerting:**
- Configure Slack webhook in `lib/alerting.ts`
- Set `SLACK_WEBHOOK_URL` environment variable
- Configure email alerts (optional)

**Priority:** LOW - Can add after launch

---

### 4. Database Connection Pooling ✅ HANDLED BY SUPABASE

**Current Status:** Supabase handles connection pooling automatically

**No Action Needed** - Supabase manages this

---

## Migration Priority

### Phase 1 (Before Launch) - CRITICAL
1. ✅ **Redis for Rate Limiting** - Rate limiting is broken without it
   - Estimated time: 1-2 hours
   - Cost: Free tier available (Upstash/Vercel Edge Config)

### Phase 2 (Week 1) - IMPORTANT  
2. ⚠️ **Background Job Queue** - Prevents timeouts
   - Estimated time: 4-6 hours
   - Cost: Free tier available (Inngest)

### Phase 3 (Month 1) - NICE TO HAVE
3. 📊 **Enhanced Monitoring** - Better observability
   - Estimated time: 2-3 hours
   - Cost: Free tier available (Sentry)

---

## Quick Start: Upstash Redis (Recommended)

1. **Sign up:** https://upstash.com
2. **Create database:** Choose region closest to your Vercel region
3. **Get credentials:** Copy REST URL and token
4. **Add to Vercel:**
   ```bash
   vercel env add REDIS_REST_URL
   vercel env add REDIS_REST_TOKEN
   ```
5. **Install package:**
   ```bash
   npm install @upstash/redis
   ```
6. **Update code:** See `lib/rate-limiting-redis.ts` (to be created)

---

## Cost Estimates

### Free Tier (Suitable for MVP)
- **Upstash Redis:** 10,000 commands/day free
- **Vercel Edge Config:** 100 reads/sec free
- **Inngest:** 25,000 events/month free
- **Sentry:** 5,000 events/month free

### Paid Tier (Scale)
- **Upstash Redis:** $0.20 per 100K commands
- **Inngest:** $20/month for 1M events
- **Sentry:** $26/month for 50K events

**Total MVP Cost:** $0/month (free tiers)
**Total Scale Cost:** ~$50-100/month

---

## Implementation Checklist

- [ ] Choose Redis provider (Upstash recommended)
- [ ] Set up Redis database
- [ ] Update `lib/rate-limiting.ts` to use Redis
- [ ] Test rate limiting with multiple requests
- [ ] Choose job queue provider (Inngest recommended)
- [ ] Set up job queue
- [ ] Move email sending to background jobs
- [ ] Move SMS sending to background jobs
- [ ] Test job processing
- [ ] Set up Sentry (optional)
- [ ] Configure alerting (optional)

---

## Notes

- **Rate limiting is currently broken** in production without Redis
- **Email/SMS can timeout** without job queue (but will still work most of the time)
- **All other features work** without additional infrastructure
- **Free tiers are sufficient** for MVP/early stage


