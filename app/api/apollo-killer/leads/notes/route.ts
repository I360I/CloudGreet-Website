import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * APOLLO KILLER: Lead Notes Management
 * 
 * Add, update, and retrieve notes for leads
 * Track who made what changes when
 */

// GET: Fetch notes for a lead
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json({
        error: 'leadId is required'
      }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('lead_notes')
      .select(`
        id,
        note,
        note_type,
        created_at,
        created_by,
        updated_at,
        admin_users!inner(name, email)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch lead notes', { error: error.message, leadId })
      return NextResponse.json({
        error: 'Failed to fetch notes'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      notes: data || []
    })

  } catch (error) {
    logger.error('Lead notes API error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to fetch notes'
    }, { status: 500 })
  }
}

// POST: Add new note
export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { leadId, note, noteType = 'general' } = await request.json()

    if (!leadId || !note) {
      return NextResponse.json({
        error: 'leadId and note are required'
      }, { status: 400 })
    }

    // Verify lead exists
    const { data: lead } = await supabaseAdmin
      .from('enriched_leads')
      .select('id, business_name')
      .eq('id', leadId)
      .single()

    if (!lead) {
      return NextResponse.json({
        error: 'Lead not found'
      }, { status: 404 })
    }

    // Add note
    const { data: newNote, error } = await supabaseAdmin
      .from('lead_notes')
      .insert({
        lead_id: leadId,
        note: note.trim(),
        note_type: noteType,
        created_by: adminAuth.admin.userId
      })
      .select(`
        id,
        note,
        note_type,
        created_at,
        admin_users!inner(name, email)
      `)
      .single()

    if (error) {
      logger.error('Failed to create lead note', { error: error.message, leadId })
      return NextResponse.json({
        error: 'Failed to create note'
      }, { status: 500 })
    }

    logger.info('Lead note created', {
      leadId,
      business: lead.business_name,
      noteType,
      createdBy: adminAuth.admin.userId
    })

    return NextResponse.json({
      success: true,
      note: newNote
    })

  } catch (error) {
    logger.error('Lead note creation error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to create note'
    }, { status: 500 })
  }
}

// PUT: Update existing note
export async function PUT(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { noteId, note } = await request.json()

    if (!noteId || !note) {
      return NextResponse.json({
        error: 'noteId and note are required'
      }, { status: 400 })
    }

    // Update note (only by creator or admin)
    const { data: updatedNote, error } = await supabaseAdmin
      .from('lead_notes')
      .update({
        note: note.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('created_by', adminAuth.admin.userId) // Only creator can update
      .select(`
        id,
        note,
        note_type,
        created_at,
        updated_at,
        admin_users!inner(name, email)
      `)
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to update note or not authorized'
      }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      note: updatedNote
    })

  } catch (error) {
    logger.error('Lead note update error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to update note'
    }, { status: 500 })
  }
}

// DELETE: Remove note
export async function DELETE(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('noteId')

    if (!noteId) {
      return NextResponse.json({
        error: 'noteId is required'
      }, { status: 400 })
    }

    // Delete note (only by creator)
    const { error } = await supabaseAdmin
      .from('lead_notes')
      .delete()
      .eq('id', noteId)
      .eq('created_by', adminAuth.admin.userId)

    if (error) {
      return NextResponse.json({
        error: 'Failed to delete note or not authorized'
      }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted'
    })

  } catch (error) {
    logger.error('Lead note deletion error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to delete note'
    }, { status: 500 })
  }
}
