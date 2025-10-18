import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * APOLLO KILLER: A/B Testing for Email Campaigns
 * 
 * Manage A/B tests for email templates
 * Track performance and determine winners
 */

// GET: Get A/B test results
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('testId')

    if (testId) {
      // Get specific test results
      const { data: test, error } = await supabaseAdmin
        .from('ab_tests')
        .select(`
          *,
          email_templates!inner(*)
        `)
        .eq('id', testId)
        .single()

      if (error || !test) {
        return NextResponse.json({
          error: 'A/B test not found'
        }, { status: 404 })
      }

      // Get performance metrics
      const { data: metrics } = await supabaseAdmin
        .from('ab_test_metrics')
        .select('*')
        .eq('test_id', testId)
        .order('created_at', { ascending: false })

      return NextResponse.json({
        success: true,
        test,
        metrics: metrics || []
      })
    } else {
      // Get all active A/B tests
      const { data: tests, error } = await supabaseAdmin
        .from('ab_tests')
        .select(`
          *,
          email_templates!inner(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Failed to fetch A/B tests', { error: error.message })
        return NextResponse.json({
          error: 'Failed to fetch A/B tests'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        tests: tests || []
      })
    }

  } catch (error) {
    logger.error('A/B testing API error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to fetch A/B test data'
    }, { status: 500 })
  }
}

// POST: Create new A/B test
export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const {
      name,
      description,
      templateAId,
      templateBId,
      testPercentage = 50,
      metric = 'open_rate',
      minimumSampleSize = 100,
      significanceLevel = 0.95
    } = await request.json()

    if (!name || !templateAId || !templateBId) {
      return NextResponse.json({
        error: 'Name and both template IDs are required'
      }, { status: 400 })
    }

    // Verify templates exist
    const { data: templates, error: templateError } = await supabaseAdmin
      .from('email_templates')
      .select('id, name')
      .in('id', [templateAId, templateBId])

    if (templateError || !templates || templates.length !== 2) {
      return NextResponse.json({
        error: 'One or both templates not found'
      }, { status: 404 })
    }

    // Create A/B test
    const { data: test, error } = await supabaseAdmin
      .from('ab_tests')
      .insert({
        name,
        description,
        template_a_id: templateAId,
        template_b_id: templateBId,
        test_percentage: testPercentage,
        metric: metric,
        minimum_sample_size: minimumSampleSize,
        significance_level: significanceLevel,
        created_by: adminAuth.admin.userId,
        is_active: true,
        status: 'draft'
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create A/B test', { error: error.message })
      return NextResponse.json({
        error: 'Failed to create A/B test'
      }, { status: 500 })
    }

    logger.info('A/B test created', {
      testId: test.id,
      name,
      templateA: templateAId,
      templateB: templateBId,
      createdBy: adminAuth.admin.userId
    })

    return NextResponse.json({
      success: true,
      test
    })

  } catch (error) {
    logger.error('A/B test creation error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to create A/B test'
    }, { status: 500 })
  }
}

// PUT: Update test status or end test
export async function PUT(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { testId, status, winnerTemplateId, notes } = await request.json()

    if (!testId || !status) {
      return NextResponse.json({
        error: 'Test ID and status are required'
      }, { status: 400 })
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (winnerTemplateId) {
      updateData.winner_template_id = winnerTemplateId
    }

    if (notes) {
      updateData.notes = notes
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    // Update test
    const { data: test, error } = await supabaseAdmin
      .from('ab_tests')
      .update(updateData)
      .eq('id', testId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update A/B test', { error: error.message })
      return NextResponse.json({
        error: 'Failed to update A/B test'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      test
    })

  } catch (error) {
    logger.error('A/B test update error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to update A/B test'
    }, { status: 500 })
  }
}

// POST /api/apollo-killer/ab-testing/metrics: Record test metrics
async function recordTestMetrics(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const {
      testId,
      templateId,
      leadId,
      metric,
      value,
      metadata = {}
    } = await request.json()

    if (!testId || !templateId || !leadId || !metric || value === undefined) {
      return NextResponse.json({
        error: 'All required fields must be provided'
      }, { status: 400 })
    }

    // Record metric
    const { data: metricRecord, error } = await supabaseAdmin
      .from('ab_test_metrics')
      .insert({
        test_id: testId,
        template_id: templateId,
        lead_id: leadId,
        metric,
        value,
        metadata,
        recorded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to record A/B test metric', { error: error.message })
      return NextResponse.json({
        error: 'Failed to record metric'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      metric: metricRecord
    })

  } catch (error) {
    logger.error('A/B test metrics recording error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to record metric'
    }, { status: 500 })
  }
}
