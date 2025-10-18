import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * APOLLO KILLER: Email Template Management
 * 
 * Create, manage, and test email templates
 * Support for A/B testing and sequence automation
 */

// GET: Fetch all templates
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchParams } = new URL(request.url)
    const templateType = searchParams.get('type') || 'all'

    let query = supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('is_active', true)

    if (templateType !== 'all') {
      query = query.eq('template_type', templateType)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch email templates', { error: error.message })
      return NextResponse.json({
        error: 'Failed to fetch templates'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      templates: data || []
    })

  } catch (error) {
    logger.error('Email templates API error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to fetch templates'
    }, { status: 500 })
  }
}

// POST: Create new template
export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const {
      name,
      subject,
      htmlContent,
      textContent,
      templateType = 'outreach',
      businessType = 'all',
      sequencePosition = 1,
      delayDays = 0,
      isABTest = false,
      abTestVariant = null,
      abTestWeight = 50
    } = await request.json()

    if (!name || !subject || !htmlContent) {
      return NextResponse.json({
        error: 'Name, subject, and HTML content are required'
      }, { status: 400 })
    }

    // Create template
    const { data: template, error } = await supabaseAdmin
      .from('email_templates')
      .insert({
        name,
        subject,
        html_content: htmlContent,
        text_content: textContent,
        template_type: templateType,
        business_type: businessType,
        sequence_position: sequencePosition,
        delay_days: delayDays,
        is_ab_test: isABTest,
        ab_test_variant: abTestVariant,
        ab_test_weight: abTestWeight,
        created_by: adminAuth.admin.userId,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create email template', { error: error.message })
      return NextResponse.json({
        error: 'Failed to create template'
      }, { status: 500 })
    }

    logger.info('Email template created', {
      templateId: template.id,
      name,
      templateType,
      createdBy: adminAuth.admin.userId
    })

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    logger.error('Email template creation error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to create template'
    }, { status: 500 })
  }
}

// PUT: Update template
export async function PUT(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json({
        error: 'Template ID is required'
      }, { status: 400 })
    }

    // Update template
    const { data: template, error } = await supabaseAdmin
      .from('email_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update email template', { error: error.message })
      return NextResponse.json({
        error: 'Failed to update template'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    logger.error('Email template update error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to update template'
    }, { status: 500 })
  }
}

// DELETE: Deactivate template
export async function DELETE(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json({
        error: 'Template ID is required'
      }, { status: 400 })
    }

    // Soft delete by setting is_active to false
    const { error } = await supabaseAdmin
      .from('email_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)

    if (error) {
      logger.error('Failed to delete email template', { error: error.message })
      return NextResponse.json({
        error: 'Failed to delete template'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted'
    })

  } catch (error) {
    logger.error('Email template deletion error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to delete template'
    }, { status: 500 })
  }
}
