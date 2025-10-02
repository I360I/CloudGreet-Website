import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const pricingRuleSchema = z.object({
  service_type: z.enum(['hvac', 'roofing', 'painting']),
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().optional(),
  base_price: z.number().min(0, 'Base price must be positive'),
  unit_type: z.enum(['per_sqft', 'per_hour', 'per_unit', 'fixed']),
  unit_price: z.number().min(0, 'Unit price must be positive').optional(),
  min_price: z.number().min(0, 'Min price must be positive').optional(),
  max_price: z.number().min(0, 'Max price must be positive').optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'greater_than', 'less_than', 'contains']),
    value: z.string(),
    multiplier: z.number().optional()
  })).optional(),
  is_active: z.boolean().default(true)
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')
    const serviceType = searchParams.get('service_type')

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('pricing_rules')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)

    if (serviceType) {
      query = query.eq('service_type', serviceType)
    }

    const { data: rules, error } = await query.order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching pricing rules', { 
        error: error,  
        businessId, 
        serviceType 
      })
      return NextResponse.json({ error: 'Failed to fetch pricing rules' }, { status: 500 })
    }

    return NextResponse.json({ rules })

  } catch (error) {
    logger.error('Pricing rules API error', { 
      error: error instanceof Error ? error.message : 'Unknown error',  
      endpoint: 'pricing/rules',
      method: 'GET'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = pricingRuleSchema.parse(body)
    
    const businessId = body.business_id
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    const { data: rule, error } = await supabaseAdmin
      .from('pricing_rules')
      .insert({
        business_id: businessId,
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating pricing rule', { 
        error: error,  
        businessId, 
        ruleData: validatedData 
      })
      return NextResponse.json({ error: 'Failed to create pricing rule' }, { status: 500 })
    }

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'pricing_rule_created',
        details: {
          business_id: businessId,
          rule_id: rule.id,
          service_type: validatedData.service_type,
          rule_name: validatedData.name
        },
        business_id: businessId,
        created_at: new Date().toISOString()
      })

    logger.info('Pricing rule created successfully', {
      businessId,
      ruleId: rule.id,
      serviceType: validatedData.service_type
    })

    return NextResponse.json({ rule })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    logger.error('Pricing rules API error', { 
      error: error instanceof Error ? error.message : 'Unknown error',  
      endpoint: 'pricing/rules',
      method: 'POST'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 })
    }

    const validatedData = pricingRuleSchema.partial().parse(updateData)
    
    const { data: rule, error } = await supabaseAdmin
      .from('pricing_rules')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating pricing rule', { 
        error: error,  
        ruleId: id, 
        updateData: validatedData 
      })
      return NextResponse.json({ error: 'Failed to update pricing rule' }, { status: 500 })
    }

    logger.info('Pricing rule updated successfully', {
      ruleId: id,
      businessId: rule.business_id
    })

    return NextResponse.json({ rule })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    logger.error('Pricing rules API error', { 
      error: error instanceof Error ? error.message : 'Unknown error',  
      endpoint: 'pricing/rules',
      method: 'PUT'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('pricing_rules')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      logger.error('Error deleting pricing rule', { 
        error: error,  
        ruleId: id 
      })
      return NextResponse.json({ error: 'Failed to delete pricing rule' }, { status: 500 })
    }

    logger.info('Pricing rule deleted successfully', { ruleId: id })

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Pricing rules API error', { 
      error: error instanceof Error ? error.message : 'Unknown error',  
      endpoint: 'pricing/rules',
      method: 'DELETE'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
