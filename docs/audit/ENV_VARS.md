# CloudGreet Environment Variables Audit

## 🔐 Critical Environment Variables

### Database Configuration
| Variable | Purpose | Where Used | Default | Risk if Missing |
|----------|---------|-------------|---------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `lib/supabase.ts` | None | **CRITICAL** - App won't connect to database |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `lib/supabase.ts` | None | **CRITICAL** - Database queries will fail |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `lib/supabase.ts` | None | **CRITICAL** - Admin operations will fail |

### Authentication
| Variable | Purpose | Where Used | Default | Risk if Missing |
|----------|---------|-------------|---------|------------------|
| `JWT_SECRET` | JWT signing secret | `app/api/auth/*` | None | **CRITICAL** - Authentication will fail |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Admin dashboard password | `app/api/admin/auth/route.ts` | None | **HIGH** - Admin access will fail |

### Payment Processing
| Variable | Purpose | Where Used | Default | Risk if Missing |
|----------|---------|-------------|---------|------------------|
| `STRIPE_SECRET_KEY` | Stripe secret key | `app/api/stripe/*` | None | **CRITICAL** - Payment processing will fail |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Frontend components | None | **HIGH** - Payment forms won't work |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `app/api/stripe/webhook/route.ts` | None | **HIGH** - Webhook verification will fail |

### Telephony Integration
| Variable | Purpose | Where Used | Default | Risk if Missing |
|----------|---------|-------------|---------|------------------|
| `TELYNX_API_KEY` | Telnyx API key | `app/api/telnyx/*` | None | **CRITICAL** - Phone/SMS features won't work |
| `TELYNX_CONNECTION_ID` | Telnyx connection ID | `app/api/telnyx/*` | None | **CRITICAL** - Phone calls will fail |
| `TELYNX_MESSAGING_PROFILE_ID` | Telnyx messaging profile | `app/api/telnyx/*` | None | **HIGH** - SMS features will fail |

### AI Integration
| Variable | Purpose | Where Used | Default | Risk if Missing |
|----------|---------|-------------|---------|------------------|
| `OPENAI_API_KEY` | OpenAI API key | `app/api/ai/*` | None | **HIGH** - AI features will fail |

### Email Configuration
| Variable | Purpose | Where Used | Default | Risk if Missing |
|----------|---------|-------------|---------|------------------|
| `SMTP_HOST` | SMTP server host | `lib/email.ts` | None | **HIGH** - Email notifications will fail |
| `SMTP_PORT` | SMTP server port | `lib/email.ts` | 587 | **MEDIUM** - May use wrong port |
| `SMTP_USER` | SMTP username | `lib/email.ts` | None | **HIGH** - Email authentication will fail |
| `SMTP_PASS` | SMTP password | `lib/email.ts` | None | **HIGH** - Email authentication will fail |
| `SMTP_FROM` | From email address | `lib/email.ts` | None | **MEDIUM** - Emails may be rejected |

### Application URLs
| Variable | Purpose | Where Used | Default | Risk if Missing |
|----------|---------|-------------|---------|------------------|
| `NEXT_PUBLIC_BASE_URL` | Base URL for the app | Multiple locations | `http://localhost:3000` | **MEDIUM** - Links may be incorrect |
| `NEXT_PUBLIC_APP_URL` | App URL for redirects | `app/api/auth/*` | `http://localhost:3000` | **MEDIUM** - Redirects may fail |

### Google Calendar Integration
| Variable | Purpose | Where Used | Default | Risk if Missing |
|----------|---------|-------------|---------|------------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `app/api/calendar/*` | None | **MEDIUM** - Calendar integration will fail |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `app/api/calendar/*` | None | **MEDIUM** - Calendar integration will fail |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI | `app/api/calendar/*` | None | **MEDIUM** - OAuth flow will fail |

