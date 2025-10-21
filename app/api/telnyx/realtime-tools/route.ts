import { NextRequest, NextResponse } from 'next/server'
interface ScheduleAppointmentArgs {
  service_type: string;
  preferred_date?: string;
  preferred_time?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  issue_description?: string;
}

interface GetQuoteArgs {
  service_type: string;
  property_size?: string;
  current_system_age?: string;
  specific_requirements?: string;
}

interface AppointmentData {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_type: string;
  preferred_date?: string;
  preferred_time?: string;
  issue_description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}
interface ScheduleAppointmentArgs {
  service_type: string;
  preferred_date?: string;
  preferred_time?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  issue_description?: string;
}

interface GetQuoteArgs {
  service_type: string;
  property_size?: string;
  current_system_age?: string;
  specific_requirements?: string;
}
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    // Set timeout for the entire function
    const timeoutId = setTimeout(() => {
      logger.error('Function timeout - returning default response');
    }, 8000); // 8 second timeout
  try {
    const body = await request.json()
    
    logger.info('Premium realtime tool called', { 
      tool_name: body.name,
      arguments: body.arguments
    })

    // Handle different tool calls
    switch (body.name) {
      case 'schedule_appointment':
        return await handleScheduleAppointment(body.arguments)
        
      case 'get_quote':
        return await handleGetQuote(body.arguments)
        
      default:
        logger.warn('Unknown premium tool called', { 
          tool_name: body.name 
        })
        return NextResponse.json({ 
          error: 'Unknown tool' 
        }, { status: 400 })
    }

  clearTimeout(timeoutId);
    } catch (error) {
    logger.error('Premium realtime tool error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({ 
      error: 'Failed to process premium tool' 
    }, { status: 500 })
  }
}

async function handleScheduleAppointment(args: { service_type: string; preferred_date?: string; preferred_time?: string; customer_name: string; customer_phone: string; customer_email?: string; issue_description?: string; }) {
  try {
    const {
      service_type,
      preferred_date,
      preferred_time,
      customer_name,
      customer_phone,
      customer_email,
      issue_description
    } = args

    logger.info('Scheduling premium appointment', { 
      service_type,
      customer_name,
      customer_phone
    })

    // Store appointment in database
    // Optimized database operation
    // Optimized single database operation
    const { data: appointment, error }: { data: AppointmentData | null; error: any } = await supabaseAdmin
      .from('appointments')
      .insert({
        business_id: '00000000-0000-0000-0000-000000000001',
        customer_name,
        customer_phone,
        customer_email,
        service_type,
        preferred_date,
        preferred_time,
        issue_description,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to schedule appointment', { error })
      return NextResponse.json({
        success: false,
        message: 'I apologize, but I\'m having trouble scheduling your appointment right now. Let me have someone call you back to confirm the details.'
      })
    }

    logger.info('Premium appointment scheduled successfully', { 
      appointment_id: appointment.id,
      customer_name,
      service_type
    })

    return NextResponse.json({
      success: true,
      message: `Perfect! I've scheduled your ${service_type} appointment for ${preferred_date} at ${preferred_time}. You'll receive a confirmation call shortly. Is there anything else I can help you with today?`,
      appointment_id: appointment.id
    })

  } catch (error) {
    logger.error('Schedule appointment error', { error })
    return NextResponse.json({
      success: false,
      message: 'I apologize, but I\'m having trouble scheduling your appointment right now. Let me have someone call you back to confirm the details.'
    })
  }
}

async function handleGetQuote(args: { service_type: string; property_size?: string; current_system_age?: string; specific_requirements?: string; }) {
  try {
    const {
      service_type,
      property_size,
      current_system_age,
      specific_requirements
    } = args

    logger.info('Getting premium quote', { 
      service_type,
      property_size,
      current_system_age
    })

    // Generate intelligent quote based on inputs
    let basePrice = 0
    let priceRange = ''
    
    switch (service_type.toLowerCase()) {
      case 'heating':
      case 'furnace':
        basePrice = 3000
        priceRange = '$2,500 - $8,000'
        break
      case 'cooling':
      case 'air conditioning':
      case 'ac':
        basePrice = 4000
        priceRange = '$3,000 - $12,000'
        break
      case 'maintenance':
      case 'tune-up':
        basePrice = 150
        priceRange = '$100 - $300'
        break
      case 'emergency':
        basePrice = 200
        priceRange = '$150 - $500'
        break
      default:
        basePrice = 2500
        priceRange = '$2,000 - $6,000'
    }

    // Adjust based on property size
    if (property_size && parseInt(property_size) > 3000) {
      basePrice = Math.round(basePrice * 1.3)
    }

    // Adjust based on system age
    if (current_system_age && parseInt(current_system_age) > 15) {
      basePrice = Math.round(basePrice * 1.2)
    }

    logger.info('Premium quote generated', { 
      service_type,
      base_price: basePrice,
      price_range: priceRange
    })

    return NextResponse.json({
      success: true,
      message: `Based on your ${service_type} needs, I can give you a rough estimate of ${priceRange}. For a more accurate quote, I'd recommend scheduling a consultation with one of our certified technicians. They'll assess your specific situation and provide you with a detailed estimate. Would you like me to schedule that consultation for you?`,
      estimated_price: basePrice,
      price_range: priceRange
    })

  } catch (error) {
    logger.error('Get quote error', { error })
    return NextResponse.json({
      success: false,
      message: 'I apologize, but I\'m having trouble generating a quote right now. Let me have one of our specialists call you back with a detailed estimate.'
    })
  }
}
