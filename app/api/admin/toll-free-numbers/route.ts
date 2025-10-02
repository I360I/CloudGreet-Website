import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { logger } from '../../../../lib/monitoring'

export const dynamic = 'force-dynamic'

// GET - List all toll-free numbers
export async function GET(request: NextRequest) {
  try {
    const { data: numbers, error } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch toll-free numbers', { 
        error: error.message 
      })
      return NextResponse.json({ error: 'Failed to fetch numbers' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: numbers
    })

  } catch (error) {
    logger.error('Toll-free numbers API error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}

// POST - Add new toll-free numbers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { numbers } = body

    if (!numbers || !Array.isArray(numbers)) {
      return NextResponse.json({ 
        error: 'Numbers array is required' 
      }, { status: 400 })
    }

    const numberRecords = numbers.map(number => ({
      number: number,
      status: 'available',
      assigned_to: null,
      business_name: null,
      assigned_at: null,
      created_at: new Date().toISOString()
    }))

    const { data, error } = await supabaseAdmin
      .from('toll_free_numbers')
      .insert(numberRecords)
      .select()

    if (error) {
      logger.error('Failed to add toll-free numbers', { 
        error: error.message 
      })
      return NextResponse.json({ error: 'Failed to add numbers' }, { status: 500 })
    }

    logger.info('Toll-free numbers added', { 
      count: numbers.length 
    })

    return NextResponse.json({
      success: true,
      message: `${numbers.length} toll-free numbers added successfully`,
      data: data
    })

  } catch (error) {
    logger.error('Add toll-free numbers API error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}

// PUT - Update toll-free number status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, assigned_to, business_name } = body

    if (!id) {
      return NextResponse.json({ 
        error: 'Number ID is required' 
      }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (status) updateData.status = status
    if (assigned_to) updateData.assigned_to = assigned_to
    if (business_name) updateData.business_name = business_name
    if (assigned_to) updateData.assigned_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('toll_free_numbers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update toll-free number', { 
        error: error.message,
        id 
      })
      return NextResponse.json({ error: 'Failed to update number' }, { status: 500 })
    }

    logger.info('Toll-free number updated', { 
      id,
      status,
      assigned_to 
    })

    return NextResponse.json({
      success: true,
      message: 'Toll-free number updated successfully',
      data: data
    })

  } catch (error) {
    logger.error('Update toll-free number API error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
