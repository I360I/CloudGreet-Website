# CloudGreet - AI Receptionist SaaS Platform

**Never miss a call. Never lose a lead. 24/7 AI receptionist for service businesses.**

[![Production Ready](https://img.shields.io/badge/status-production-green)]()
[![Next.js](https://img.shields.io/badge/Next.js-14-black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)]()

## 🎯 What is CloudGreet?

CloudGreet is an AI-powered receptionist platform designed for service businesses (HVAC, Roofing, Painting). It answers calls, qualifies leads, schedules appointments, and tracks ROI automatically.

### Key Features

- ✅ **24/7 AI Phone Answering** - Never miss a call again
- ✅ **Smart Appointment Booking** - AI schedules directly to your calendar
- ✅ **Lead Qualification** - Understands urgency, location, and service needs
- ✅ **Missed Call Recovery** - Auto SMS to missed callers
- ✅ **Real-time Voice AI** - 300-600ms response time (OpenAI Realtime API)
- ✅ **Billing Integration** - $200/month + $50 per booking via Stripe
- ✅ **Google Calendar Sync** - Automatic appointment creation
- ✅ **SMS Compliance** - Full TCPA/A2P compliance with HELP/STOP handling
- ✅ **ROI Tracking** - Track calls → appointments → revenue

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account (database)
- OpenAI API key (AI)
- Telnyx account (telephony)
- Stripe account (billing)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cloudgreet.git
cd cloudgreet

# Install dependencies
npm install

# Copy environment variables
cp env.example .env.local
# Edit .env.local with your actual credentials

# Run database migrations (see DATABASE_SETUP_INSTRUCTIONS.md)

# Start development server
npm run dev
```

Visit `http://localhost:3000`

## 📋 Environment Setup

See `env.example` for all required environment variables. Critical ones:

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# AI
OPENAI_API_KEY=sk-proj-your_key

# Telephony
TELNYX_API_KEY=your_telnyx_key
TELNYX_CONNECTION_ID=your_connection_id

# Billing
STRIPE_SECRET_KEY=sk_test_your_key

# Authentication
JWT_SECRET=your_32_char_secret
```

See `ENVIRONMENT_VARIABLES_SETUP.md` for detailed setup instructions.

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** (App Router, React 18)
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations
- **TypeScript** - Type safety

### Backend
- **Next.js API Routes** - Serverless functions
- **Supabase** - PostgreSQL database + real-time
- **OpenAI GPT-4o** - AI conversations (gpt-4o model)
- **OpenAI Realtime API** - Voice-to-voice (300-600ms latency)
- **Telnyx** - Voice calls + SMS
- **Stripe** - Subscription + per-booking billing

### Infrastructure
- **Vercel** - Hosting + auto-deployment
- **Supabase** - Database + auth
- **GitHub** - Version control + CI/CD

## 📖 Key Documentation

- `env.example` - Environment variables reference
- `DATABASE_SETUP_INSTRUCTIONS.md` - Database setup guide
- `GOOGLE_CALENDAR_SETUP.md` - Calendar integration
- `TELNYX_WEBHOOK_SETUP.md` - Phone system setup
- `PRODUCTION_READINESS.md` - Production checklist

## 🎨 Project Structure

```
cloudgreet/
├── app/
│   ├── api/              # API routes
│   │   ├── ai/           # AI conversation endpoints
│   │   ├── telnyx/       # Phone/SMS webhooks
│   │   ├── stripe/       # Billing webhooks
│   │   ├── appointments/ # Booking logic
│   │   └── ...
│   ├── components/       # React components
│   ├── dashboard/        # Main dashboard page
│   ├── landing/          # Landing page with voice demo
│   ├── settings/         # Settings page
│   └── ...
├── lib/                  # Utility libraries
│   ├── supabase.ts       # Database client
│   ├── calendar.ts       # Google Calendar integration
│   ├── monitoring.ts     # Logging/error tracking
│   └── ...
├── middleware.ts         # Auth + rate limiting
├── env.example           # Environment variables template
└── package.json          # Dependencies
```

## 🔒 Security Features

- ✅ JWT-based authentication
- ✅ Rate limiting (100 req/15min per IP)
- ✅ Webhook signature verification (Telnyx, Stripe)
- ✅ Row-level security (Supabase RLS)
- ✅ API key rotation support
- ✅ Secure ephemeral tokens for Realtime API
- ✅ HTTPS only in production
- ✅ Security headers (CSP, HSTS, X-Frame-Options)

## 📞 AI System

### Voice AI Architecture

1. **Incoming Call** → Telnyx webhook
2. **Speech-to-Text** → Telnyx automatic transcription
3. **AI Response** → GPT-4o with 200-line system prompt
4. **Text-to-Speech** → OpenAI TTS-1-HD (nova voice)
5. **Booking Detection** → Extract appointment details
6. **Calendar Integration** → Create Google Calendar event
7. **Billing** → Stripe per-booking charge ($50)

### Real-time Voice Demo (Landing Page)

Uses **OpenAI Realtime API** for true voice-to-voice:
- 300-600ms total latency
- WebSocket-based bidirectional audio
- PCM16 format at 24kHz
- Server-side Voice Activity Detection
- Same quality as production calls

## 💰 Pricing Model

- **Subscription**: $200/month (unlimited calls)
- **Per-Booking Fee**: $50 per appointment scheduled
- **Billing**: Automatic via Stripe
- **Free Trial**: 14 days (optional, configure in Stripe)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Coverage report
npm run test:coverage
```

## 📦 Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to `main`

```bash
# Or deploy manually
npx vercel --prod
```

### Environment Variables

Add all variables from `env.example` to Vercel:
- Project Settings → Environment Variables
- Add for Production, Preview, and Development

## 🐛 Troubleshooting

### Build Errors

```bash
# Clear build cache
rm -rf .next
npm run build
```

### Database Connection Issues

Check Supabase credentials in `.env.local`:
```bash
# Test connection
node -e "const {supabaseAdmin} = require('./lib/supabase'); supabaseAdmin.from('businesses').select('*').limit(1).then(console.log)"
```

### Phone System Not Working

1. Verify Telnyx webhook URLs are configured
2. Check webhook signature verification
3. Test with `/api/test/call-flow`

See `ERROR_PREVENTION_GUIDE.md` for more troubleshooting.

## 🤝 Contributing

This is a private SaaS product. For internal development:

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit with conventional commits: `feat:`, `fix:`, `refactor:`
3. Test thoroughly before merging
4. Deploy to staging first

## 📝 License

Proprietary - All Rights Reserved

## 🔗 Links

- **Production**: https://cloudgreet.com
- **Dashboard**: https://cloudgreet.com/dashboard
- **Landing Page**: https://cloudgreet.com/landing
- **Support**: [support@cloudgreet.com](mailto:support@cloudgreet.com)

## 👥 Team

Built with ❤️ by the CloudGreet team

---

**Note**: This README is for the Next.js application. For deployment guides, setup instructions, and business documentation, see the various `.md` files in the project root.

