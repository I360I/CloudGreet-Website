import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require admin authentication
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }
    
    const { action, clientIds, data } = await request.json()

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Client IDs array is required'
      }, { status: 400 })
    }

    let results = []
    let successCount = 0

    switch (action) {
      case 'send_bulk_sms':
        for (const clientId of clientIds) {
          try {
            const result = await sendBulkSMS(clientId, data.message)
            results.push({ clientId, success: true, result })
            successCount++
          } catch (error) {
            results.push({ clientId, success: false, error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error' })
          }
        }
        break

      case 'update_subscription':
        for (const clientId of clientIds) {
          try {
            const result = await updateSubscription(clientId, data.newStatus)
            results.push({ clientId, success: true, result })
            successCount++
          } catch (error) {
            results.push({ clientId, success: false, error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error' })
          }
        }
        break

      case 'export_data':
        try {
          const exportData = await exportClientData(clientIds)
          return NextResponse.json({
            success: true,
            message: 'Data exported successfully',
            data: exportData
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: 'Data export failed',
            error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
          }, { status: 500 })
        }

      case 'schedule_maintenance':
        for (const clientId of clientIds) {
          try {
            const result = await scheduleMaintenance(clientId, data.maintenanceDate)
            results.push({ clientId, success: true, result })
            successCount++
          } catch (error) {
            results.push({ clientId, success: false, error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error' })
          }
        }
        break

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid bulk action'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Bulk action completed: ${successCount}/${clientIds.length} successful`,
      results,
      summary: {
        total: clientIds.length,
        successful: successCount,
        failed: clientIds.length - successCount
      }
    })

  } catch (error) {
    logger.error('Bulk action error', { error })
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to perform bulk action',
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    }, { status: 500 })
  }
}

// REAL helper functions with actual implementations
async function sendBulkSMS(clientId: string, message: string) {
  try {
    // Get client phone number
    const { data: client, error: clientError } = await supabaseAdmin
      .from('businesses')
      .select('phone_number, business_name')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      throw new Error('Client not found')
    }

    const clientData = client as { phone_number: string; business_name: string }

    // Check if Telnyx is configured
    if (!process.env.TELNYX_API_KEY || !process.env.TELNYX_PHONE_NUMBER) {
      throw new Error('SMS service not configured')
    }

    // Send SMS via Telnyx
    const smsResponse = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.TELNYX_PHONE_NUMBER,
        to: clientData.phone_number,
        text: message,
        messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID
      })
    })

    if (!smsResponse.ok) {
      const errorData = await smsResponse.text()
      throw new Error(`Telnyx error: ${errorData}`)
    }

    const result = await smsResponse.json()

    // Log SMS in database
    await supabaseAdmin
      .from('sms_messages')
      .insert({
        business_id: clientId,
        from_number: process.env.TELNYX_PHONE_NUMBER || '',
        to_number: clientData.phone_number,
        message: message,
        direction: 'outbound',
        status: 'sent',
        created_at: new Date().toISOString()
      } as any)

    return { 
      messageId: result.data.id, 
      status: 'sent',
      recipient: clientData.phone_number,
      businessName: clientData.business_name
    }
  } catch (error) {
    logger.error('Bulk SMS send failed', { error, clientId })
    throw error
  }
}

async function updateSubscription(clientId: string, newStatus: string) {
  try {
    // Get client's Stripe customer ID
    const { data: client, error: clientError } = await supabaseAdmin
      .from('businesses')
      .select('stripe_customer_id, business_name')
      .eq('id', clientId)
      .single()

    const clientData = client as { stripe_customer_id?: string; business_name: string } | null
    if (clientError || !clientData || !clientData.stripe_customer_id) {
      throw new Error('Client or Stripe customer not found')
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe not configured')
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    })

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: clientData.stripe_customer_id,
      status: 'active',
      limit: 1
    })

    if (subscriptions.data.length === 0) {
      throw new Error('No active subscription found')
    }

    const subscription = subscriptions.data[0]

    // Update subscription based on newStatus
    let updatedSubscription
    if (newStatus === 'canceled') {
      updatedSubscription = await stripe.subscriptions.cancel(subscription.id)
    } else if (newStatus === 'paused') {
      updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        pause_collection: { behavior: 'mark_uncollectible' }
      })
    } else if (newStatus === 'active') {
      updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        pause_collection: null
      })
    } else {
      throw new Error('Invalid subscription status')
    }

    // Update in database
    await (supabaseAdmin as any)
      .from('businesses')
      .update({
        subscription_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)

    return { 
      subscriptionId: subscription.id,
      subscriptionStatus: newStatus, 
      updatedAt: new Date().toISOString(),
      businessName: clientData.business_name
    }
  } catch (error) {
    logger.error('Subscription update failed', { error, clientId, newStatus })
    throw error
  }
}

