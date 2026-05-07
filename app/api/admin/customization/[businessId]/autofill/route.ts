import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { buildPrefill } from '@/lib/customization/prefill'
import { enrichWithGooglePlaces, isGooglePlacesConfigured } from '@/lib/scrapers/google-places'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/customization/[businessId]/autofill
 *
 * Returns a fresh prefill object built from every source we have:
 *   1. The business row + the owner's profile
 *   2. The originating lead (close, lead_assignments) for services /
 *      contact name / phone
 *   3. Google Places lookup by name + city when reachable - picks up
 *      the public address/phone/website and tags 'Cal.com' calendar
 *      hint when the cal API key is set
 *
 * Admin can then merge what's returned into the in-flight form before
 * saving via PATCH /answers. Nothing is written here - this is a
 * read-only enrichment lookup.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { businessId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', params.businessId)
      .single()
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const ownerName = await loadOwnerName(params.businessId)
    const lead = await loadLeadForBusiness(params.businessId)
    const prefill = buildPrefill({ business: business as any, ownerName, lead })

    // Optional Places lookup - only runs when we have a name + city to
    // search and the API key is configured. Treat failures as silent;
    // admin still gets the basic prefill back.
    const sources: string[] = []
    if (Array.isArray(lead?.services) && lead!.services!.length > 0) sources.push('lead-services')
    if (ownerName) sources.push('owner-profile')
    if ((business as any).business_name) sources.push('business-row')

    if (
      isGooglePlacesConfigured() &&
      (business as any).business_name &&
      ((business as any).address || (business as any).city)
    ) {
      try {
        const cityForLookup = (business as any).city
          || extractCityFromAddress((business as any).address)
        const attempt = await enrichWithGooglePlaces(
          (business as any).business_name,
          cityForLookup,
        )
        if (attempt.ok) {
          if (!prefill.forward_phone && attempt.data.phone) {
            prefill.forward_phone = attempt.data.phone
          }
          if (!prefill.address && attempt.data.matched_address) {
            prefill.address = attempt.data.matched_address
          }
          sources.push('google-places')
        }
      } catch (e) {
        logger.warn('admin autofill places lookup threw', {
          businessId: params.businessId,
          error: e instanceof Error ? e.message : 'Unknown',
        })
      }
    }

    return NextResponse.json({
      success: true,
      prefill,
      sources,
    })
  } catch (e) {
    logger.error('admin autofill failed', {
      businessId: params.businessId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

async function loadOwnerName(businessId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('custom_users')
    .select('name, first_name, last_name')
    .eq('business_id', businessId)
    .eq('role', 'owner')
    .maybeSingle()
  if (!data) return null
  return (data as any).name
    || [(data as any).first_name, (data as any).last_name].filter(Boolean).join(' ').trim()
    || null
}

async function loadLeadForBusiness(businessId: string): Promise<any | null> {
  const { data: close } = await supabaseAdmin
    .from('closes')
    .select('prospect_contact_name, prospect_phone, prospect_business_name')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!close) return null
  // Try to find the linked lead record for richer data (services from scraper).
  const phone = (close as any).prospect_phone
  let services: string[] | null = null
  if (phone) {
    const { data: leadRow } = await supabaseAdmin
      .from('leads')
      .select('business_type, raw, address, city')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (leadRow) {
      const rawServices = (leadRow as any)?.raw?.services
      if (Array.isArray(rawServices)) services = rawServices
      else if ((leadRow as any).business_type) services = [(leadRow as any).business_type]
      return {
        contact_name: (close as any).prospect_contact_name,
        phone,
        services,
        address: (leadRow as any).address,
      }
    }
  }
  return {
    contact_name: (close as any).prospect_contact_name,
    phone,
  }
}

function extractCityFromAddress(addr: string | null | undefined): string | null {
  if (!addr) return null
  // crude: assume "..., CITY, ST 12345" - take the second-to-last comma-segment
  const parts = addr.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return null
  return parts[parts.length - 2] || null
}
