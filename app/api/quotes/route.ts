import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')
    const customerPhone = searchParams.get('customer_phone')
    const status = searchParams.get('status')

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (customerPhone) {
      query = query.eq('customer_phone', customerPhone)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: quotes, error } = await query

    if (error) {
      logger.error('Error fetching quotes', error, { businessId, customerPhone, status })
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }

    return NextResponse.json({ quotes })

  } catch (error) {
    logger.error('Quotes API error', error as Error, { 
      endpoint: 'quotes',
      method: 'GET'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, notes } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.status = status
    }

    if (notes) {
      updateData.notes = notes
    }

    const { data: quote, error } = await supabaseAdmin
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating quote', error, { quoteId: id, updateData })
      return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
    }

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'quote_updated',
        details: {
          business_id: quote.business_id,
          quote_id: quote.id,
          status: status,
          customer_phone: quote.customer_phone
        },
        business_id: quote.business_id,
        created_at: new Date().toISOString()
      })

    logger.info('Quote updated successfully', {
      quoteId: id,
      businessId: quote.business_id,
      status: status
    })

    return NextResponse.json({ quote })

  } catch (error) {
    logger.error('Quotes API error', error as Error, { 
      endpoint: 'quotes',
      method: 'PUT'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
