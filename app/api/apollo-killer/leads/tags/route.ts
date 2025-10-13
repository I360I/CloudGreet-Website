import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * APOLLO KILLER: Lead Tags Management
 * 
 * Add/remove tags from leads for organization
 * Get popular tags for autocomplete
 */

// GET: Fetch all tags or tags for a specific lead
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const popular = searchParams.get('popular') === 'true'

    if (popular) {
      // Get most popular tags across all leads
      const { data: leads } = await supabaseAdmin
        .from('enriched_leads')
        .select('tags')
        .not('tags', 'is', null)

      const tagCounts: Record<string, number> = {}

      leads?.forEach(lead => {
        if (Array.isArray(lead.tags)) {
          lead.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
          })
        }
      })

      const popularTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }))

      return NextResponse.json({
        success: true,
        tags: popularTags
      })

    } else if (leadId) {
      // Get tags for specific lead
      const { data: lead, error } = await supabaseAdmin
        .from('enriched_leads')
        .select('tags')
        .eq('id', leadId)
        .single()

      if (error) {
        return NextResponse.json({
          error: 'Lead not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        tags: lead.tags || []
      })
    }

    return NextResponse.json({
      error: 'leadId or popular=true parameter required'
    }, { status: 400 })

  } catch (error) {
    logger.error('Lead tags fetch error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to fetch tags'
    }, { status: 500 })
  }
}

// POST: Add tag to lead
export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { leadId, tag } = await request.json()

    if (!leadId || !tag) {
      return NextResponse.json({
        error: 'leadId and tag are required'
      }, { status: 400 })
    }

    const normalizedTag = tag.trim().toLowerCase()

    if (normalizedTag.length === 0 || normalizedTag.length > 50) {
      return NextResponse.json({
        error: 'Tag must be between 1 and 50 characters'
      }, { status: 400 })
    }

    // Get current tags
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from('enriched_leads')
      .select('tags, business_name')
      .eq('id', leadId)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json({
        error: 'Lead not found'
      }, { status: 404 })
    }

    const currentTags = lead.tags || []
    
    // Check if tag already exists
    if (currentTags.includes(normalizedTag)) {
      return NextResponse.json({
        success: true,
        message: 'Tag already exists',
        tags: currentTags
      })
    }

    // Add new tag
    const newTags = [...currentTags, normalizedTag]

    const { data: updatedLead, error } = await supabaseAdmin
      .from('enriched_leads')
      .update({
        tags: newTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select('tags')
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to add tag'
      }, { status: 500 })
    }

    logger.info('Tag added to lead', {
      leadId,
      business: lead.business_name,
      tag: normalizedTag,
      totalTags: newTags.length
    })

    return NextResponse.json({
      success: true,
      tags: updatedLead.tags
    })

  } catch (error) {
    logger.error('Lead tag creation error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to add tag'
    }, { status: 500 })
  }
}

// DELETE: Remove tag from lead
export async function DELETE(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const tag = searchParams.get('tag')

    if (!leadId || !tag) {
      return NextResponse.json({
        error: 'leadId and tag are required'
      }, { status: 400 })
    }

    const normalizedTag = tag.trim().toLowerCase()

    // Get current tags
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from('enriched_leads')
      .select('tags, business_name')
      .eq('id', leadId)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json({
        error: 'Lead not found'
      }, { status: 404 })
    }

    const currentTags = lead.tags || []
    const newTags = currentTags.filter((t: string) => t !== normalizedTag)

    const { data: updatedLead, error } = await supabaseAdmin
      .from('enriched_leads')
      .update({
        tags: newTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select('tags')
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to remove tag'
      }, { status: 500 })
    }

    logger.info('Tag removed from lead', {
      leadId,
      business: lead.business_name,
      tag: normalizedTag,
      totalTags: newTags.length
    })

    return NextResponse.json({
      success: true,
      tags: updatedLead.tags
    })

  } catch (error) {
    logger.error('Lead tag removal error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to remove tag'
    }, { status: 500 })
  }
}
