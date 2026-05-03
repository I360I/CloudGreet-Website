import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/env-status
 *
 * Reports which operational env vars are wired in the running deployment.
 * Returns booleans only — never the values themselves. Used by the Owner
 * Console to show a green/amber checklist so the operator can see what's
 * configured without leaving the app.
 */

type Group = 'auth' | 'billing' | 'leads' | 'app'

type EnvCheck = {
 name: string
 configured: boolean
 purpose: string
 group: Group
 doc?: string
}

const CHECKS = (): EnvCheck[] => [
 // Auth + database
 {
  name: 'JWT_SECRET',
  configured: !!process.env.JWT_SECRET,
  purpose: 'Signs and verifies the auth JWT for every dashboard + admin request.',
  group: 'auth',
 },
 {
  name: 'NEXT_PUBLIC_SUPABASE_URL',
  configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL || !!process.env.SUPABASE_URL,
  purpose: 'Supabase project URL — required for every database query.',
  group: 'auth',
 },
 {
  name: 'SUPABASE_SERVICE_ROLE_KEY',
  configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  purpose: 'Server-only key for admin Supabase access. Without it everything 500s.',
  group: 'auth',
 },

 // Billing
 {
  name: 'STRIPE_SECRET_KEY',
  configured: !!process.env.STRIPE_SECRET_KEY,
  purpose: 'Required to create checkout sessions, customers, and subscriptions.',
  group: 'billing',
  doc: 'https://dashboard.stripe.com/apikeys',
 },
 {
  name: 'STRIPE_WEBHOOK_SECRET',
  configured: !!process.env.STRIPE_WEBHOOK_SECRET,
  purpose: 'Verifies the signature of incoming Stripe webhooks; without it nothing flips subscription_status to active.',
  group: 'billing',
  doc: 'https://dashboard.stripe.com/webhooks',
 },
 {
  name: 'STRIPE_PRICE_STARTER',
  configured: !!process.env.STRIPE_PRICE_STARTER,
  purpose: 'Price ID for the $499/mo Starter plan — used by "Send checkout link".',
  group: 'billing',
  doc: 'https://dashboard.stripe.com/products',
 },
 {
  name: 'STRIPE_PRICE_FULL',
  configured: !!process.env.STRIPE_PRICE_FULL,
  purpose: 'Price ID for the $899/mo Full 24/7 plan — used by "Send checkout link".',
  group: 'billing',
  doc: 'https://dashboard.stripe.com/products',
 },

 // Leads
 {
  name: 'GOOGLE_PLACES_API_KEY',
  configured: !!process.env.GOOGLE_PLACES_API_KEY,
  purpose: 'Enriches TDLR/TSBPE/TDA scrape results with phone + website, and powers the Google · Roofing/Painting/Handyman/Landscaping sources.',
  group: 'leads',
  doc: 'https://console.cloud.google.com/apis/library/places.googleapis.com',
 },

 // App
 {
  name: 'NEXT_PUBLIC_APP_URL',
  configured: !!process.env.NEXT_PUBLIC_APP_URL,
  purpose: 'Base URL used for Stripe redirects, Cal.com webhook subscriber URLs, and onboarding deep links. Falls back to https://cloudgreet.com when unset.',
  group: 'app',
 },
 {
  name: 'NEXT_PUBLIC_SUPPORT_PHONE',
  configured: !!process.env.NEXT_PUBLIC_SUPPORT_PHONE,
  purpose: 'Shown in the onboarding "Stuck? Call/text us" banner. Falls back to the demo number when unset.',
  group: 'app',
 },
]

const GROUP_LABELS: Record<Group, string> = {
 auth: 'Auth & database',
 billing: 'Billing (Stripe)',
 leads: 'Lead generation',
 app: 'App',
}

export async function GET(request: NextRequest) {
 const auth = await requireAdmin(request)
 if (!auth.success) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const checks = CHECKS()
 const groupOrder: Group[] = ['auth', 'billing', 'leads', 'app']

 return NextResponse.json({
  success: true,
  groups: groupOrder.map((g) => ({
   id: g,
   label: GROUP_LABELS[g],
   checks: checks.filter((c) => c.group === g),
  })),
  totals: {
   total: checks.length,
   configured: checks.filter((c) => c.configured).length,
  },
 })
}
