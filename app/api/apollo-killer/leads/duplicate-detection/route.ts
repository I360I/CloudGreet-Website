import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * APOLLO KILLER: Duplicate Detection & Merging
 * 
 * Find potential duplicate leads using fuzzy matching
 * Merge duplicates with data preservation
 */

export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchParams } = new URL(request.url)
    const threshold = Number(searchParams.get('threshold')) || 80 // Similarity threshold 0-100

    // Find potential duplicates using fuzzy matching
    const duplicateGroups = await findDuplicates(threshold)

    return NextResponse.json({
      success: true,
      duplicateGroups,
      totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.leads.length - 1, 0)
    })

  } catch (error) {
    logger.error('Duplicate detection error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Duplicate detection failed'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { action, leadIds, primaryLeadId } = await request.json()

    if (action === 'merge') {
      if (!leadIds || !Array.isArray(leadIds) || leadIds.length < 2) {
        return NextResponse.json({
          error: 'At least 2 leads required for merging'
        }, { status: 400 })
      }

      const result = await mergeLeads(leadIds, primaryLeadId)
      return NextResponse.json(result)

    } else if (action === 'mark_not_duplicate') {
      // Add to exclusion list (future enhancement)
      return NextResponse.json({
        success: true,
        message: 'Marked as not duplicate'
      })
    }

    return NextResponse.json({
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    logger.error('Duplicate management error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Duplicate management failed'
    }, { status: 500 })
  }
}

/**
 * Find duplicate leads using multiple matching strategies
 */
async function findDuplicates(threshold: number) {
  const { data: leads } = await supabaseAdmin
    .from('enriched_leads')
    .select('id, business_name, address, phone, owner_email, website, google_place_id')

  if (!leads || leads.length === 0) {
    return []
  }

  const duplicateGroups: any[] = []
  const processed = new Set<string>()

  for (let i = 0; i < leads.length; i++) {
    const leadA = leads[i]
    
    if (processed.has(leadA.id)) continue

    const duplicates = [leadA]
    
    for (let j = i + 1; j < leads.length; j++) {
      const leadB = leads[j]
      
      if (processed.has(leadB.id)) continue
      
      const similarity = calculateSimilarity(leadA, leadB)
      
      if (similarity >= threshold) {
        duplicates.push(leadB)
        processed.add(leadB.id)
      }
    }
    
    if (duplicates.length > 1) {
      duplicateGroups.push({
        id: `group_${duplicateGroups.length + 1}`,
        similarity: Math.max(...duplicates.slice(1).map(d => calculateSimilarity(leadA, d))),
        leads: duplicates,
        suggestedPrimary: selectBestLead(duplicates)
      })
    }
    
    processed.add(leadA.id)
  }

  return duplicateGroups
}

/**
 * Calculate similarity between two leads (0-100)
 */
function calculateSimilarity(leadA: any, leadB: any): number {
  let score = 0
  let checks = 0

  // Business name similarity (most important)
  const nameScore = stringSimilarity(leadA.business_name || '', leadB.business_name || '')
  score += nameScore * 0.4
  checks += 0.4

  // Phone number exact match
  if (leadA.phone && leadB.phone) {
    const phoneA = normalizePhone(leadA.phone)
    const phoneB = normalizePhone(leadB.phone)
    if (phoneA === phoneB) {
      score += 30
    }
    checks += 0.3
  }

  // Email exact match
  if (leadA.owner_email && leadB.owner_email) {
    if (leadA.owner_email.toLowerCase() === leadB.owner_email.toLowerCase()) {
      score += 20
    }
    checks += 0.2
  }

  // Address similarity
  if (leadA.address && leadB.address) {
    const addressScore = stringSimilarity(leadA.address, leadB.address)
    score += addressScore * 0.1
    checks += 0.1

    // Same website
    if (leadA.website && leadB.website) {
      const domainA = extractDomain(leadA.website)
      const domainB = extractDomain(leadB.website)
      if (domainA === domainB) {
        score += 10
      }
    }
  }

  return score
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 100
  if (s1.length === 0 || s2.length === 0) return 0

  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null))

  for (let i = 0; i <= s1.length; i++) {
    matrix[0][i] = i
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[j][0] = j
  }

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const substitutionCost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      )
    }
  }

  const distance = matrix[s2.length][s1.length]
  const maxLength = Math.max(s1.length, s2.length)
  
  return Math.round(((maxLength - distance) / maxLength) * 100)
}

