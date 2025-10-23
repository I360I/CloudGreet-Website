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

    // Get leads data
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (leadsError) {
      logger.error('Error fetching leads for export', { error: leadsError.message, businessId })
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    // Convert to CSV format
    const csvHeaders = [
      'Name',
      'Phone',
      'Email',
      'Company',
      'Source',
      'Status',
      'Lead Score',
      'Notes',
      'Created Date',
      'Last Contact'
    ]

    const csvRows = leads?.map(lead => [
      lead.name || '',
      lead.phone || '',
      lead.email || '',
      lead.company || '',
      lead.source || '',
      lead.status || '',
      lead.lead_score || '',
      lead.notes || '',
      new Date(lead.created_at).toLocaleDateString(),
      lead.last_contact ? new Date(lead.last_contact).toLocaleDateString() : ''
    ]) || []

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-${businessId}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    logger.error('Error exporting leads', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to export leads' 
    }, { status: 500 })
  }
}
