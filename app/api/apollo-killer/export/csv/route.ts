import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'
import { stringify } from 'csv-stringify/sync'

export const dynamic = 'force-dynamic'

/**
 * APOLLO KILLER: Export Leads to CSV/Excel
 * 
 * Export enriched leads with filters and custom field selection
 * Supports multiple formats: CSV, Excel-compatible CSV
 */

export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const minScore = Number(searchParams.get('minScore')) || 0
    const businessType = searchParams.get('businessType')
    const enrichmentStatus = searchParams.get('enrichmentStatus')
    const outreachStatus = searchParams.get('outreachStatus')
    const fields = searchParams.get('fields')?.split(',') || ['all']

    // Build query with filters
    let query = supabaseAdmin
      .from('enriched_leads')
      .select('*')

    if (minScore > 0) {
      query = query.gte('total_score', minScore)
    }

    if (businessType) {
      query = query.eq('business_type', businessType)
    }

    if (enrichmentStatus && enrichmentStatus !== 'all') {
      query = query.eq('enrichment_status', enrichmentStatus)
    }

    if (outreachStatus && outreachStatus !== 'all') {
      query = query.eq('outreach_status', outreachStatus)
    }

    // Order by score descending
    query = query.order('total_score', { ascending: false, nullsFirst: false })

    const { data: leads, error } = await query

    if (error) {
      logger.error('Failed to fetch leads for export', { error: error.message })
      return NextResponse.json({
        error: 'Failed to fetch leads'
      }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        error: 'No leads match the specified criteria'
      }, { status: 404 })
    }

    // Transform data for export
    const exportData = leads.map(lead => transformLeadForExport(lead, fields))

    // Generate CSV
    const csv = stringify(exportData, {
      header: true,
      quoted: true,
      encoding: 'utf8'
    })

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const filters = [
      minScore > 0 ? `score${minScore}+` : null,
      businessType || null,
      enrichmentStatus !== 'all' ? enrichmentStatus : null,
      outreachStatus !== 'all' ? outreachStatus : null
    ].filter(Boolean).join('_')
    
    const filename = `cloudgreet_leads_${timestamp}${filters ? `_${filters}` : ''}.csv`

    logger.info('Lead export completed', {
      totalLeads: leads.length,
      format,
      filters: JSON.stringify({ minScore, businessType, enrichmentStatus, outreachStatus }),
      fields: fields.length
    })

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    logger.error('Lead export error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Export failed'
    }, { status: 500 })
  }
}

/**
 * Transform lead data for export
 */
function transformLeadForExport(lead: any, fields: string[]): any {
  const includeAll = fields.includes('all')
  
  const exported: any = {}

  // Basic business info
  if (includeAll || fields.includes('basic')) {
    exported.business_name = lead.business_name
    exported.address = lead.address
    exported.city = lead.city
    exported.state = lead.state
    exported.phone = lead.phone
    exported.website = lead.website
    exported.business_type = lead.business_type
  }

  // Google data
  if (includeAll || fields.includes('google')) {
    exported.google_rating = lead.google_rating
    exported.google_review_count = lead.google_review_count
    exported.google_place_id = lead.google_place_id
  }

  // Owner/contact info
  if (includeAll || fields.includes('contact')) {
    exported.owner_name = lead.owner_name
    exported.owner_title = lead.owner_title
    exported.owner_email = lead.owner_email
    exported.owner_email_verified = lead.owner_email_verified
    exported.owner_phone = lead.owner_phone
    exported.owner_linkedin_url = lead.owner_linkedin_url
  }

  // Decision makers
  if ((includeAll || fields.includes('decision_makers')) && lead.decision_makers) {
    const decisionMakers = Array.isArray(lead.decision_makers) ? lead.decision_makers : []
    decisionMakers.forEach((dm, idx) => {
      if (idx < 3) { // Limit to 3 additional decision makers
        exported[`decision_maker_${idx + 1}_name`] = dm.name
        exported[`decision_maker_${idx + 1}_title`] = dm.title
        exported[`decision_maker_${idx + 1}_email`] = dm.email
      }
    })
  }

  // Scoring
  if (includeAll || fields.includes('scoring')) {
    exported.total_score = lead.total_score
    exported.fit_score = lead.fit_score
    exported.engagement_score = lead.engagement_score
    exported.contact_quality_score = lead.contact_quality_score
    exported.opportunity_score = lead.opportunity_score
    exported.urgency_score = lead.urgency_score
  }

  // Pain points and pitch
  if (includeAll || fields.includes('ai_analysis')) {
    exported.pain_points = Array.isArray(lead.pain_points) 
      ? lead.pain_points.join('; ') 
      : lead.pain_points
    exported.personalized_pitch = lead.personalized_pitch
    exported.recommended_approach = lead.recommended_approach
    exported.best_contact_time = lead.best_contact_time
  }

  // Enrichment status
  if (includeAll || fields.includes('status')) {
    exported.enrichment_status = lead.enrichment_status
    exported.outreach_status = lead.outreach_status
    exported.priority = lead.priority
    exported.tags = Array.isArray(lead.tags) ? lead.tags.join('; ') : lead.tags
  }

  // Outreach tracking
  if (includeAll || fields.includes('tracking')) {
    exported.contact_attempts = lead.contact_attempts
    exported.emails_sent = lead.emails_sent
    exported.emails_opened = lead.emails_opened
    exported.emails_clicked = lead.emails_clicked
    exported.email_open_rate = lead.emails_sent > 0 
      ? Math.round((lead.emails_opened / lead.emails_sent) * 100) + '%'
      : '0%'
    exported.sms_sent = lead.sms_sent
    exported.sms_responded = lead.sms_responded
    exported.first_contact_date = lead.first_contact_date
    exported.last_contact_date = lead.last_contact_date
  }

  // Revenue estimates
  if (includeAll || fields.includes('business_intel')) {
    exported.estimated_revenue_min = lead.estimated_revenue_min
    exported.estimated_revenue_max = lead.estimated_revenue_max
    exported.employee_count_min = lead.employee_count_min
    exported.employee_count_max = lead.employee_count_max
    exported.years_in_business = lead.years_in_business
  }

  // Timestamps
  if (includeAll || fields.includes('timestamps')) {
    exported.created_at = lead.created_at
    exported.last_enriched_at = lead.last_enriched_at
    exported.updated_at = lead.updated_at
  }

  return exported
}