/**
 * Select the best lead to keep as primary
 */
function selectBestLead(leads: any[]): any {
  // Score each lead based on data completeness
  const scores = leads.map(lead => {
    let score = 0
    
    if (lead.owner_name) score += 20
    if (lead.owner_email && lead.owner_email_verified) score += 30
    if (lead.owner_email && !lead.owner_email_verified) score += 15
    if (lead.owner_phone) score += 20
    if (lead.website) score += 10
    if (lead.total_score && lead.total_score > 0) score += lead.total_score * 0.2
    if (lead.enrichment_status === 'enriched') score += 25
    
    return { lead, score }
  })

  return scores.sort((a, b) => b.score - a.score)[0].lead
}

/**
 * Merge multiple leads into one
 */
async function mergeLeads(leadIds: string[], primaryLeadId?: string) {
  try {
    // Get all leads to merge
    const { data: leads, error } = await supabaseAdmin
      .from('enriched_leads')
      .select('*')
      .in('id', leadIds)

    if (error || !leads) {
      throw new Error('Failed to fetch leads for merging')
    }

    // Select primary lead
    const primary = primaryLeadId 
      ? leads.find(l => l.id === primaryLeadId) 
      : selectBestLead(leads)

    if (!primary) {
      throw new Error('No primary lead found')
    }

    const others = leads.filter(l => l.id !== primary.id)

    // Merge data from all leads into primary
    const mergedData = mergeLeadData(primary, others)

    // Update primary lead
    const { error: updateError } = await supabaseAdmin
      .from('enriched_leads')
      .update(mergedData)
      .eq('id', primary.id)

    if (updateError) {
      throw new Error('Failed to update primary lead')
    }

    // Delete other leads
    const { error: deleteError } = await supabaseAdmin
      .from('enriched_leads')
      .delete()
      .in('id', others.map(l => l.id))

    if (deleteError) {
      logger.error('Failed to delete duplicate leads', { error: deleteError.message })
    }

    logger.info('Leads merged successfully', {
      primaryId: primary.id,
      mergedIds: others.map(l => l.id).join(', '),
      totalMerged: leadIds.length
    })

    return {
      success: true,
      primaryLead: { ...primary, ...mergedData },
      mergedIds: others.map(l => l.id),
      message: `Merged ${leadIds.length} leads into one`
    }

  } catch (error) {
    logger.error('Lead merge failed', {
      leadIds: leadIds.join(', '),
      primaryLeadId,
      error: error instanceof Error ? error.message : 'Unknown'
    })

    throw error
  }
}

/**
 * Merge lead data intelligently
 */
function mergeLeadData(primary: any, others: any[]): any {
  const merged = { ...primary }

  others.forEach(lead => {
    // Use non-null values from other leads
    Object.keys(lead).forEach(key => {
      if (lead[key] && !merged[key]) {
        merged[key] = lead[key]
      }
    })

    // Combine arrays
    if (lead.decision_makers && Array.isArray(lead.decision_makers)) {
      merged.decision_makers = [
        ...(merged.decision_makers || []),
        ...lead.decision_makers
      ]
    }

    if (lead.tags && Array.isArray(lead.tags)) {
      merged.tags = [
        ...(merged.tags || []),
        ...lead.tags
      ].filter((tag, i, arr) => arr.indexOf(tag) === i) // unique
    }

    // Use highest scores
    if (lead.total_score > (merged.total_score || 0)) {
      merged.total_score = lead.total_score
      merged.fit_score = lead.fit_score
      merged.engagement_score = lead.engagement_score
      merged.contact_quality_score = lead.contact_quality_score
      merged.opportunity_score = lead.opportunity_score
    }

    // Combine contact attempts
    merged.contact_attempts = (merged.contact_attempts || 0) + (lead.contact_attempts || 0)
    merged.emails_sent = (merged.emails_sent || 0) + (lead.emails_sent || 0)
    merged.emails_opened = (merged.emails_opened || 0) + (lead.emails_opened || 0)
    merged.sms_sent = (merged.sms_sent || 0) + (lead.sms_sent || 0)
  })

  merged.updated_at = new Date().toISOString()
  
  return merged
}

/**
 * Helper functions
 */

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
  }
}