async function exportClientData(clientIds: string[]) {
  try {
    // Fetch all client data
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .in('id', clientIds)

    if (clientsError) {
      throw new Error('Failed to fetch client data')
    }

    const clientsArray = Array.isArray(clients) ? clients : []

    // Fetch related data for each client
    const exportData = await Promise.all(
      clientsArray.map(async (client: any) => {
        const [calls, appointments, sms] = await Promise.all([
          supabaseAdmin.from('calls').select('*').eq('business_id', client.id),
          supabaseAdmin.from('appointments').select('*').eq('business_id', client.id),
          supabaseAdmin.from('sms_messages').select('*').eq('business_id', client.id)
        ])

        return {
          business: client,
          calls: calls.data || [],
          appointments: appointments.data || [],
          sms: sms.data || [],
          exportedAt: new Date().toISOString()
        }
      })
    )

    // Store export record
    const { data: exportRecord, error: exportError } = await (supabaseAdmin as any)
      .from('data_exports')
      .insert({
        client_ids: clientIds,
        export_data: exportData,
        export_type: 'bulk_client_export',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single()

    return {
      exportId: exportRecord?.id || `export_${Date.now()}`,
      clientCount: clientIds.length,
      totalCalls: exportData.reduce((sum, c) => sum + c.calls.length, 0),
      totalAppointments: exportData.reduce((sum, c) => sum + c.appointments.length, 0),
      totalSMS: exportData.reduce((sum, c) => sum + c.sms.length, 0),
      data: exportData,
      downloadUrl: `/api/admin/download/${exportRecord?.id}`,
      expiresAt: exportRecord?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  } catch (error) {
    logger.error('Client data export failed', { error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error', clientIds: clientIds.join(', ') })
    throw error
  }
}

async function scheduleMaintenance(clientId: string, maintenanceDate: string) {
  try {
    // Get client info
    const { data: client, error: clientError } = await supabaseAdmin
      .from('businesses')
      .select('business_name, phone_number, email')
      .eq('id', clientId)
      .single()

    const clientData = client as { phone_number?: string; business_name: string; email?: string } | null
    if (clientError || !clientData) {
      throw new Error('Client not found')
    }

    // Create maintenance record
    const { data: maintenance, error: maintenanceError } = await supabaseAdmin
      .from('scheduled_maintenance')
      .insert({
        business_id: clientId,
        scheduled_date: maintenanceDate,
        status: 'scheduled',
        maintenance_type: 'routine',
        notes: 'Scheduled via bulk action',
        created_at: new Date().toISOString()
      } as any)
      .select()
      .single()

    if (maintenanceError || !maintenance) {
      throw new Error(`Database error: ${maintenanceError?.message || 'Failed to create maintenance record'}`)
    }

    // Send notification SMS
    if (process.env.TELNYX_API_KEY && clientData.phone_number) {
      try {
        await fetch('https://api.telnyx.com/v2/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.TELNYX_PHONE_NUMBER,
            to: clientData.phone_number,
            text: `Hi ${clientData.business_name}, your CloudGreet system maintenance is scheduled for ${new Date(maintenanceDate).toLocaleDateString()}. No action needed. Reply STOP to opt out.`,
            type: 'SMS'
          })
        })
      } catch (smsError) {
        logger.warn('Failed to send maintenance notification SMS', { error: smsError, clientId })
      }
    }

    return { 
      maintenanceId: (maintenance as any).id, 
      scheduledDate: maintenanceDate,
      businessName: clientData.business_name,
      notificationSent: !!process.env.TELNYX_API_KEY
    }
  } catch (error) {
    logger.error('Maintenance scheduling failed', { error, clientId, maintenanceDate })
    throw error
  }
}
