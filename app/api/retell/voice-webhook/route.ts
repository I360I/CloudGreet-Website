import { NextRequest, NextResponse } from 'next/server'
import type { RetellVoiceWebhookPayload } from '@/lib/types/webhook-payloads'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { telnyxClient } from '@/lib/telnyx'
import { createCalendarEvent } from '@/lib/calendar'
import { verifyRetellSignature } from '@/lib/webhook-verification'
import { CONFIG } from '@/lib/config'
import Stripe from 'stripe'
import { STRIPE_API_VERSION } from '@/lib/types/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RetellToolCall = {
  name: string
  arguments: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text()
    
    // Parse JSON to check event type first (allow ping without verification)
    let body: RetellVoiceWebhookPayload
    try {
      body = JSON.parse(rawBody) as RetellVoiceWebhookPayload
    } catch (parseError) {
      logger.error('Retell webhook JSON parse error', { error: parseError instanceof Error ? parseError.message : JSON.stringify(parseError) })
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 })
    }

    const eventType = (body.event || body.type || 'unknown') as string
    
    // Allow ping events without signature verification (Retell health checks)
    if (eventType === 'ping') {
      return NextResponse.json({ ok: true })
    }

    // Verify webhook signature (Retell) for all other events
    const signature = request.headers.get('x-retell-signature')
    
    // Skip verification in development, require in production
    if (process.env.NODE_ENV === 'production') {
      const isValid = verifyRetellSignature(rawBody, signature)
      if (!isValid) {
        logger.warn('Retell webhook signature verification failed', {
          hasSignature: !!signature,
          eventType
        })
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
    }

    // Now process the verified body
    const tool = (body.tool_call as RetellToolCall | undefined) || null
    const metadata = body.metadata as { tenant_id?: string } | undefined
    const tenantId: string | undefined = (body.tenant_id as string | undefined) || metadata?.tenant_id

    if (tool) {
      switch (tool.name) {
        case 'book_appointment': {
          const { name, phone, service, datetime, business_id } = tool.arguments || {}
          
          if (!business_id) {
            return NextResponse.json({ success: false, error: 'business_id required' }, { status: 400 })
          }

          // Get business info to check subscription and get Stripe customer ID
          const { data: business, error: businessError } = await supabaseAdmin
            .from('businesses')
            .select('id, stripe_customer_id, subscription_status, timezone')
            .eq('id', business_id)
            .single()

          if (businessError || !business) {
            logger.error('Business not found', { business_id, error: businessError?.message || JSON.stringify(businessError) })
            return NextResponse.json({ success: false, error: 'business_not_found' }, { status: 404 })
          }

          // Parse datetime and calculate end time (default 1 hour duration)
          const startTime = new Date(datetime)
          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // Add 1 hour

          // Create appointment in database using transaction function for atomicity
          const { data: appointmentId, error: appointmentError } = await supabaseAdmin.rpc('create_appointment_safe', {
            p_business_id: business_id,
            p_customer_name: name,
            p_customer_phone: phone,
            p_customer_email: null, // Email not available from voice call
            p_service_type: service,
            p_scheduled_date: datetime,
            p_start_time: startTime.toISOString(),
            p_end_time: endTime.toISOString(),
            p_duration: 60,
            p_notes: null,
            p_estimated_value: null
          })

          if (appointmentError || !appointmentId) {
            logger.error('book_appointment transaction failed', { 
              error: appointmentError?.message || 'No appointment ID returned',
              business_id,
              customer_name: name
            })
            return NextResponse.json({ success: false, error: 'db_error' }, { status: 500 })
          }

          const apptId = appointmentId

          // Sync to Google Calendar if calendar is connected (appointment already created above)
          if (business_id) {
            try {
              const { getCalendarConfig, getValidAccessToken, refreshGoogleToken } = await import('@/lib/calendar')
              const config = await getCalendarConfig(business_id)
              
              if (config?.calendar_connected) {
                // Get valid access token (refresh if expired)
                let accessToken = await getValidAccessToken(business_id)
                
                if (accessToken) {
                  // Retry logic for calendar API calls
                  let retries = 2
                  let calendarSuccess = false
                  
                  while (retries >= 0 && !calendarSuccess) {
                    try {
                      const googleEvent = {
                        summary: `${service} - ${name}`,
                        description: `Appointment for ${name} (${phone}). Service: ${service}`,
                        location: '',
                        start: {
                          dateTime: startTime.toISOString(),
                          timeZone: config.timezone || 'America/New_York'
                        },
                        end: {
                          dateTime: endTime.toISOString(),
                          timeZone: config.timezone || 'America/New_York'
                        },
                        reminders: {
                          useDefault: false,
                          overrides: [
                            { method: 'email', minutes: 24 * 60 },
                            { method: 'popup', minutes: 60 }
                          ]
                        }
                      }

                      const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${accessToken}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(googleEvent)
                      })

                      if (calendarResponse.ok) {
                        const googleEventData = await calendarResponse.json()
                        // Update appointment with Google Calendar event ID
                        await supabaseAdmin
                          .from('appointments')
                          .update({
                            google_calendar_event_id: googleEventData.id,
                            google_event_id: googleEventData.id,
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', apptId)
                        
                        logger.info('Google Calendar event created', { 
                          appointmentId: apptId, 
                          googleEventId: googleEventData.id 
                        })
                        
                        calendarSuccess = true
                      } else if (calendarResponse.status === 401 && retries > 0) {
                        // Token expired, try to refresh and retry
                        logger.warn('Google Calendar API returned 401, refreshing token and retrying', {
                          businessId: business_id,
                          appointmentId: apptId,
                          retries
                        })
                        
                        accessToken = await refreshGoogleToken(business_id)
                        if (!accessToken) {
                          logger.error('Failed to refresh token, cannot retry calendar sync', {
                            businessId: business_id,
                            appointmentId: apptId
                          })
                          break
                        }
                        
                        retries--
                      } else {
                        const errorText = await calendarResponse.text().catch(() => 'Unknown error')
                        logger.error('Failed to create Google Calendar event', {
                          status: calendarResponse.status,
                          statusText: calendarResponse.statusText,
                          error: errorText,
                          businessId: business_id,
                          appointmentId: apptId,
                          retries
                        })
                        
                        // Don't retry on non-auth errors
                        if (calendarResponse.status !== 401) {
                          break
                        }
                        
                        retries--
                      }
                    } catch (calendarError) {
                      logger.error('Google Calendar API error', {
                        error: calendarError instanceof Error ? calendarError.message : 'Unknown error',
                        businessId: business_id,
                        appointmentId: apptId,
                        retries
                      })
                      
                      // Only retry on network errors
                      if (retries > 0 && calendarError instanceof Error && (
                        calendarError.message.includes('network') ||
                        calendarError.message.includes('timeout') ||
                        calendarError.message.includes('ECONNREFUSED')
                      )) {
                        retries--
                        // Wait 1 second before retry
                        await new Promise(resolve => setTimeout(resolve, 1000))
                      } else {
                        break
                      }
                    }
                  }
                  
                  if (!calendarSuccess) {
                    logger.warn('Failed to sync appointment to Google Calendar after retries, appointment saved in database', {
                      appointmentId: apptId,
                      businessId: business_id
                    })
                  }
                } else {
                  logger.warn('No valid Google access token available, skipping calendar sync', {
                    businessId: business_id,
                    appointmentId: apptId
                  })
                }
              }
            } catch (calendarError) {
              // Log but don't fail - appointment is already in database
              logger.warn('Calendar sync failed', { 
                error: calendarError instanceof Error ? calendarError.message : 'Unknown error',
                appointmentId: apptId 
              })
            }
          }

          // Charge Stripe per-booking fee ($50)
          if (business.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
            try {
              const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
                apiVersion: STRIPE_API_VERSION
              })

              // Create invoice item for per-booking fee
              await stripe.invoiceItems.create({
                customer: business.stripe_customer_id,
                amount: CONFIG.BUSINESS.PER_BOOKING_FEE * 100, // Convert to cents
                currency: 'usd',
                description: `Appointment booking fee - ${service} on ${new Date(datetime).toLocaleDateString()}`,
                metadata: {
                  appointment_id: apptId,
                  business_id: business_id,
                  service_type: service,
                  booking_date: datetime
                }
              })

              // Create and finalize invoice immediately
              const invoice = await stripe.invoices.create({
                customer: business.stripe_customer_id,
                auto_advance: true, // Auto-finalize
                collection_method: 'charge_automatically'
              })

              await stripe.invoices.finalizeInvoice(invoice.id)
              await stripe.invoices.pay(invoice.id)

              logger.info('Per-booking fee charged', { 
                appointmentId: apptId, 
                invoiceId: invoice.id,
                amount: CONFIG.BUSINESS.PER_BOOKING_FEE * 100 
              })

              // Update appointment with invoice ID
              await supabaseAdmin
                .from('appointments')
                .update({ 
                  notes: `Booking fee charged: Invoice ${invoice.id}`,
                  updated_at: new Date().toISOString()
                })
                .eq('id', apptId)
            } catch (stripeError) {
              // Log but don't fail appointment creation
              logger.error('Stripe per-booking fee failed', { 
                error: stripeError instanceof Error ? stripeError.message : 'Unknown error',
                appointmentId: apptId,
                businessId: business_id
              })
            }
          }

          // Send SMS confirmation
          if (phone) {
            try {
              await telnyxClient.sendSMS(
                phone,
                `Your appointment is booked for ${new Date(datetime).toLocaleDateString()} at ${new Date(datetime).toLocaleTimeString()}. Service: ${service}. Reply STOP to opt out; HELP for help.`
              )
            } catch (e) {
              logger.warn('SMS confirmation failed', { error: (e as Error).message })
            }
          }

          return NextResponse.json({ success: true, appointment_id: apptId })
        }
        case 'send_booking_sms': {
          const { phone, appt_id } = tool.arguments || {}
          if (!phone || !appt_id) {
            return NextResponse.json({ success: false, error: 'missing_parameters' }, { status: 400 })
          }
          try {
            await telnyxClient.sendSMS(
              phone,
              `Confirmation for appointment ${appt_id}. Reply STOP to opt out; HELP for help.`
            )
            return NextResponse.json({ success: true })
          } catch (smsError) {
            logger.error('send_booking_sms failed', {
              error: smsError instanceof Error ? smsError.message : 'Unknown error',
              phone,
              appt_id
            })
            return NextResponse.json({ success: false, error: 'sms_send_failed' }, { status: 500 })
          }
        }
        case 'lookup_availability': {
          const { business_id, date, duration = 60 } = tool.arguments || {}
          
          if (!business_id) {
            return NextResponse.json({ success: false, error: 'business_id required' }, { status: 400 })
          }

          try {
            // Use real calendar availability logic
            const { getAvailableSlots } = await import('@/lib/calendar')
            
            // If date provided, get slots for that date; otherwise get next 7 days
            if (date) {
              const slots = await getAvailableSlots(business_id, date, duration)
              const fullSlots = slots.map(slot => `${date}T${slot}:00`)
              return NextResponse.json({ success: true, slots: fullSlots })
            } else {
              // Get next 7 days of available slots
              const allSlots: string[] = []
              const now = new Date()
              
              for (let i = 1; i <= 7; i++) {
                const day = new Date(now)
                day.setDate(now.getDate() + i)
                const dateStr = day.toISOString().slice(0, 10)
                
                const slots = await getAvailableSlots(business_id, dateStr, duration)
                const fullSlots = slots.map(slot => `${dateStr}T${slot}:00`)
                allSlots.push(...fullSlots)
              }
              
              return NextResponse.json({ success: true, slots: allSlots })
            }
          } catch (error) {
            logger.error('lookup_availability failed', { 
              error: error instanceof Error ? error.message : 'Unknown error',
              business_id 
            })
            // Fallback to simple slots if calendar lookup fails
            const now = new Date()
            const fallbackSlots = [1, 2, 3].map((d) => {
              const day = new Date(now)
              day.setDate(now.getDate() + d)
              const dayStr = day.toISOString().slice(0, 10)
              return [`${dayStr}T10:00:00Z`, `${dayStr}T14:00:00Z`]
            }).flat()
            return NextResponse.json({ success: true, slots: fallbackSlots })
          }
        }
        default:
          return NextResponse.json({ success: false, error: 'unknown_tool' }, { status: 400 })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Retell voice webhook error', { error: (error as Error).message })
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
