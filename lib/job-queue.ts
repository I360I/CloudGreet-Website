import { supabaseAdmin } from './supabase'
import { logger } from './monitoring'

/**
 * Background Job Queue
 * 
 * Simple database-backed job queue for serverless environments
 * 
 * To use:
 * 1. Create jobs table (see migrations/ADD_JOB_QUEUE.sql)
 * 2. Set up Vercel Cron job: /api/cron/process-jobs
 * 3. Queue jobs using queueJob()
 */

export type JobType = 
  | 'send_email'
  | 'send_sms'
  | 'process_webhook'
  | 'sync_calendar'
  | 'generate_report'
  | 'cleanup_old_data'

export interface JobPayload {
  [key: string]: any
}

export interface Job {
  id: string
  type: JobType
  payload: JobPayload
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  max_attempts: number
  created_at: string
  processed_at: string | null
  error: string | null
}

/**
 * Queue a background job
 */
export async function queueJob(
  type: JobType,
  payload: JobPayload,
  options?: {
    maxAttempts?: number
    delayMs?: number
  }
): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from('background_jobs')
      .insert({
        type,
        payload,
        status: 'pending',
        attempts: 0,
        max_attempts: options?.maxAttempts || 3,
        created_at: new Date().toISOString(),
        // If delay specified, set processed_at to future time
        processed_at: options?.delayMs 
          ? new Date(Date.now() + options.delayMs).toISOString()
          : null
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    logger.info('Job queued', { jobId: data.id, type, payload })
    return data.id
  } catch (error) {
    logger.error('Failed to queue job', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type,
      payload
    })
    throw error
  }
}

/**
 * Process pending jobs (called by cron job)
 */
export async function processJobs(limit: number = 10): Promise<number> {
  try {
    // Get pending jobs that are ready to process
    const now = new Date().toISOString()
    const { data: jobs, error } = await supabaseAdmin
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .or(`processed_at.is.null,processed_at.lte.${now}`)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      throw error
    }

    if (!jobs || jobs.length === 0) {
      return 0
    }

    let processed = 0

    for (const job of jobs) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from('background_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id)

        // Process job
        await processJob(job)

        // Mark as completed
        await supabaseAdmin
          .from('background_jobs')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', job.id)

        processed++
      } catch (jobError) {
        const attempts = job.attempts + 1
        const shouldRetry = attempts < job.max_attempts

        await supabaseAdmin
          .from('background_jobs')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            attempts,
            error: jobError instanceof Error ? jobError.message : 'Unknown error',
            // Retry with exponential backoff
            processed_at: shouldRetry
              ? new Date(Date.now() + Math.pow(2, attempts) * 60000).toISOString()
              : new Date().toISOString()
          })
          .eq('id', job.id)

        logger.error('Job processing failed', {
          jobId: job.id,
          type: job.type,
          attempts,
          error: jobError instanceof Error ? jobError.message : 'Unknown error',
          willRetry: shouldRetry
        })
      }
    }

    return processed
  } catch (error) {
    logger.error('Failed to process jobs', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

/**
 * Process a single job
 */
async function processJob(job: Job): Promise<void> {
  switch (job.type) {
    case 'send_email':
      await processSendEmail(job.payload)
      break
    case 'send_sms':
      await processSendSMS(job.payload)
      break
    case 'process_webhook':
      await processWebhook(job.payload)
      break
    case 'sync_calendar':
      await processSyncCalendar(job.payload)
      break
    case 'generate_report':
      await processGenerateReport(job.payload)
      break
    case 'cleanup_old_data':
      await processCleanup(job.payload)
      break
    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}

async function processSendEmail(payload: { to: string; subject: string; html: string; text?: string; from?: string; replyTo?: string }): Promise<void> {
  // Import email service dynamically
  const { sendEmail } = await import('./email')
  await sendEmail({
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text
  })
}

async function processSendSMS(payload: { to: string; message: string; from?: string; businessId: string; userId?: string; type?: string }): Promise<void> {
  // Import Telnyx client and supabase
  const { TelnyxClient } = await import('./telnyx')
  const { supabaseAdmin } = await import('./supabase')
  const { logger } = await import('./monitoring')
  
  const telnyxClient = new TelnyxClient()
  
  try {
    // Send SMS via Telnyx
    const telnyxResponse = await telnyxClient.sendSMS(
      payload.to,
      payload.message,
      payload.from
    )
    
    const externalId = telnyxResponse?.data?.id || null
    
    // Save SMS to database
    await supabaseAdmin
      .from('sms_messages')
      .insert({
        business_id: payload.businessId,
        to_phone: payload.to,
        from_phone: payload.from || null,
        message: payload.message,
        direction: 'outbound',
        status: 'sent',
        type: payload.type || 'manual_sms',
        external_id: externalId,
        created_by: payload.userId || null
      })
    
    logger.info('SMS sent successfully via job queue', {
      to: payload.to,
      from: payload.from,
      businessId: payload.businessId,
      externalId
    })
  } catch (error) {
    // Save failed SMS to database
    await supabaseAdmin
      .from('sms_messages')
      .insert({
        business_id: payload.businessId,
        to_phone: payload.to,
        from_phone: payload.from || null,
        message: payload.message,
        direction: 'outbound',
        status: 'failed',
        type: payload.type || 'manual_sms',
        created_by: payload.userId || null
      })
    
    logger.error('SMS send failed in job queue', {
      error: error instanceof Error ? error.message : 'Unknown error',
      to: payload.to,
      businessId: payload.businessId
    })
    
    throw error // Re-throw to trigger job retry
  }
}

async function processWebhook(payload: { url: string; data: any }): Promise<void> {
  const response = await fetch(payload.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload.data)
  })

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
  }
}

async function processSyncCalendar(payload: { businessId: string }): Promise<void> {
  // Import calendar service dynamically
  const { syncCalendarEvents } = await import('./calendar')
  await syncCalendarEvents(payload.businessId)
}

async function processGenerateReport(payload: { businessId: string; reportType: string }): Promise<void> {
  // Report generation logic
  logger.info('Generating report', payload)
  // Implementation depends on report type
}

async function processCleanup(payload: { olderThanDays: number }): Promise<void> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - payload.olderThanDays)

  // Clean up old data
  await supabaseAdmin
    .from('calls')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .eq('status', 'completed')

  logger.info('Cleanup completed', { cutoffDate: cutoffDate.toISOString() })
}