### Monitoring and Analytics
| Variable | Purpose | Where Used | Default | Risk if Missing |
|----------|---------|-------------|---------|------------------|
| `SENTRY_DSN` | Sentry error tracking | `lib/monitoring.ts` | None | **LOW** - Error tracking will be disabled |
| `ANALYTICS_ID` | Analytics tracking ID | Frontend components | None | **LOW** - Analytics will be disabled |

## 🚨 Current Status

### ✅ Configured Variables
- `NEXT_PUBLIC_SUPABASE_URL` - ✅ Set
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - ✅ Set
- `SUPABASE_SERVICE_ROLE_KEY` - ✅ Set
- `JWT_SECRET` - ✅ Set
- `TELYNX_API_KEY` - ✅ Set
- `TELYNX_CONNECTION_ID` - ✅ Set
- `TELYNX_MESSAGING_PROFILE_ID` - ✅ Set
- `OPENAI_API_KEY` - ✅ Set
- `NEXT_PUBLIC_BASE_URL` - ✅ Set
- `NEXT_PUBLIC_APP_URL` - ✅ Set

### ❌ Missing Critical Variables
- `STRIPE_SECRET_KEY` - **CRITICAL** - Payment processing will fail
- `STRIPE_PUBLISHABLE_KEY` - **HIGH** - Payment forms won't work
- `STRIPE_WEBHOOK_SECRET` - **HIGH** - Webhook verification will fail
- `SMTP_HOST` - **HIGH** - Email notifications will fail
- `SMTP_USER` - **HIGH** - Email authentication will fail
- `SMTP_PASS` - **HIGH** - Email authentication will fail

### ⚠️ Partially Configured
- `SMTP_FROM` - Set but may need verification
- `GOOGLE_CLIENT_ID` - Empty in env.local
- `GOOGLE_CLIENT_SECRET` - Not set
- `GOOGLE_REDIRECT_URI` - Not set

## 🔧 Required Actions

### Immediate (Before Launch)
1. **Configure Stripe Variables**
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Configure Email Variables**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@cloudgreet.com
   ```

3. **Configure Google Calendar (Optional)**
   ```bash
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://cloudgreet.com/api/calendar/callback
   ```

### Production Environment
1. **Use Production Stripe Keys**
   - Replace test keys with live keys
   - Update webhook endpoints
   - Test payment processing

2. **Use Production Email Service**
   - Configure production SMTP
   - Set up email templates
   - Test email delivery

3. **Configure Monitoring**
   ```bash
   SENTRY_DSN=https://your-sentry-dsn
   ANALYTICS_ID=your-analytics-id
   ```

## 🛡️ Security Considerations

### High-Risk Variables
- `JWT_SECRET` - Must be cryptographically secure
- `STRIPE_SECRET_KEY` - Never expose in client-side code
- `SUPABASE_SERVICE_ROLE_KEY` - Has admin access to database
- `TELYNX_API_KEY` - Can make phone calls and send SMS

### Medium-Risk Variables
- `SMTP_PASS` - Email account password
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `OPENAI_API_KEY` - Can incur API costs

### Low-Risk Variables
- `NEXT_PUBLIC_*` - Safe to expose in client-side code
- `SMTP_HOST` - Public information
- `ANALYTICS_ID` - Public tracking ID

## 📋 Environment Validation

### Startup Validation
```typescript
// Add to app startup
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'TELYNX_API_KEY'
]

const missingVars = requiredVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
}
```

### Runtime Validation
- Check database connectivity on startup
- Validate Stripe API key on startup
- Test email configuration
- Verify Telnyx API access

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All critical variables configured
- [ ] Production values used (not test values)
- [ ] Environment validation passes
- [ ] No sensitive data in logs
- [ ] Backup of environment configuration

### Post-Deployment
- [ ] Verify all integrations work
- [ ] Check error logs for missing variables
- [ ] Test all external service connections
- [ ] Monitor for configuration-related errors

## 📞 Emergency Contacts

**Database Issues:** Supabase Support
**Payment Issues:** Stripe Support
**Telephony Issues:** Telnyx Support
**Email Issues:** SMTP Provider Support
**General Issues:** DevOps Team
