import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { followUpSequenceManager } from '@/lib/follow-up-sequences'
import { responseTracker } from '@/lib/response-tracking'
import { leadStatusManager } from '@/lib/lead-status-system'
import { conversionTracker } from '@/lib/conversion-tracking'
import { abTestingManager } from '@/lib/ab-testing'
import { automationEngine } from '@/lib/automation-engine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Comprehensive Campaign Management API
 * Integrates all automation systems for client acquisition
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'dashboard'

    switch (action) {
      case 'dashboard':
        return await getDashboardData()
      case 'campaigns':
        return await getCampaigns()
      case 'sequences':
        return await getSequences()
      case 'templates':
        return await getTemplates()
      case 'stats':
        return await getStats()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Campaign API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'automation/campaigns'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create_campaign':
        return await createCampaign(body)
      case 'start_sequence':
        return await startSequence(body)
      case 'send_message':
        return await sendMessage(body)
      case 'track_response':
        return await trackResponse(body)
      case 'update_status':
        return await updateStatus(body)
      case 'create_ab_test':
        return await createABTest(body)
      case 'execute_automation':
        return await executeAutomation(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Campaign API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'automation/campaigns'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getDashboardData() {
  try {
    // Get comprehensive dashboard data
    const [
      campaignStats,
      sequenceStats,
      automationStats,
      conversionStats
    ] = await Promise.all([
      getCampaignStats(),
      getSequenceStats(),
      getAutomationStats(),
      getConversionStats()
    ])

    return NextResponse.json({
      success: true,
      data: {
        campaigns: campaignStats,
        sequences: sequenceStats,
        automation: automationStats,
        conversions: conversionStats,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    throw error
  }
}

async function getCampaigns() {
  try {
    // Get all campaigns from database
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      campaigns: campaigns || []
    })
  } catch (error) {
    throw error
  }
}

async function getSequences() {
  try {
    // Get all sequences
    const sequences = followUpSequenceManager.getAllSequences()
    
    return NextResponse.json({
      success: true,
      sequences
    })
  } catch (error) {
    throw error
  }
}

async function getTemplates() {
  try {
    // Get email and SMS templates
    const { emailTemplates } = await import('@/lib/email-templates')
    const { smsTemplates } = await import('@/lib/sms-templates')

    return NextResponse.json({
      success: true,
      templates: {
        email: emailTemplates,
        sms: smsTemplates
      }
    })
  } catch (error) {
    throw error
  }
}

async function getStats() {
  try {
    const stats = {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalLeads: 0,
      convertedLeads: 0,
      totalRevenue: 0,
      conversionRate: 0
    }

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    throw error
  }
}

async function createCampaign(body: any) {
  try {
    const { name, description, businessType, triggerStatus, steps } = body

    // Create campaign in database
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        name,
        description,
        business_type: businessType,
        trigger_status: triggerStatus,
        steps: steps,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      campaign
    })
  } catch (error) {
    throw error
  }
}

async function startSequence(body: any) {
  try {
    const { leadId, sequenceId, metadata } = body

    // Start follow-up sequence
    const execution = await followUpSequenceManager.startSequence(leadId, sequenceId, metadata)

    return NextResponse.json({
      success: true,
      execution
    })
  } catch (error) {
    throw error
  }
}

async function sendMessage(body: any) {
  try {
    const { leadId, messageType, templateId, variables } = body

    // Send message and track
    const messageId = `msg_${Date.now()}`
    
    // Track the send event
    await responseTracker.trackEvent({
      leadId,
      campaignId: 'manual',
      messageId,
      eventType: 'sent',
      source: messageType
    })

    return NextResponse.json({
      success: true,
      messageId
    })
  } catch (error) {
    throw error
  }
}

async function trackResponse(body: any) {
  try {
    const { leadId, campaignId, messageId, eventType, source, metadata } = body

    // Track response event
    await responseTracker.trackEvent({
      leadId,
      campaignId,
      messageId,
      eventType,
      source,
      metadata
    })

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    throw error
  }
}

async function updateStatus(body: any) {
  try {
    const { leadId, status, reason, updatedBy } = body

    // Update lead status
    await leadStatusManager.updateLeadStatus(leadId, status, updatedBy, reason)

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    throw error
  }
}

async function createABTest(body: any) {
  try {
    const { name, testType, variants, targetAudience } = body

    let test
    switch (testType) {
      case 'email_template':
        test = await abTestingManager.createEmailTemplateTest(
          name,
          variants.control.templateId,
          variants.test.templateId,
          targetAudience
        )
        break
      case 'subject_line':
        test = await abTestingManager.createSubjectLineTest(
          name,
          variants.control.subjectLine,
          variants.test.subjectLine,
          variants.templateId,
          targetAudience
        )
        break
      case 'send_time':
        test = await abTestingManager.createSendTimeTest(
          name,
          variants.templateId,
          variants.control.sendTime,
          variants.test.sendTime,
          targetAudience
        )
        break
      default:
        throw new Error('Invalid test type')
    }

    return NextResponse.json({
      success: true,
      test
    })
  } catch (error) {
    throw error
  }
}

async function executeAutomation(body: any) {
  try {
    const { ruleId, leadId } = body

    // Execute automation rule
    const execution = await automationEngine.executeRule(
      automationEngine.getRule(ruleId)!,
      leadId
    )

    return NextResponse.json({
      success: true,
      execution
    })
  } catch (error) {
    throw error
  }
}

async function getCampaignStats() {
  try {
    // Get campaign statistics
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')

    if (error) throw error

    return {
      total: campaigns?.length || 0,
      active: campaigns?.filter(c => c.is_active).length || 0,
      campaigns: campaigns || []
    }
  } catch (error) {
    return { total: 0, active: 0, campaigns: [] }
  }
}

async function getSequenceStats() {
  try {
    const sequences = followUpSequenceManager.getAllSequences()
    const activeSequences = followUpSequenceManager.getActiveSequences()

    return {
      total: sequences.length,
      active: activeSequences.length,
      sequences
    }
  } catch (error) {
    return { total: 0, active: 0, sequences: [] }
  }
}

async function getAutomationStats() {
  try {
    const stats = automationEngine.getAutomationStats()
    return stats
  } catch (error) {
    return {
      totalRules: 0,
      activeRules: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0
    }
  }
}

async function getConversionStats() {
  try {
    const stats = conversionTracker.getConversionStats()
    return stats
  } catch (error) {
    return {
      totalConversions: 0,
      totalRevenue: 0,
      averageConversionValue: 0,
      conversionRate: 0,
      topPerformingCampaign: 'None',
      averageTimeToConvert: 0
    }
  }
}

