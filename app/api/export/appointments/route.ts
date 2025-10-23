import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Get appointments data
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .order('scheduled_date', { ascending: false })

    if (appointmentsError) {
      logger.error('Error fetching appointments for export', { error: appointmentsError.message, businessId })
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }

    // Convert to CSV format
    const csvHeaders = [
      'Customer Name',
      'Phone',
      'Email',
      'Service Type',
      'Scheduled Date',
      'Duration (minutes)',
      'Status',
      'Address',
      'Notes',
      'Estimated Value',
      'Created Date'
    ]

    const csvRows = appointments?.map(appointment => [
      appointment.customer_name || '',
      appointment.customer_phone || '',
      appointment.customer_email || '',
      appointment.service_type || '',
      new Date(appointment.scheduled_date).toLocaleString(),
      appointment.duration_minutes || '',
      appointment.status || '',
      appointment.address || '',
      appointment.notes || '',
      appointment.estimated_value || '',
      new Date(appointment.created_at).toLocaleDateString()
    ]) || []

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="appointments-${businessId}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    logger.error('Error exporting appointments', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to export appointments' 
    }, { status: 500 })
  }
}
