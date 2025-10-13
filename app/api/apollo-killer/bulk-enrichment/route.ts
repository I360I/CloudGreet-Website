import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

/**
 * APOLLO KILLER: Bulk Enrichment with Progress Tracking
 * 
 * Processes multiple leads in parallel with real-time progress updates
 * Returns progress status and allows clients to poll for updates
 */

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { leadIds, batchSize = 5 } = await request.json()

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({
        error: 'leadIds array is required'
      }, { status: 400 })
    }

    // Create bulk enrichment job
    const jobId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const { data: bulkJob, error: jobError } = await supabaseAdmin
      .from('bulk_enrichment_jobs')
      .insert({
        id: jobId,
        lead_ids: leadIds,
        total_leads: leadIds.length,
        processed_leads: 0,
        successful_leads: 0,
        failed_leads: 0,
        status: 'queued',
        batch_size: batchSize,
        created_by: adminAuth.admin.userId,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (jobError || !bulkJob) {
      logger.error('Failed to create bulk enrichment job', { error: jobError?.message })
      return NextResponse.json({
        error: 'Failed to create bulk job'
      }, { status: 500 })
    }

    // Start processing in background (don't await)
    processBulkEnrichment(jobId, leadIds, batchSize)

    logger.info('Bulk enrichment job created', {
      jobId,
      totalLeads: leadIds.length,
      batchSize
    })

    return NextResponse.json({
      success: true,
      jobId,
      totalLeads: leadIds.length,
      message: 'Bulk enrichment started. Use GET /api/apollo-killer/bulk-enrichment/:jobId to check progress.'
    })

  } catch (error) {
    logger.error('Bulk enrichment API error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Bulk enrichment failed'
    }, { status: 500 })
  }
}

/**
 * GET: Check bulk enrichment job progress
 */
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({
        error: 'jobId is required'
      }, { status: 400 })
    }

    // Get job status
    const { data: job, error } = await supabaseAdmin
      .from('bulk_enrichment_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({
        error: 'Job not found'
      }, { status: 404 })
    }

    // Calculate progress percentage
    const progressPercentage = job.total_leads > 0 
      ? Math.round((job.processed_leads / job.total_leads) * 100)
      : 0

    // Get recent processing logs for this job
    const { data: logs } = await supabaseAdmin
      .from('bulk_enrichment_logs')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        totalLeads: job.total_leads,
        processedLeads: job.processed_leads,
        successfulLeads: job.successful_leads,
        failedLeads: job.failed_leads,
        progressPercentage,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        estimatedTimeRemaining: calculateETA(job),
        errorSummary: job.error_summary
      },
      recentLogs: logs || []
    })

  } catch (error) {
    logger.error('Bulk enrichment status error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to get job status'
    }, { status: 500 })
  }
}

/**
 * Background processor for bulk enrichment
 */
async function processBulkEnrichment(jobId: string, leadIds: string[], batchSize: number) {
  try {
    // Update job status to processing
    await supabaseAdmin
      .from('bulk_enrichment_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId)

    let processedCount = 0
    let successCount = 0
    let failCount = 0

    // Process leads in batches
    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batch = leadIds.slice(i, i + batchSize)
      
      // Process batch in parallel
      const batchPromises = batch.map(async (leadId) => {
        try {
          // Call enrichment processor for this lead
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/apollo-killer/enrichment-processor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.JWT_SECRET}` // Admin auth
            },
            body: JSON.stringify({ leadId })
          })

          const result = await response.json()

          if (result.success) {
            successCount++
            
            // Log success
            await supabaseAdmin
              .from('bulk_enrichment_logs')
              .insert({
                job_id: jobId,
                lead_id: leadId,
                status: 'success',
                message: 'Lead enriched successfully',
                score: result.lead?.total_score || 0,
                processing_time_ms: Date.now() - batch[0] // Approximate
              })
          } else {
            failCount++
            
            // Log failure
            await supabaseAdmin
              .from('bulk_enrichment_logs')
              .insert({
                job_id: jobId,
                lead_id: leadId,
                status: 'failed',
                message: result.error || 'Unknown error',
                error_details: result
              })
          }

        } catch (error) {
          failCount++
          
          await supabaseAdmin
            .from('bulk_enrichment_logs')
            .insert({
              job_id: jobId,
              lead_id: leadId,
              status: 'failed',
              message: 'Processing error',
              error_details: { error: error instanceof Error ? error.message : 'Unknown' }
            })
        }

        processedCount++
        
        // Update job progress
        await supabaseAdmin
          .from('bulk_enrichment_jobs')
          .update({
            processed_leads: processedCount,
            successful_leads: successCount,
            failed_leads: failCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId)
      })

      // Wait for batch to complete
      await Promise.all(batchPromises)

      // Small delay between batches to avoid overwhelming APIs
      if (i + batchSize < leadIds.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Mark job as completed
    await supabaseAdmin
      .from('bulk_enrichment_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_leads: processedCount,
        successful_leads: successCount,
        failed_leads: failCount
      })
      .eq('id', jobId)

    logger.info('Bulk enrichment job completed', {
      jobId,
      totalProcessed: processedCount,
      successful: successCount,
      failed: failCount
    })

  } catch (error) {
    // Mark job as failed
    await supabaseAdmin
      .from('bulk_enrichment_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_summary: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', jobId)

    logger.error('Bulk enrichment job failed', {
      jobId,
      error: error instanceof Error ? error.message : 'Unknown'
    })
  }
}

/**
 * Calculate estimated time to completion
 */
function calculateETA(job: any): string | null {
  if (job.status !== 'processing' || job.processed_leads === 0) {
    return null
  }

  const startTime = new Date(job.started_at).getTime()
  const currentTime = Date.now()
  const elapsedMs = currentTime - startTime

  const remainingLeads = job.total_leads - job.processed_leads
  const avgTimePerLead = elapsedMs / job.processed_leads
  const estimatedRemainingMs = remainingLeads * avgTimePerLead

  // Convert to human readable
  const minutes = Math.round(estimatedRemainingMs / 60000)
  
  if (minutes < 1) {
    return 'Less than 1 minute'
  } else if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  } else {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }
}
